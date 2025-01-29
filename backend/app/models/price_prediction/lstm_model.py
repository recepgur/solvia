import os
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import scipy.stats
from typing import List, Tuple, Dict, Optional, Any, Union
from sklearn.metrics import mean_squared_error, mean_absolute_error
import logging
from torch.distributions import Normal

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class MultiHeadAttention(nn.Module):
    def __init__(self, hidden_dim: int, num_heads: int = 8, dropout: float = 0.1):
        super().__init__()
        assert hidden_dim % num_heads == 0
        
        self.hidden_dim = hidden_dim
        self.num_heads = num_heads
        self.head_dim = hidden_dim // num_heads
        self.scale = self.head_dim ** -0.5
        
        self.q_proj = nn.Linear(hidden_dim, hidden_dim)
        self.k_proj = nn.Linear(hidden_dim, hidden_dim)
        self.v_proj = nn.Linear(hidden_dim, hidden_dim)
        self.out_proj = nn.Linear(hidden_dim, hidden_dim)
        
        # Enhanced attention with gating mechanism
        self.gate = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.Sigmoid()
        )
        
        # Relative positional embeddings
        self.max_positions = 512
        self.pos_emb = nn.Parameter(torch.randn(2 * self.max_positions - 1, self.head_dim))
        
        self.dropout = nn.Dropout(dropout)
        
    def forward(self, x: torch.Tensor, mask: Optional[torch.Tensor] = None, temperature: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
        batch_size, seq_len, _ = x.shape
        
        q = self.q_proj(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        k = self.k_proj(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        v = self.v_proj(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        
        # Add relative positional embeddings
        positions = torch.arange(seq_len, device=x.device).unsqueeze(0) - torch.arange(seq_len, device=x.device).unsqueeze(1)
        positions = positions + self.max_positions - 1
        rel_pos_emb = self.pos_emb[positions]
        
        # Calculate attention scores with relative positions
        scores = torch.matmul(q, k.transpose(-2, -1)) * self.scale
        scores = scores + torch.matmul(q, rel_pos_emb.transpose(-2, -1))
        
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float('-inf'))
        
        # Apply temperature scaling if provided
        if temperature is not None:
            scores = scores / temperature
        
        attn = F.softmax(scores, dim=-1)
        attn = self.dropout(attn)
        
        out = torch.matmul(attn, v)
        out = out.transpose(1, 2).contiguous().view(batch_size, seq_len, self.hidden_dim)
        
        # Apply gating mechanism
        gate_values = self.gate(x)
        out = out * gate_values
        
        return self.out_proj(out), attn

class LSTMPredictor(nn.Module):
    def __init__(self, input_dim: int = 15, hidden_dim: int = 768, num_layers: int = 8, dropout: float = 0.5):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.dropout_rate = dropout
        
        # Turkish market-specific regime detection thresholds
        self.volatility_thresholds = nn.Parameter(torch.tensor([0.2, 0.4]))  # Learnable volatility thresholds
        self.trend_thresholds = nn.Parameter(torch.tensor([0.02, 0.05]))    # Learnable trend thresholds
        self.momentum_thresholds = nn.Parameter(torch.tensor([0.03, 0.07])) # Learnable momentum thresholds
        
        # Learnable temperature parameter for attention
        self.temperature = nn.Parameter(torch.ones(1))
        
        self.feature_layer = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout)
        )
        self.residual_proj = nn.Linear(input_dim, hidden_dim)
        self.scale_factor = nn.Parameter(torch.ones(1))
        
        # LSTM layers with residual connections
        self.lstm = nn.LSTM(
            input_size=hidden_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            dropout=dropout,
            batch_first=True,
            bidirectional=True
        )
        
        # Multi-head attention mechanism
        self.attention = MultiHeadAttention(hidden_dim * 2, num_heads=8, dropout=dropout)  # *2 for bidirectional
        
        # Enhanced regime classifier with Turkish market adaptations
        self.regime_feature_extractor = nn.Sequential(
            nn.Linear(hidden_dim * 4, hidden_dim * 2),
            nn.LayerNorm(hidden_dim * 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim // 2)
        )
        
        # Market regime-specific prediction heads
        self.regime_heads = nn.ModuleDict({
            'high_vol': nn.Linear(hidden_dim // 2, 3),
            'normal_vol': nn.Linear(hidden_dim // 2, 3),
            'low_vol': nn.Linear(hidden_dim // 2, 3)
        })
        
        # Separate heads for volatility and trend classification
        self.volatility_classifier = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.LayerNorm(hidden_dim // 2),
            nn.GELU(),
            nn.Linear(hidden_dim // 2, 3)  # Low, Medium, High volatility
        )
        
        self.trend_classifier = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.LayerNorm(hidden_dim // 2),
            nn.GELU(),
            nn.Linear(hidden_dim // 2, 3)  # Down, Sideways, Up trend
        )
        
        # Enhanced return predictor with regime awareness and uncertainty estimation
        self.return_predictor = nn.Sequential(
            nn.Linear(hidden_dim * 4 + hidden_dim + 6, hidden_dim * 2),
            nn.LayerNorm(hidden_dim * 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.LayerNorm(hidden_dim // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, 3)  # Mean, variance, and skewness prediction
        )
        
        # Adaptive learning rate module
        self.lr_predictor = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x: torch.Tensor, return_attention: bool = False) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor, Optional[torch.Tensor]]:
        residual = self.residual_proj(x)
        features = self.feature_layer(x)
        features = features * self.scale_factor + residual
        
        # Enhanced uncertainty estimation with multiple dropout passes
        if self.training:
            num_passes = 5
            dropout_features = []
            for _ in range(num_passes):
                dropout_mask = torch.bernoulli(torch.ones_like(features) * (1 - self.dropout_rate))
                scaled_features = features * dropout_mask / (1 - self.dropout_rate)
                dropout_features.append(scaled_features)
            features = torch.stack(dropout_features).mean(dim=0)
            epistemic_uncertainty = torch.stack(dropout_features).std(dim=0)
        else:
            epistemic_uncertainty = torch.zeros_like(features)
        
        # Dynamic temperature scaling for attention
        temperature = F.softplus(self.temperature)
        
        lstm_out, (hidden, cell) = self.lstm(features)
        
        # Enhanced multi-head attention with temperature scaling and causal masking
        seq_len = lstm_out.size(1)
        attention_mask = torch.triu(torch.ones(seq_len, seq_len), diagonal=1).bool()
        attention_mask = attention_mask.unsqueeze(0).expand(lstm_out.size(0), -1, -1)
        
        # Scale attention scores by learned temperature
        context, attention_weights = self.attention(lstm_out, mask=~attention_mask.to(lstm_out.device), temperature=temperature)
        
        # Apply residual connection and layer normalization
        context = F.layer_norm(context + lstm_out, normalized_shape=[context.size(-1)])
        
        # Enhanced temporal feature extraction with attention weights
        last_hidden = hidden[-2:].transpose(0, 1).contiguous().view(-1, self.hidden_dim * 2)
        combined = torch.cat([context, last_hidden], dim=-1)
        
        # Enhanced regime classification with attention-weighted features
        regime_features = self.regime_feature_extractor(combined)
        volatility_logits = self.volatility_classifier(regime_features)
        trend_logits = self.trend_classifier(regime_features)
        
        volatility_probs = F.softmax(volatility_logits, dim=-1)
        trend_probs = F.softmax(trend_logits, dim=-1)
        
        # Combine regime information with attention context
        regime_info = torch.cat([regime_features, volatility_probs, trend_probs], dim=-1)
        prediction_features = torch.cat([combined, regime_info], dim=-1)
        
        # Enhanced prediction with combined uncertainty estimation
        raw_predictions = self.return_predictor(prediction_features)
        mean, aleatoric_var, skew = raw_predictions.chunk(3, dim=-1)
        
        # Combine epistemic and aleatoric uncertainty
        aleatoric_uncertainty = F.softplus(aleatoric_var) + 1e-6
        total_uncertainty = aleatoric_uncertainty + torch.mean(epistemic_uncertainty, dim=-1, keepdim=True)
        
        # Regime-specific prediction adjustments
        regime_probs = F.softmax(regime_features, dim=-1)
        regime_means = torch.stack([
            head(regime_features) for head in self.regime_heads.values()
        ], dim=-1)
        
        # Weighted ensemble prediction based on regime probabilities
        ensemble_mean = torch.sum(regime_means * regime_probs.unsqueeze(-1), dim=-1)
        mean = 0.7 * mean + 0.3 * ensemble_mean  # Blend predictions
        
        # Adjust uncertainty based on regime confidence
        regime_confidence = torch.max(regime_probs, dim=-1)[0].unsqueeze(-1)
        uncertainty_scaling = 1.0 + (1.0 - regime_confidence) * 0.5
        total_uncertainty = total_uncertainty * uncertainty_scaling
        
        # Skewness estimation with regime consideration
        skewness = torch.tanh(skew)  # Bound skewness
        skewness = skewness * regime_confidence  # Scale skewness by regime confidence
        
        # Adaptive learning rate based on prediction uncertainty
        if self.training:
            lr_confidence = self.lr_predictor(combined).squeeze(-1)
            uncertainty = torch.sqrt(variance).mean()
            adaptive_lr = lr_confidence * torch.exp(-uncertainty)
            
            # Regime-aware dropout
            regime_confidence = (torch.max(volatility_probs, dim=-1)[0] + torch.max(trend_probs, dim=-1)[0]) / 2
            dropout_rate = 0.85 + 0.1 * regime_confidence
            mask = torch.bernoulli(dropout_rate.unsqueeze(-1))
            mean = mean * mask / dropout_rate.unsqueeze(-1)
        
        predictions = torch.cat([mean, variance, skewness], dim=-1)
        
        if return_attention:
            return predictions, volatility_logits, trend_logits, regime_features, attention_weights
        return predictions, volatility_logits, trend_logits, regime_features, None

class PricePredictionModel:
    def __init__(self, sequence_length: int = 10, model_path: str | None = None):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = LSTMPredictor().to(self.device)
        self.sequence_length = sequence_length
        self.scaler = None
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
            
    def save_model(self, path: str) -> None:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        state = {
            'model_state': self.model.state_dict(),
            'scaler': self.scaler
        }
        torch.save(state, path)
        
    def load_model(self, path: str) -> None:
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found: {path}")
        state = torch.load(path, map_location=self.device)
        self.model.load_state_dict(state['model_state'])
        self.scaler = state['scaler']
    
    def prepare_sequence(self, prices: List[float], market_context: Optional[Dict[str, Any]] = None) -> Tuple[np.ndarray, np.ndarray]:
        prices_array = np.array(prices, dtype=np.float32)
        
        # Enhanced returns and momentum calculation with Turkish market adaptations
        returns = np.diff(prices_array) / prices_array[:-1]
        log_returns = np.log(prices_array[1:] / prices_array[:-1])
        
        # Initialize market context features
        usd_try_returns = None
        sector_momentum = None
        sector_dispersion = None
        volume_price_trend = None
        liquidity_score = None
        
        # Process market context if available
        if market_context:
            if 'usd_try_rates' in market_context:
                usd_try_rates = np.array(market_context['usd_try_rates'])
                usd_try_returns = np.diff(usd_try_rates) / usd_try_rates[:-1]
            
            if 'sector_data' in market_context:
                sector_returns = {sector: np.diff(np.array(prices)) / np.array(prices)[:-1]
                                for sector, prices in market_context['sector_data'].items()}
                sector_momentum = np.mean([returns[-20:] for returns in sector_returns.values()], axis=0)
                sector_mean_returns = np.mean(list(sector_returns.values()), axis=0)
                sector_dispersion = np.std([returns - sector_mean_returns for returns in sector_returns.values()], axis=0)
            
            if 'volume_data' in market_context:
                volume_data = np.array(market_context['volume_data'])
                price_changes = np.diff(prices_array)
                volume_changes = np.diff(volume_data)
                volume_price_trend = np.convolve(
                    np.sign(price_changes) * volume_changes,
                    np.exp(-np.arange(10)/2) / sum(np.exp(-np.arange(10)/2)),
                    mode='valid'
                )
                avg_volume = np.mean(volume_data)
                volume_volatility = np.std(volume_data) / avg_volume
                price_impact = abs(price_changes / (volume_changes + 1e-8))
                liquidity_score = 1 / (1 + np.exp(-(avg_volume/1e6) + 2*volume_volatility + price_impact))
        
        # Dynamic momentum calculation with adaptive windows for Turkish market volatility
        momentum_dict = {}
        base_windows = [5, 10, 20, 60]
        
        # Calculate market volatility for window adaptation
        volatility = np.std(returns[-20:]) * np.sqrt(252)
        volatility_percentile = np.percentile(
            [np.std(returns[i:i+20]) * np.sqrt(252) for i in range(len(returns)-20)],
            75
        )
        
        # Adjust windows based on market conditions
        if volatility > volatility_percentile * 1.2:  # High volatility regime
            momentum_windows = [w - int(w * 0.3) for w in base_windows]  # Shorter windows
        elif volatility < volatility_percentile * 0.8:  # Low volatility regime
            momentum_windows = [w + int(w * 0.3) for w in base_windows]  # Longer windows
        else:
            momentum_windows = base_windows
        
        # Adjust windows based on volatility regime
        volatility = np.std(returns[-20:]) * np.sqrt(252)
        if volatility > 0.4:  # High volatility regime
            momentum_windows = [3, 7, 15, 45]
        elif volatility < 0.2:  # Low volatility regime
            momentum_windows = [7, 15, 30, 90]
        
        # Enhanced momentum calculation with volatility-adjusted weights
        for window in momentum_windows:
            if len(prices_array) >= window:
                # Calculate momentum with exponential weighting
                weights = np.exp(np.linspace(-1, 0, window))
                weights /= weights.sum()
                
                momentum = np.zeros_like(prices_array)
                for i in range(window, len(prices_array)):
                    window_returns = returns[i-window:i]
                    momentum[i] = np.sum(window_returns * weights)
                
                # Volatility normalization
                rolling_vol = np.array([
                    np.std(returns[max(0, i-window):i]) * np.sqrt(252)
                    for i in range(window, len(returns)+1)
                ])
                momentum[window:] /= (rolling_vol + 1e-8)
                
                momentum_dict[f'momentum_{window}'] = momentum
            else:
                momentum_dict[f'momentum_{window}'] = np.zeros_like(prices_array)
        
        # Exponential momentum weighting
        momentum_weights = np.exp(-np.arange(len(momentum_windows)) * 0.5)
        momentum_weights = momentum_weights / momentum_weights.sum()
        
        # Combined momentum signal
        momentum_composite = np.zeros_like(prices_array)
        for (_, momentum), weight in zip(momentum_dict.items(), momentum_weights):
            momentum_composite += momentum * weight
        
        # Enhanced volatility calculation with Turkish market adaptations
        volatility_windows = [10, 20, 60]
        volatilities = {}
        
        for window in volatility_windows:
            if len(returns) >= window:
                # Calculate volatility with exponential weighting
                weights = np.exp(np.linspace(-1, 0, window))
                weights /= weights.sum()
                
                # Rolling volatility calculation
                rolling_vol = np.array([
                    np.sqrt(np.sum(weights * returns[max(0, i-window):i]**2)) * np.sqrt(252)
                    for i in range(window, len(returns)+1)
                ])
                
                # Volatility regime detection
                vol_percentiles = np.percentile(rolling_vol, [25, 75])
                regime_labels = np.zeros_like(rolling_vol)
                regime_labels[rolling_vol > vol_percentiles[1]] = 2  # High volatility
                regime_labels[(rolling_vol <= vol_percentiles[1]) & (rolling_vol > vol_percentiles[0])] = 1  # Medium
                
                volatilities[f'vol_{window}d'] = rolling_vol
                volatilities[f'vol_{window}d_regime'] = regime_labels
                
                # Volatility acceleration
                vol_change = np.diff(rolling_vol, prepend=rolling_vol[0])
                volatilities[f'vol_{window}d_acceleration'] = vol_change / (rolling_vol + 1e-8)
        
        # Enhanced multi-timeframe trend analysis with Turkish market adaptations
        trend_windows = [5, 10, 20, 60]
        trends = {}
        
        for window in trend_windows:
            if len(prices_array) >= 2*window:
                # Calculate trend strength with exponential weighting
                weights = np.exp(np.linspace(-1, 0, window))
                weights /= weights.sum()
                
                # Rolling trend calculation
                rolling_trend = np.array([
                    np.sum(weights * returns[i-window:i])
                    for i in range(window, len(returns)+1)
                ])
                
                # Trend regime detection
                trend_percentiles = np.percentile(np.abs(rolling_trend), [25, 75])
                regime_labels = np.ones_like(rolling_trend)  # Default to sideways
                regime_labels[rolling_trend > trend_percentiles[1]] = 2  # Strong uptrend
                regime_labels[rolling_trend < -trend_percentiles[1]] = 0  # Strong downtrend
                
                trends[f'trend_{window}d'] = rolling_trend
                trends[f'trend_{window}d_regime'] = regime_labels
                
                # Trend acceleration and momentum
                trend_change = np.diff(rolling_trend, prepend=rolling_trend[0])
                trends[f'trend_{window}d_acceleration'] = trend_change
                trends[f'trend_{window}d_momentum'] = rolling_trend * np.sign(trend_change)
        
        # Moving averages and trends
        sma_5 = np.convolve(prices_array, np.ones(5)/5, mode='valid')
        sma_20 = np.convolve(prices_array, np.ones(20)/20, mode='valid')
        ema_12 = np.convolve(prices_array, np.exp(np.linspace(0, 1, 12))/np.sum(np.exp(np.linspace(0, 1, 12))), mode='valid')
        ema_26 = np.convolve(prices_array, np.exp(np.linspace(0, 1, 26))/np.sum(np.exp(np.linspace(0, 1, 26))), mode='valid')
        
        # Enhanced RSI calculation with adaptive parameters
        base_rsi_period = 14
        current_volatility = volatility[-1] if len(volatility) > 0 else volatility_percentile
        
        # Adjust RSI period based on volatility regime
        if current_volatility > volatility_percentile * 1.2:
            rsi_period = max(7, int(base_rsi_period * 0.7))
        elif current_volatility < volatility_percentile * 0.8:
            rsi_period = min(21, int(base_rsi_period * 1.3))
        else:
            rsi_period = base_rsi_period
            
        # Calculate trend strength using exponential weighted returns
        weights = np.exp(np.linspace(-1, 0, 20))
        weights /= weights.sum()
        trend_strength = np.sum(returns[-20:] * weights) if len(returns) >= 20 else 0.0
            
        diff = np.diff(prices_array)
        gains = np.where(diff > 0, diff, 0)
        losses = np.where(diff < 0, -diff, 0)
        
        # Exponential weighting for RSI calculation
        weights = np.exp(np.linspace(-1, 0, rsi_period))
        weights /= weights.sum()
        
        # Rolling RSI calculation with exponential weights
        rsi_values = np.zeros(len(diff))
        for i in range(rsi_period, len(diff) + 1):
            window_gains = gains[i-rsi_period:i]
            window_losses = losses[i-rsi_period:i]
            avg_gain = np.sum(window_gains * weights)
            avg_loss = np.sum(window_losses * weights)
            rs = avg_gain / (avg_loss + 1e-6)
            rsi_values[i-1] = 100 - (100 / (1 + rs))
            
        # RSI divergence detection
        rsi_trend = np.zeros_like(rsi_values)
        price_trend = np.zeros_like(prices_array[1:])
        
        for i in range(rsi_period + 5, len(rsi_values)):
            rsi_trend[i] = 1 if rsi_values[i] > rsi_values[i-5] else (-1 if rsi_values[i] < rsi_values[i-5] else 0)
            price_trend[i] = 1 if prices_array[i+1] > prices_array[i-4] else (-1 if prices_array[i+1] < prices_array[i-4] else 0)
            
        # Detect RSI divergence
        bullish_divergence = (price_trend < 0) & (rsi_trend > 0) & (rsi_values < 30)
        bearish_divergence = (price_trend > 0) & (rsi_trend < 0) & (rsi_values > 70)
        
        rsi = {
            'values': rsi_values,
            'period': rsi_period,
            'bullish_divergence': bullish_divergence,
            'bearish_divergence': bearish_divergence
        }
        
        # Volatility features
        returns_std = np.array([np.std(returns[i:i+20]) for i in range(len(returns)-19)])
        volatility = returns_std * np.sqrt(252)  # Annualized volatility
        
        # MACD calculation
        macd = ema_12[14:] - ema_26[14:]  # Start from 14 to align with RSI
        macd_signal = np.convolve(macd, np.exp(np.linspace(0, 1, 9))/np.sum(np.exp(np.linspace(0, 1, 9))), mode='valid')
        macd_hist = macd[8:] - macd_signal  # Histogram shows momentum
        
        # Enhanced Bollinger Bands with adaptive parameters for Turkish market
        base_bb_period = 20
        
        # Adjust BB parameters based on market regime
        if current_volatility > volatility_percentile * 1.2:  # High volatility
            bb_period = max(10, int(base_bb_period * 0.7))  # Shorter period
            bb_std = 2.5  # Wider bands
        elif current_volatility < volatility_percentile * 0.8:  # Low volatility
            bb_period = min(30, int(base_bb_period * 1.3))  # Longer period
            bb_std = 1.8  # Narrower bands
        else:
            bb_period = base_bb_period
            bb_std = 2.0
            
        # Exponential weighting for BB calculation
        weights = np.exp(np.linspace(-1, 0, bb_period))
        weights /= weights.sum()
        
        # Rolling BB calculation with exponential weights
        ma = np.zeros(len(prices_array))
        std = np.zeros(len(prices_array))
        upper_band = np.zeros(len(prices_array))
        lower_band = np.zeros(len(prices_array))
        bb_position = np.zeros(len(prices_array))
        
        for i in range(bb_period, len(prices_array)):
            window = prices_array[i-bb_period:i]
            ma[i] = np.sum(window * weights)
            std[i] = np.sqrt(np.sum(weights * (window - ma[i])**2))
            upper_band[i] = ma[i] + bb_std * std[i]
            lower_band[i] = ma[i] - bb_std * std[i]
            bb_position[i] = (prices_array[i] - lower_band[i]) / (upper_band[i] - lower_band[i] + 1e-8)
            
        # BB breakout detection
        breakout_threshold = 0.05  # 5% threshold for breakout confirmation
        bb_width = (upper_band - lower_band) / ma
        bb_width_percentile = np.percentile(bb_width[bb_period:], 75)
        
        # Detect potential breakouts
        upper_breakout = (prices_array > upper_band) & (bb_width > bb_width_percentile)
        lower_breakout = (prices_array < lower_band) & (bb_width > bb_width_percentile)
        
        # Calculate BB squeeze
        bb_squeeze = bb_width < np.percentile(bb_width[bb_period:], 25)
        
        bollinger_bands = {
            'ma': ma[bb_period:],
            'upper_band': upper_band[bb_period:],
            'lower_band': lower_band[bb_period:],
            'bb_position': bb_position[bb_period:],
            'bb_width': bb_width[bb_period:],
            'upper_breakout': upper_breakout[bb_period:],
            'lower_breakout': lower_breakout[bb_period:],
            'squeeze': bb_squeeze[bb_period:]
        }
        
        # Align all features to same length
        min_length = min(
            len(returns)-19,
            len(macd_hist),
            len(bb_width),
            len(volatility),
            len(momentum_dict['momentum_5'])-20,
            len(momentum_dict['momentum_20'])-20
        )
        start_idx = max(26, rsi_period) - 1  # Largest lookback period
        
        # Enhanced feature set for Turkish market characteristics
        features = np.column_stack([
            # Core price features with volatility-adjusted returns
            returns[start_idx:start_idx+min_length] / (volatility[:min_length] + 1e-8),
            log_returns[start_idx:start_idx+min_length] / (volatility[:min_length] + 1e-8),
            
            # Multi-timeframe momentum with regime-specific scaling
            momentum_dict['momentum_5'][start_idx:start_idx+min_length] * (1 + volatility[:min_length]),
            momentum_dict['momentum_10'][start_idx:start_idx+min_length] * (1 + volatility[:min_length]),
            momentum_dict['momentum_20'][start_idx:start_idx+min_length] * (1 + volatility[:min_length]),
            momentum_dict['momentum_60'][start_idx:start_idx+min_length] * (1 + volatility[:min_length]),
            
            # Enhanced moving averages with adaptive crossovers
            (sma_5[start_idx:start_idx+min_length] - sma_20[start_idx:start_idx+min_length]) / (sma_20[start_idx:start_idx+min_length] * volatility[:min_length] + 1e-8),
            (ema_12[start_idx:start_idx+min_length] - ema_26[start_idx:start_idx+min_length]) / (ema_26[start_idx:start_idx+min_length] * volatility[:min_length] + 1e-8),
            
            # Advanced momentum indicators with volatility scaling
            macd_hist[:min_length] / (volatility[:min_length] + 1e-8),
            macd[:min_length] / (prices_array[start_idx:start_idx+min_length] * volatility[:min_length] + 1e-8),
            macd_signal[:min_length] / (prices_array[start_idx:start_idx+min_length] * volatility[:min_length] + 1e-8),
            
            # Enhanced Bollinger Bands features
            bollinger_bands['bb_position'][start_idx:start_idx+min_length],
            bollinger_bands['bb_width'][start_idx:start_idx+min_length],
            bollinger_bands['upper_breakout'][start_idx:start_idx+min_length].astype(float),
            bollinger_bands['lower_breakout'][start_idx:start_idx+min_length].astype(float),
            bollinger_bands['squeeze'][start_idx:start_idx+min_length].astype(float),
            
            # Advanced oscillators and momentum
            rsi['values'][start_idx:start_idx+min_length] / 100,
            rsi['bullish_divergence'][start_idx:start_idx+min_length].astype(float),
            rsi['bearish_divergence'][start_idx:start_idx+min_length].astype(float),
            momentum_composite[start_idx:start_idx+min_length],
            
            # Regime-specific indicators
            volatility[:min_length] / volatility_percentile,
            np.abs(trend_strength) * np.sign(momentum_composite[start_idx:start_idx+min_length]),
            
            # Momentum-volatility interaction features
            np.abs(returns[start_idx:start_idx+min_length]) * np.sign(momentum_composite[start_idx:start_idx+min_length]) / (volatility[:min_length] + 1e-8),
            momentum_composite[start_idx:start_idx+min_length] * bb_position[start_idx:start_idx+min_length],
            
            # Market regime probabilities
            (volatility[:min_length] > volatility_percentile * 1.2).astype(float),
            (volatility[:min_length] < volatility_percentile * 0.8).astype(float),
            (np.abs(trend_strength) > 0.03).astype(float),
            (np.abs(momentum_composite[start_idx:start_idx+min_length]) > np.percentile(np.abs(momentum_composite), 75)).astype(float),
            bollinger_bands['squeeze'][start_idx:start_idx+min_length].astype(float),
            
            # Enhanced Turkish market-specific features
            np.abs(momentum_composite[start_idx:start_idx+min_length]) * (1 + volatility[:min_length]),  # Volatility-adjusted momentum
            (prices_array[start_idx:start_idx+min_length] / sma_20[start_idx:start_idx+min_length] - 1) * (1 + volatility[:min_length]),  # Price deviation
            
            # Currency impact features
            np.zeros(min_length) if usd_try_returns is None else np.abs(usd_try_returns[:min_length]),
            
            # Sector rotation features
            np.zeros(min_length) if sector_momentum is None else sector_momentum[:min_length],
            np.zeros(min_length) if sector_dispersion is None else sector_dispersion[:min_length],
            
            # Market microstructure
            np.zeros(min_length) if volume_price_trend is None else volume_price_trend[:min_length],
            np.zeros(min_length) if liquidity_score is None else liquidity_score[:min_length]
        ])
        
        sequences = []
        targets = []
        
        for i in range(len(features) - self.sequence_length):
            seq = features[i:i + self.sequence_length]
            target = (prices_array[i + self.sequence_length + start_idx] / 
                     prices_array[i + self.sequence_length + start_idx - 1] - 1)  # Predict returns
            sequences.append(seq)
            targets.append(target)
        
        sequences = torch.FloatTensor(sequences).to(self.device)
        targets = torch.FloatTensor(targets).reshape(-1, 1).to(self.device)
        return sequences, targets
    
    def predict(self, prices: List[float], market_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        try:
            self.model.eval()
            with torch.no_grad():
                if len(prices) < self.sequence_length + 26:
                    raise ValueError(f"Need at least {self.sequence_length + 26} price points")
                    
                # Convert prices to numpy array for calculations
                prices_array = np.array(prices, dtype=np.float32)
                sequences, _ = self.prepare_sequence(prices)
                
                # Enhanced Monte Carlo dropout predictions with regime-specific sampling
                predictions = []
                volatilities = []
                trends = []
                regime_preds = []
                
                n_samples = 50
                for _ in range(n_samples):
                    self.model.train()  # Enable dropout
                    pred, vol_logits, trend_logits, regime_features, _ = self.model(sequences[-1:], return_attention=True)
                    
                    # Extract predictions and uncertainties
                    pred_mean = pred[0, 0].item()
                    pred_var = F.softplus(pred[0, 1]).item()
                    pred_skew = torch.tanh(pred[0, 2]).item()
                    
                    # Sample from skew-normal distribution
                    sample = scipy.stats.skewnorm.rvs(
                        a=pred_skew,
                        loc=pred_mean,
                        scale=np.sqrt(pred_var)
                    )
                    
                    predictions.append(sample)
                    
                    # Get regime predictions
                    vol_probs = F.softmax(vol_logits, dim=-1)[0]
                    trend_probs = F.softmax(trend_logits, dim=-1)[0]
                    
                    volatilities.append(vol_probs.cpu().numpy())
                    trends.append(trend_probs.cpu().numpy())
                    regime_preds.append(regime_features[0].cpu().numpy())
                
                # Calculate robust prediction statistics
                predictions = np.array(predictions)
                volatilities = np.array(volatilities)
                trends = np.array(trends)
                regime_preds = np.array(regime_preds)
                
                # Remove outliers using IQR method
                q1, q3 = np.percentile(predictions, [25, 75])
                iqr = q3 - q1
                mask = (predictions >= q1 - 1.5 * iqr) & (predictions <= q3 + 1.5 * iqr)
                
                filtered_preds = predictions[mask]
                filtered_vols = volatilities[mask]
                filtered_trends = trends[mask]
                
                # Calculate regime-weighted prediction
                pred_mean = np.mean(filtered_preds)
                pred_std = np.std(filtered_preds)
                pred_skew = scipy.stats.skew(filtered_preds)
                
                # Regime probabilities
                vol_regime = np.mean(filtered_vols, axis=0)
                trend_regime = np.mean(filtered_trends, axis=0)
                
                # Uncertainty estimation
                epistemic_uncertainty = pred_std  # Model uncertainty
                aleatory_uncertainty = np.mean(np.sqrt(filtered_vols[:, 2]))  # Data uncertainty
                
                # Combine uncertainties based on regime
                if vol_regime[2] > 0.5:  # High volatility regime
                    total_uncertainty = np.sqrt(epistemic_uncertainty**2 + (2 * aleatory_uncertainty)**2)
                else:
                    total_uncertainty = np.sqrt(epistemic_uncertainty**2 + aleatory_uncertainty**2)
                
                self.model.eval()
                
                # Calculate robust prediction statistics
                pred_mean = float(np.mean(predictions))
                pred_std = float(np.std(predictions))
                pred_skew = float(np.mean([(p - pred_mean)**3 for p in predictions]) / (pred_std**3 if pred_std > 0 else 1))
                
                # Market regime detection
                returns = np.diff(prices_array) / prices_array[:-1]
                volatility = float(np.std(returns[-20:]) * np.sqrt(252))
                trend = float(prices_array[-20:].mean() / prices_array[-40:-20].mean() - 1)
                
                # Technical signals
                last_features = sequences[-1][-1].cpu().numpy()
                rsi = float(last_features[8] * 100)
                bb_position = float(last_features[6])
                macd_hist = float(last_features[5])
                momentum_5d = float(last_features[1])
                momentum_20d = float(last_features[2])
                
                # Enhanced signal agreement with weighted indicators
                signal_weights = {
                    'prediction': 0.25,
                    'momentum_short': 0.15,
                    'momentum_long': 0.15,
                    'rsi': 0.15,
                    'bb': 0.15,
                    'macd': 0.15
                }
                
                signals = {
                    'prediction': 1 if pred_mean > 0 else -1,
                    'momentum_short': 1 if momentum_5d > 0 else -1,
                    'momentum_long': 1 if momentum_20d > 0 else -1,
                    'rsi': 1 if rsi > 50 else -1,
                    'bb': 1 if bb_position > 0.5 else -1,
                    'macd': 1 if macd_hist > 0 else -1
                }
                
                weighted_sum = sum(signals[k] * signal_weights[k] for k in signals)
                signal_agreement = float(abs(weighted_sum))
                
                # Enhanced confidence calculation with regime-specific adjustments
                # Base confidence from signal agreement
                base_confidence = 0.4 + (signal_agreement * 0.4)
                
                # Regime-specific confidence adjustments
                regime_confidence = {
                    'volatility': 1.0 - (vol_regime[2] * 0.3),  # Lower confidence in high volatility
                    'trend': 1.0 + (trend_regime[0] * 0.2 + trend_regime[2] * 0.2),  # Higher in clear trends
                    'momentum': 1.0 + (abs(momentum_5d) * 0.3)  # Higher with strong momentum
                }
                
                # Uncertainty-based adjustment
                uncertainty_factor = np.exp(-2 * total_uncertainty)
                
                # Technical confirmation bonus
                tech_confirmation = 1.0
                if (rsi > 70 and pred_mean < 0) or (rsi < 30 and pred_mean > 0):
                    tech_confirmation *= 0.8  # Reduce confidence on RSI divergence
                if (bb_position > 0.8 and pred_mean > 0) or (bb_position < 0.2 and pred_mean < 0):
                    tech_confirmation *= 0.8  # Reduce confidence on BB extremes
                
                # Final confidence calculation
                confidence = (
                    base_confidence *
                    regime_confidence['volatility'] *
                    regime_confidence['trend'] *
                    regime_confidence['momentum'] *
                    uncertainty_factor *
                    tech_confirmation
                )
                
                # Bound confidence between 0.1 and 0.9
                confidence = max(0.1, min(0.9, confidence))
                
                # Calculate volatility impact based on current market conditions
                vol_impact = float(vol_regime[2])  # High volatility regime probability
                volatility_factor = 0.5 + (0.5 * vol_impact)
                
                # Enhanced trend consideration
                trend_alignment = np.sign(weighted_sum) == np.sign(trend)
                trend_magnitude = min(1.0, abs(trend) * 2)
                trend_factor = 1.0 + (0.2 * trend_magnitude * (1.0 if trend_alignment else -0.5))
                
                confidence = float(max(0.1, min(0.9, base_confidence * volatility_factor * trend_factor)))
                
                # Calculate predicted price
                predicted_return = float(pred_mean)
                max_return = 0.05 * (1 + volatility)  # Dynamic return cap based on volatility
                predicted_return = max(min(predicted_return, max_return), -max_return)
                predicted_price = float(prices_array[-1] * (1 + predicted_return))
                
                return {
                    'price': predicted_price,
                    'confidence': confidence,
                    'volatility': volatility,
                    'trend': trend,
                    'signal_agreement': signal_agreement,
                    'prediction_std': pred_std,
                    'prediction_skew': pred_skew,
                    'technical_signals': {
                        'rsi': rsi,
                        'momentum_5d': momentum_5d,
                        'momentum_20d': momentum_20d,
                        'macd_hist': macd_hist,
                        'bb_position': bb_position
                    }
                }
                
        except Exception as e:
            logger.error(f"Error in price prediction: {str(e)}")
            raise RuntimeError(f"Failed to predict price: {str(e)}")
                
            # Enhanced market regime detection
            prices_array = np.array(prices)
            returns = np.diff(prices_array) / prices_array[:-1]
            
            # Multi-timeframe volatility analysis
            volatility_windows = [10, 20, 60]
            volatilities = {
                f"vol_{window}d": np.std(returns[-window:]) * np.sqrt(252)
                for window in volatility_windows
            }
            
            # Advanced trend analysis
            trend_windows = [5, 10, 20, 60]
            trends = {
                f"trend_{window}d": prices_array[-window:].mean() / prices_array[-2*window:-window].mean() - 1
                for window in trend_windows
            }
            
            # Momentum and mean reversion signals
            momentum_signals = {
                f"momentum_{window}d": prices_array[-1] / prices_array[-window] - 1
                for window in [5, 10, 20]
            }
            
            # Price distribution analysis
            returns_percentiles = {
                'ret_95': np.percentile(returns[-60:], 95),
                'ret_5': np.percentile(returns[-60:], 5)
            }
            
            # Market regime classification
            regime_indicators = {
                'high_volatility': volatilities['vol_20d'] > np.percentile(list(volatilities.values()), 75),
                'strong_trend': all(abs(t) > 0.02 for t in trends.values()),
                'momentum': all(np.sign(m) == np.sign(trends['trend_20d']) for m in momentum_signals.values()),
                'mean_reversion': abs(prices_array[-1] / prices_array[-20:].mean() - 1) > 0.02
            }
            
            # Prepare sequences for prediction
            sequences, _ = self.prepare_sequence(prices)
            
            # Monte Carlo dropout predictions
            predictions = []
            uncertainties = []
            
            for _ in range(50):  # Increased MC samples
                self.model.train()  # Enable dropout
                pred = self.model(sequences[-1:])
                predictions.append(float(pred.item()))
                
                # Calculate prediction-specific uncertainty
                feature_importance = torch.abs(self.model.fc[0].weight).mean(dim=0)
                uncertainty = 1.0 - torch.sigmoid(feature_importance.sum()).item()
                uncertainties.append(uncertainty)
            
            self.model.eval()
            
            # Calculate robust prediction statistics
            pred_mean = float(np.mean(predictions))
            pred_std = float(np.std(predictions))
            pred_skew = float(np.mean([(p - pred_mean)**3 for p in predictions]) / (pred_std**3 if pred_std > 0 else 1))
            
            # Determine market regime
            current_regime = None
            regime_confidence = 0.0
            
            if regime_indicators['high_volatility']:
                if regime_indicators['strong_trend']:
                    current_regime = 'volatile_trending'
                    regime_confidence = 0.8
                else:
                    current_regime = 'volatile_ranging'
                    regime_confidence = 0.7
            elif regime_indicators['strong_trend']:
                if regime_indicators['momentum']:
                    current_regime = 'strong_trend'
                    regime_confidence = 0.9
                else:
                    current_regime = 'weak_trend'
                    regime_confidence = 0.6
            elif regime_indicators['mean_reversion']:
                current_regime = 'mean_reverting'
                regime_confidence = 0.75
            else:
                current_regime = 'ranging'
                regime_confidence = 0.65
                
            # Adjust prediction based on regime
            regime_adjustments = {
                'volatile_trending': 1.2,
                'volatile_ranging': 0.7,
                'strong_trend': 1.1,
                'weak_trend': 0.9,
                'mean_reverting': 0.8,
                'ranging': 0.85
            }
            
            adjusted_pred = pred_mean * regime_adjustments.get(current_regime, 1.0)
            
            # Calculate confidence score
            base_confidence = 1.0 - (pred_std / (abs(pred_mean) + 1e-6))
            regime_factor = regime_confidence
            uncertainty_factor = 1.0 - np.mean(uncertainties)
            
            final_confidence = float(
                0.4 * base_confidence +
                0.3 * regime_factor +
                0.3 * uncertainty_factor
            )
            final_confidence = max(0.1, min(0.9, final_confidence))
            
            # Calculate predicted price
            predicted_return = float(adjusted_pred)
            predicted_price = float(prices_array[-1] * (1 + predicted_return))
            
            return {
                'price': predicted_price,
                'confidence': final_confidence,
                'regime': current_regime,
                'regime_confidence': regime_confidence,
                'prediction_std': pred_std,
                'prediction_skew': pred_skew,
                'volatility': volatilities,
                'trends': trends,
                'momentum': momentum_signals
            }
            
            # Advanced market regime detection with adaptive thresholds
            volatility_windows = [20, 60, 120]  # Multiple timeframes
            current_volatilities = {
                f'vol_{window}d': np.std(returns[-min(window, len(returns)):]) * np.sqrt(252)
                for window in volatility_windows
            }
            
            # Exponential volatility weighting (more weight to recent periods)
            vol_weights = np.exp(-np.arange(len(volatility_windows)) * 0.5)
            vol_weights = vol_weights / vol_weights.sum()
            
            # Composite volatility measure
            current_volatility = sum(
                current_volatilities[f'vol_{window}d'] * weight 
                for window, weight in zip(volatility_windows, vol_weights)
            )
            
            # Dynamic volatility thresholds
            historical_volatility = [
                np.std(returns[i:i+60])*np.sqrt(252) 
                for i in range(max(0, len(returns)-120), len(returns)-60)
            ]
            volatility_percentile = np.percentile(historical_volatility, 75)
            
            # Enhanced trend analysis with momentum
            trend_weights = [0.5, 0.3, 0.2]  # Weights for different timeframes
            trend_windows = [20, 60, 120]
            
            trends = {}
            for window, weight in zip(trend_windows, trend_weights):
                if len(prices_array) >= 2 * window:
                    trends[f'trend_{window}d'] = (
                        prices_array[-window:].mean() / prices_array[-2*window:-window].mean() - 1
                    ) * weight
                    
            # Composite trend strength with momentum consideration
            trend_strength = sum(trends.values()) if trends else 0
            
            # Advanced regime classification with multi-factor analysis
            regime_factors = {
                'volatility_state': {
                    'high': current_volatility > volatility_percentile * 1.2,
                    'normal': volatility_percentile * 0.8 <= current_volatility <= volatility_percentile * 1.2,
                    'low': current_volatility < volatility_percentile * 0.8
                },
                'trend_state': {
                    'strong': abs(trend_strength) > 0.03,
                    'weak': 0.01 < abs(trend_strength) <= 0.03,
                    'flat': abs(trend_strength) <= 0.01
                },
                'momentum_alignment': all(
                    np.sign(trends[f'trend_{w}d']) == np.sign(trend_strength) 
                    for w in trend_windows 
                    if f'trend_{w}d' in trends
                )
            }
            
            # Determine primary and secondary regime characteristics
            regime = {
                'volatile_trending': regime_factors['volatility_state']['high'] and regime_factors['trend_state']['strong'],
                'volatile_ranging': regime_factors['volatility_state']['high'] and regime_factors['trend_state']['flat'],
                'strong_trend': regime_factors['trend_state']['strong'] and regime_factors['momentum_alignment'],
                'weak_trend': regime_factors['trend_state']['weak'] or not regime_factors['momentum_alignment'],
                'mean_reverting': regime_factors['volatility_state']['normal'] and regime_factors['trend_state']['flat'],
                'ranging': regime_factors['volatility_state']['low'] and regime_factors['trend_state']['flat']
            }
            
            # Advanced Monte Carlo predictions with regime-aware dropout
            predictions = []
            confidences = []
            feature_importances = []
            
            n_samples = 50  # Increased samples for better distribution estimation
            
            for _ in range(n_samples):
                self.model.train()  # Enable dropout
                pred = self.model(torch.FloatTensor(sequences[-1:]).to(self.device))
                predictions.append(float(pred.item()))
                
                # Enhanced feature importance calculation
                feature_weights = torch.abs(self.model.fc[0].weight)
                feature_imp = feature_weights.mean(dim=0)
                feature_importances.append(feature_imp.detach().cpu().numpy())
                
                # Adaptive confidence based on feature stability
                confidence_base = torch.sigmoid(feature_imp.sum()).item()
                regime_factor = 1.0
                
                # Adjust confidence based on regime
                if any(regime.values()):  # If any regime is detected
                    if regime['volatile_trending']:
                        regime_factor = 0.7  # Reduce confidence in volatile trending markets
                    elif regime['strong_trend']:
                        regime_factor = 1.2  # Boost confidence in strong trends
                    elif regime['mean_reverting']:
                        regime_factor = 0.9  # Slightly reduce confidence in mean reversion
                    elif regime['ranging']:
                        regime_factor = 0.8  # Reduce confidence in ranging markets
                
                confidences.append(confidence_base * regime_factor)
                
            self.model.eval()
            
            # Enhanced prediction statistics with skew and kurtosis
            predictions_array = np.array(predictions)
            pred_mean = float(np.mean(predictions_array))
            pred_std = float(np.std(predictions_array))
            pred_skew = float(scipy.stats.skew(predictions_array) if len(predictions_array) > 2 else 0)
            pred_kurtosis = float(scipy.stats.kurtosis(predictions_array) if len(predictions_array) > 2 else 0)
            
            # Feature importance stability
            feature_imp_std = np.std(feature_importances, axis=0)
            feature_stability = 1.0 / (1.0 + np.mean(feature_imp_std))
            
            # Advanced prediction confidence calculation with multi-factor analysis
            # Base confidence from prediction distribution
            base_confidence = 1.0 - (pred_std / (abs(pred_mean) + 1e-6))
            
            # Distribution characteristics impact
            if abs(pred_skew) > 1.5 or abs(pred_kurtosis) > 5:
                base_confidence *= 0.85  # Reduce confidence for non-normal distributions
            
            # Feature stability impact
            stability_factor = 0.8 + (0.4 * feature_stability)  # 0.8 to 1.2 range
            
            # Market regime adjustments
            regime_factor = 1.0
            if regime['volatile_trending']:
                regime_factor = 0.7
                if abs(trend_strength) > 0.05:  # Strong trend in volatile market
                    regime_factor = 0.8
            elif regime['strong_trend']:
                pred_trend = np.sign(pred_mean)
                market_trend = np.sign(trend_strength)
                trend_alignment = pred_trend == market_trend
                regime_factor = 1.2 if trend_alignment else 0.7
            elif regime['mean_reverting']:
                mean_price = prices_array[-20:].mean()
                price_deviation = (prices_array[-1] / mean_price - 1)
                mean_reversion_signal = abs(price_deviation) > 0.02 and np.sign(pred_mean) != np.sign(price_deviation)
                regime_factor = 1.1 if mean_reversion_signal else 0.85
            elif regime['ranging']:
                regime_factor = 0.8
            
            # Technical signal confirmation
            sequences_np = sequences[-1].cpu().numpy()
            rsi = sequences_np[-1, 8] * 100
            bb_position = sequences_np[-1, 6]
            macd_hist = sequences_np[-1, 5]
            
            signal_confirmation = 1.0
            if (rsi > 70 and pred_mean < 0) or (rsi < 30 and pred_mean > 0):
                signal_confirmation *= 1.15
            if (bb_position > 0.8 and pred_mean < 0) or (bb_position < 0.2 and pred_mean > 0):
                signal_confirmation *= 1.1
            if np.sign(macd_hist) == np.sign(pred_mean):
                signal_confirmation *= 1.1
                
            # Combine all confidence factors
            final_confidence = (
                base_confidence * 
                stability_factor * 
                regime_factor * 
                signal_confirmation
            )
            
            # Apply confidence bounds
            confidence = float(max(0.1, min(0.9, final_confidence)))
            
            # Enhanced dynamic return bounds for Turkish market conditions
            base_max_return = 0.05
            volatility_scalar = current_volatility / volatility_percentile
            
            # Calculate momentum composite
            momentum_composite = np.mean([
                momentum_signals[f'momentum_{w}d'] 
                for w in [5, 10, 20] 
                if f'momentum_{w}d' in momentum_signals
            ])
            
            # Calculate returns skewness
            returns_skew = scipy.stats.skew(returns[-60:])
            
            # Adjust base return expectations based on market regime
            if regime['volatile_trending']:
                base_max_return = 0.08
                volatility_scalar *= 1.2
            elif regime['strong_trend'] and trend_alignment > 0:
                base_max_return = 0.06
                volatility_scalar *= 1.1
            elif regime['mean_reverting']:
                base_max_return = 0.04
                volatility_scalar *= 0.9
            elif regime['ranging']:
                base_max_return = 0.03
                volatility_scalar *= 0.8
                
            max_return = base_max_return * volatility_scalar
            
            if abs(momentum_composite) > 0.1:
                max_return *= 1.2
            if abs(returns_skew) > 2:
                max_return *= 0.8
            
            # Ensure reasonable bounds
            max_return = float(max(0.02, min(0.1, max_return)))
            predicted_return = float(max(min(pred_mean, max_return), -max_return))
            predicted_price = float(prices_array[-1] * (1 + predicted_return))
            
            # Calculate momentum indicators
            momentum_5d = float(sequences[-1][-1, 1])
            momentum_20d = float(sequences[-1][-1, 2])
            momentum_60d = float(sequences[-1][-1, 3])
            
            # Calculate volume metrics
            volume_data = np.random.uniform(0.8, 1.2, size=20)  # Synthetic volume data
            volume_ma = float(volume_data.mean())
            price_changes = np.diff(prices_array[-20:])
            volume_changes = np.diff(volume_data)
            price_volume_correlation = float(np.corrcoef(price_changes, volume_changes)[0, 1])
            
            # Calculate trend momentum alignment
            trend_momentum_alignment = (
                np.sign(trend_strength) == 
                np.sign(momentum_5d) == 
                np.sign(momentum_20d)
            )
            
            return {
                'price': predicted_price,
                'confidence': confidence,
                'regime': {
                    'type': next(k for k, v in regime.items() if v),
                    'volatility': float(current_volatility),
                    'trend_strength': float(trend_strength),
                    'momentum_alignment': bool(trend_momentum_alignment)
                },
                'prediction_metrics': {
                    'std': float(pred_std),
                    'skew': float(pred_skew),
                    'kurtosis': float(pred_kurtosis),
                    'feature_stability': float(feature_stability)
                },
                'technical_signals': {
                    'rsi': float(rsi),
                    'bb_position': float(bb_position),
                    'macd_hist': float(macd_hist),
                    'momentum': {
                        'short': float(momentum_5d),
                        'mid': float(momentum_20d),
                        'long': float(momentum_60d)
                    },
                    'volume': {
                        'correlation': float(price_volume_correlation),
                        'ma': float(volume_ma)
                    }
                },
                'signal_analysis': {
                    'agreement': float(signal_agreement),
                    'weights': signal_weights,
                    'signals': signals
                }
            }
            
            # Enhanced technical analysis for Turkish market
            last_features = sequences[-1][-1].cpu().numpy()
            
            # Core indicators
            rsi = float(last_features[8] * 100)
            bb_position = float(last_features[6])
            macd_hist = float(last_features[5])
            momentum_5d = float(last_features[1])
            momentum_20d = float(last_features[2])
            momentum_60d = float(last_features[3])
            
            # Volume-weighted indicators (using synthetic volume)
            volume_ma = np.random.uniform(0.8, 1.2, size=20).mean()
            price_volume_correlation = 0.6 if momentum_5d * volume_ma > 0 else -0.3
            
            # Dynamic signal weights based on market regime
            base_weights = {
                'prediction': 0.25,
                'momentum_short': 0.15,
                'momentum_mid': 0.10,
                'momentum_long': 0.10,
                'rsi': 0.15,
                'bb': 0.10,
                'macd': 0.10,
                'volume': 0.05
            }
            
            # Adjust weights based on volatility regime
            if current_volatility > volatility_percentile * 1.2:
                base_weights['rsi'] *= 1.2
                base_weights['bb'] *= 1.2
                base_weights['momentum_short'] *= 0.8
            elif current_volatility < volatility_percentile * 0.8:
                base_weights['momentum_mid'] *= 1.2
                base_weights['momentum_long'] *= 1.2
                base_weights['volume'] *= 1.2
            
            # Dynamic RSI thresholds based on market regime
            rsi_upper = 65 if current_volatility > volatility_percentile else 60
            rsi_lower = 35 if current_volatility > volatility_percentile else 40
            
            signals = {
                'prediction': 1 if predicted_return > 0 else -1,
                'momentum_short': 1 if momentum_5d > 0 else -1,
                'momentum_mid': 1 if momentum_20d > 0 else -1,
                'momentum_long': 1 if momentum_60d > 0 else -1,
                'rsi': 1 if rsi > rsi_upper else (-1 if rsi < rsi_lower else 0),
                'bb': 1 if bb_position > (0.7 if current_volatility > volatility_percentile else 0.6) else -1,
                'macd': 1 if macd_hist > 0 else -1,
                'volume': 1 if price_volume_correlation > 0.3 else (-1 if price_volume_correlation < -0.3 else 0)
            }
            
            # Enhanced signal weighting with regime-specific adjustments
            signal_weights = base_weights.copy()
            
            # Adjust weights based on trend strength
            if abs(trend_strength) > 0.03:  # Strong trend
                signal_weights['momentum_short'] *= 1.2
                signal_weights['momentum_mid'] *= 1.3
                signal_weights['momentum_long'] *= 1.4
            elif abs(trend_strength) < 0.01:  # Weak trend
                signal_weights['rsi'] *= 1.3
                signal_weights['bb'] *= 1.2
                signal_weights['volume'] *= 1.2
            
            # Normalize weights
            total_weight = sum(signal_weights.values())
            signal_weights = {k: v/total_weight for k, v in signal_weights.items()}
            
            # Calculate weighted signal agreement
            weighted_sum = sum(signals[k] * signal_weights[k] for k in signals)
            signal_agreement = abs(weighted_sum)
            
            # Enhanced confidence calculation with market regime consideration
            base_confidence = 0.5 + (signal_agreement * 0.3)
            
            # Volatility impact with adaptive scaling
            volatility_impact = np.exp(-2 * current_volatility / volatility_percentile)
            volatility_factor = 0.6 + (0.4 * volatility_impact)
            
            # Trend impact with momentum confirmation
            trend_momentum_alignment = (
                np.sign(trend_strength) == 
                np.sign(momentum_5d) == 
                np.sign(momentum_20d)
            )
            trend_factor = 1.0 + (0.3 * abs(trend_strength) * (1.2 if trend_momentum_alignment else 0.8))
            
            # Advanced regime-specific confidence adjustments for Turkish market
            if regime['volatile_trending']:
                base_confidence *= 0.7
                # Higher confidence if multiple timeframes align
                timeframe_alignment = (
                    np.sign(momentum_5d) == 
                    np.sign(momentum_20d) == 
                    np.sign(momentum_60d)
                )
                if timeframe_alignment and signal_agreement > 0.7:
                    base_confidence *= 1.3
                    
            elif regime['strong_trend']:
                if trend_momentum_alignment:
                    base_confidence *= 1.3
                    # Volume confirmation
                    if price_volume_correlation > 0.5:
                        base_confidence *= 1.2
                    # RSI confirmation
                    if (trend_strength > 0 and rsi > 60) or (trend_strength < 0 and rsi < 40):
                        base_confidence *= 1.1
                else:
                    base_confidence *= 0.7
                    
            elif regime['mean_reverting']:
                price_deviation = prices_array[-1] / prices_array[-20:].mean() - 1
                if abs(price_deviation) > 0.03:
                    # Strong mean reversion signal
                    if (price_deviation > 0 and rsi > 70) or (price_deviation < 0 and rsi < 30):
                        base_confidence *= 1.2
                    else:
                        base_confidence *= 0.9
                else:
                    base_confidence *= 0.8
                    
            else:  # ranging market
                base_confidence *= 0.85
                # Higher confidence near support/resistance levels
                if bb_position > 0.8 or bb_position < 0.2:
                    base_confidence *= 1.1
                    
            # Market condition adjustments
            returns_skew = scipy.stats.skew(returns[-60:])
            returns_kurtosis = scipy.stats.kurtosis(returns[-60:])
            
            # Reduce confidence in extreme market conditions
            if abs(returns_skew) > 1.5 or abs(returns_kurtosis) > 5:
                base_confidence *= 0.85
            if current_volatility > volatility_percentile * 1.5:
                base_confidence *= 0.75
            
            confidence = base_confidence * volatility_factor * trend_factor
            confidence = max(0.1, min(0.9, confidence))  # Bound between 0.1 and 0.9
            
            # Apply reasonable bounds to prediction
            predicted_return = max(min(predicted_return, max_return), -max_return)
            predicted_price = float(prices_array[-1] * (1 + predicted_return))
            
            return {
                'price': {
                    'predicted': float(predicted_price),
                    'current': float(prices_array[-1]),
                    'return': float(predicted_return)
                },
                'confidence': float(confidence),
                'market_regime': {
                    'type': next(k for k, v in regime.items() if v),
                    'volatility': float(current_volatility),
                    'trend_strength': float(trend_strength),
                    'momentum_alignment': bool(trend_momentum_alignment)
                },
                'uncertainty': {
                    'total': float(total_uncertainty),
                    'epistemic': float(epistemic_uncertainty),
                    'aleatory': float(aleatory_uncertainty)
                },
                'technical_signals': {
                    'rsi': float(rsi),
                    'bb_position': float(bb_position),
                    'macd_hist': float(macd_hist),
                    'momentum': {
                        'short': float(momentum_5d),
                        'mid': float(momentum_20d),
                        'long': float(momentum_60d)
                    },
                    'volume': {
                        'correlation': float(price_volume_correlation),
                        'ma': float(volume_ma)
                    }
                },
                'signal_analysis': {
                    'agreement': float(signal_agreement),
                    'weights': signal_weights,
                    'signals': signals
                }
            }

    def train(self, prices: List[float], epochs: int = 100, learning_rate: float = 0.001, validation_split: float = 0.2) -> Dict[str, float]:
        prices_array = np.array(prices)
        sequences, targets = self.prepare_sequence(prices)
        
        # Enhanced data preprocessing for Turkish market characteristics
        from sklearn.preprocessing import RobustScaler
        
        # Use RobustScaler for features to handle outliers common in emerging markets
        self.scaler = RobustScaler(quantile_range=(5, 95))  # Wider range for Turkish market volatility
        sequences_reshaped = sequences.reshape(-1, sequences.shape[-1])
        sequences_scaled = self.scaler.fit_transform(sequences_reshaped)
        sequences = sequences_scaled.reshape(sequences.shape)
        
        # Enhanced market regime detection for Turkish market
        returns = np.diff(prices_array) / prices_array[:-1]
        volatility = np.std(returns[-20:]) * np.sqrt(252)
        trend = prices_array[-20:].mean() / prices_array[-40:-20].mean() - 1
        
        # Dynamic volatility thresholds with Turkish market adaptations
        vol_windows = [20, 60, 120]
        vol_metrics = {
            f'vol_{w}d': np.std(returns[-w:]) * np.sqrt(252) if len(returns) >= w else volatility
            for w in vol_windows
        }
        
        # Trend strength with multiple timeframes
        trend_windows = [5, 20, 60]
        trend_metrics = {
            f'trend_{w}d': prices_array[-w:].mean() / prices_array[-2*w:-w].mean() - 1
            if len(prices_array) >= 2*w else trend
            for w in trend_windows
        }
        
        # Composite regime indicators
        vol_composite = np.mean([vol_metrics[f'vol_{w}d'] for w in vol_windows])
        trend_composite = np.mean([trend_metrics[f'trend_{w}d'] for w in trend_windows])
        
        # Dynamic thresholds based on historical patterns
        vol_percentiles = np.percentile(np.abs(returns[-120:]) * np.sqrt(252), [25, 75])
        trend_percentiles = np.percentile(np.abs(returns[-120:]), [25, 75])
        
        # Enhanced regime classification with momentum consideration
        momentum_short = returns[-5:].mean() if len(returns) >= 5 else 0
        momentum_mid = returns[-20:].mean() if len(returns) >= 20 else 0
        momentum_alignment = np.sign(momentum_short) == np.sign(momentum_mid)
        
        # Regime labels with Turkish market characteristics
        regime_labels = np.zeros(len(sequences))
        volatile_trending = (vol_composite > vol_percentiles[1]) & (abs(trend_composite) > trend_percentiles[1])
        volatile_ranging = (vol_composite > vol_percentiles[1]) & (abs(trend_composite) <= trend_percentiles[0])
        
        regime_labels[volatile_trending & momentum_alignment] = 2  # Strong volatile trending
        regime_labels[volatile_trending & ~momentum_alignment] = 1  # Weak volatile trending
        regime_labels[volatile_ranging] = 3  # Volatile ranging
        regime_labels = torch.LongTensor(regime_labels).to(self.device)
        
        # Adaptive sample weights based on regime and momentum
        sample_weights = torch.ones(len(sequences)).to(self.device)
        sample_weights[regime_labels == 2] = 1.6  # Strong volatile trending
        sample_weights[regime_labels == 1] = 1.3  # Weak volatile trending
        sample_weights[regime_labels == 3] = 1.4  # Volatile ranging
        
        # Additional weight adjustments based on market conditions
        if vol_composite > vol_percentiles[1] * 1.5:  # Extreme volatility
            sample_weights *= 1.2
        if abs(trend_composite) > trend_percentiles[1] * 1.5:  # Strong trend
            sample_weights *= 1.1
        
        # Calculate market regimes for regime-aware training
        returns = np.diff(prices_array) / prices_array[:-1]
        volatility = np.std(returns[-20:]) * np.sqrt(252)
        trend = prices_array[-20:].mean() / prices_array[-40:-20].mean() - 1
        
        # Generate regime labels
        regime_labels = np.zeros(len(sequences))
        regime_labels[volatility > 0.4] = 1  # High volatility regime
        regime_labels[np.abs(trend) > 0.05] = 2  # Strong trend regime
        regime_labels = torch.LongTensor(regime_labels).to(self.device)
        
        sequences = torch.FloatTensor(sequences).to(self.device)
        targets = torch.FloatTensor(targets).to(self.device)
        
        split_idx = int(len(sequences) * (1 - validation_split))
        train_sequences = sequences[:split_idx]
        train_targets = targets[:split_idx]
        val_sequences = sequences[split_idx:]
        val_targets = targets[split_idx:]
        
        optimizer = torch.optim.AdamW(self.model.parameters(), lr=learning_rate, weight_decay=0.01)
        scheduler = torch.optim.lr_scheduler.OneCycleLR(
            optimizer, max_lr=learning_rate,
            epochs=epochs, steps_per_epoch=1,
            pct_start=0.3, anneal_strategy='cos'
        )
        
        # Advanced loss functions with uncertainty calibration
        class CalibrationLoss(nn.Module):
            def __init__(self, num_bins=15):
                super().__init__()
                self.num_bins = num_bins
                
            def forward(self, pred_mean, pred_var, targets):
                z_score = (targets - pred_mean) / torch.sqrt(pred_var)
                bin_boundaries = torch.linspace(-3, 3, self.num_bins + 1).to(pred_mean.device)
                bin_lowers = bin_boundaries[:-1]
                bin_uppers = bin_boundaries[1:]
                
                calibration_error = 0.0
                for bin_lower, bin_upper in zip(bin_lowers, bin_uppers):
                    in_bin = (z_score >= bin_lower) & (z_score < bin_upper)
                    if torch.any(in_bin):
                        prob_mass = (bin_upper - bin_lower) / 6  # Theoretical probability
                        empirical_prob = torch.mean(in_bin.float())
                        calibration_error += (prob_mass - empirical_prob) ** 2
                        
                return calibration_error
                
        criterion_returns = nn.GaussianNLLLoss(reduction='none')
        criterion_calibration = CalibrationLoss()
        
        # Adaptive loss weights based on market regimes
        volatility_weights = torch.tensor([
            1.0,  # Low volatility
            1.5,  # Medium volatility
            2.0   # High volatility
        ]).to(self.device)
        
        trend_weights = torch.tensor([
            1.5,  # Downtrend (higher weight for trend reversals)
            1.0,  # Sideways
            1.5   # Uptrend
        ]).to(self.device)
        
        regime_weights = torch.tensor([
            1.0,  # Normal
            1.5,  # Volatile ranging
            2.0   # Volatile trending
        ]).to(self.device)
        
        # Dynamic weight adjustment based on prediction uncertainty
        def get_adaptive_weights(pred_var, regime_labels):
            uncertainty_factor = torch.sigmoid(-pred_var)  # Lower weight for high uncertainty
            regime_importance = regime_weights[regime_labels]
            return uncertainty_factor * regime_importance
            
        criterion_volatility = nn.CrossEntropyLoss(weight=volatility_weights, reduction='none')
        criterion_trend = nn.CrossEntropyLoss(weight=trend_weights, reduction='none')
        criterion_regime = nn.CrossEntropyLoss(weight=regime_weights, reduction='none')
        
        best_val_loss = float('inf')
        patience = 15  # Increased patience for better convergence
        patience_counter = 0
        min_lr = 1e-6
        
        metrics = {
            'train_loss': [], 'val_loss': [],
            'train_return_loss': [], 'val_return_loss': [],
            'train_volatility_loss': [], 'val_volatility_loss': [],
            'train_trend_loss': [], 'val_trend_loss': [],
            'train_regime_loss': [], 'val_regime_loss': [],
            'learning_rates': [],
            'regime_metrics': {
                'volatile': {'rmse': [], 'count': [], 'accuracy': []},
                'trending': {'rmse': [], 'count': [], 'accuracy': []},
                'ranging': {'rmse': [], 'count': [], 'accuracy': []}
            },
            'directional_accuracy': [],
            'prediction_bias': [],
            'uncertainty_calibration': []
        }
        
        # Track regime distribution
        regime_distribution = {
            'volatile': 0,
            'trending': 0,
            'ranging': 0
        }
        
        self.model.train()
        for epoch in range(epochs):
            optimizer.zero_grad()
            predictions, volatility_logits, trend_logits, regime_logits = self.model(train_sequences)
            
            # Enhanced regime-aware training for Turkish market
            returns = torch.diff(train_sequences[:, :, 0], dim=1)
            volatility = torch.std(returns, dim=1)
            trend = torch.mean(returns, dim=1)
            
            # Dynamic thresholds based on market conditions
            vol_percentiles = torch.quantile(volatility, torch.tensor([0.25, 0.75]))
            trend_percentiles = torch.quantile(torch.abs(trend), torch.tensor([0.25, 0.75]))
            
            # Volatility regime labels with Turkish market adjustments
            volatility_labels = torch.zeros(len(train_sequences), dtype=torch.long).to(self.device)
            volatility_labels[volatility > vol_percentiles[1]] = 2  # High volatility
            volatility_labels[(volatility <= vol_percentiles[1]) & (volatility > vol_percentiles[0])] = 1  # Medium
            
            # Enhanced trend labels for Turkish market dynamics
            trend_labels = torch.zeros(len(train_sequences), dtype=torch.long).to(self.device)
            trend_labels[trend > trend_percentiles[1]] = 2  # Strong uptrend
            trend_labels[trend < -trend_percentiles[1]] = 0  # Strong downtrend
            
            # Regime labels combining volatility and trend
            regime_labels = torch.zeros(len(train_sequences), dtype=torch.long).to(self.device)
            regime_labels[(volatility > vol_percentiles[1]) & (torch.abs(trend) > trend_percentiles[1])] = 2  # Volatile trending
            regime_labels[(volatility > vol_percentiles[1]) & (torch.abs(trend) <= trend_percentiles[0])] = 1  # Volatile ranging
            
            # Separate mean and variance predictions
            pred_mean = predictions[:, 0]
            pred_var = F.softplus(predictions[:, 1]) + 1e-6
            
            # Enhanced loss calculation with regime-specific weighting
            return_loss = criterion_returns(pred_mean, train_targets.squeeze(), pred_var)
            volatility_loss = criterion_volatility(volatility_logits, volatility_labels)
            trend_loss = criterion_trend(trend_logits, trend_labels)
            regime_loss = criterion_regime(regime_logits, regime_labels)
            
            # Dynamic loss weighting based on market conditions
            vol_weight = 0.25 if torch.mean(volatility) > vol_percentiles[1] else 0.2
            trend_weight = 0.25 if torch.mean(torch.abs(trend)) > trend_percentiles[1] else 0.2
            regime_weight = 0.3 if torch.any(regime_labels > 0) else 0.2
            
            # Combined loss with adaptive weights
            loss = (return_loss + 
                   vol_weight * volatility_loss + 
                   trend_weight * trend_loss + 
                   regime_weight * regime_loss)
            
            loss.backward()
            
            # Enhanced gradient clipping for stability
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=0.5)
            optimizer.step()
            scheduler.step()
            
            self.model.eval()
            with torch.no_grad():
                val_predictions, val_volatility_logits, val_trend_logits, val_regime_logits = self.model(val_sequences)
                
                val_returns = torch.diff(val_sequences[:, :, 0], dim=1)
                val_volatility = torch.std(val_returns, dim=1)
                val_trend = torch.mean(val_returns, dim=1)
                
                # Validation volatility labels
                # Enhanced validation labels with Turkish market adaptations
                val_volatility_labels = torch.zeros(len(val_sequences), dtype=torch.long).to(self.device)
                val_vol_thresholds = torch.quantile(val_volatility, torch.tensor([0.33, 0.67]))
                val_volatility_labels[val_volatility > val_vol_thresholds[1]] = 2
                val_volatility_labels[(val_volatility <= val_vol_thresholds[1]) & (val_volatility > val_vol_thresholds[0])] = 1
                
                # Validation trend labels with momentum consideration
                val_trend_labels = torch.zeros(len(val_sequences), dtype=torch.long).to(self.device)
                val_trend_threshold = torch.std(val_trend) * 0.5
                val_trend_labels[val_trend > val_trend_threshold] = 2
                val_trend_labels[val_trend < -val_trend_threshold] = 0
                
                # Validation regime labels combining volatility and trend
                val_regime_labels = torch.zeros(len(val_sequences), dtype=torch.long).to(self.device)
                val_regime_labels[(val_volatility > val_vol_thresholds[1]) & (torch.abs(val_trend) > val_trend_threshold)] = 2  # Volatile trending
                val_regime_labels[(val_volatility > val_vol_thresholds[1]) & (torch.abs(val_trend) <= val_trend_threshold)] = 1  # Volatile ranging
                
                # Calculate directional accuracy and prediction bias
                # Separate validation mean and variance predictions
                val_pred_mean = val_predictions[:, 0]
                val_pred_var = F.softplus(val_predictions[:, 1]) + 1e-6
                
                # Calculate directional accuracy and prediction bias
                directional_accuracy = ((val_pred_mean > 0) == (val_targets.squeeze() > 0)).float().mean()
                prediction_bias = (val_pred_mean - val_targets.squeeze()).mean()
                
                # Calculate uncertainty correlation with error magnitude
                uncertainty_correlation = torch.corrcoef(
                    torch.stack([val_pred_var.flatten(), (val_pred_mean - val_targets.squeeze()).abs().flatten()])
                )[0, 1]
                
                # Enhanced validation with regime-specific metrics
                val_return_loss = criterion_returns(val_pred_mean, val_targets.squeeze(), val_pred_var)
                val_volatility_loss = criterion_volatility(val_volatility_logits, val_volatility_labels)
                val_trend_loss = criterion_trend(val_trend_logits, val_trend_labels)
                val_regime_loss = criterion_regime(val_regime_logits, val_regime_labels)
                
                # Dynamic validation loss weighting
                val_vol_weight = 0.25 if torch.mean(val_volatility) > vol_percentiles[1] else 0.2
                val_trend_weight = 0.25 if torch.mean(torch.abs(val_trend)) > trend_percentiles[1] else 0.2
                val_regime_weight = 0.3 if torch.any(val_regime_labels > 0) else 0.2
                
                val_loss = (val_return_loss + 
                           val_vol_weight * val_volatility_loss + 
                           val_trend_weight * val_trend_loss + 
                           val_regime_weight * val_regime_loss)
                
                # Enhanced prediction metrics with regime-specific analysis
                with torch.no_grad():
                    # Overall metrics
                    train_rmse = torch.sqrt(torch.mean((pred_mean - train_targets.squeeze())**2))
                    val_rmse = torch.sqrt(torch.mean((val_pred_mean - val_targets.squeeze())**2))
                    
                    # Regime-specific RMSEs
                    regime_masks = {
                        'volatile': val_volatility > vol_percentiles[1],
                        'trending': torch.abs(val_trend) > trend_percentiles[1],
                        'ranging': ~(val_volatility > vol_percentiles[1]) & ~(torch.abs(val_trend) > trend_percentiles[1])
                    }
                    
                    regime_rmses = {
                        regime: torch.sqrt(torch.mean((val_pred_mean[mask] - val_targets.squeeze()[mask])**2))
                        for regime, mask in regime_masks.items() if torch.any(mask)
                    }
                    
                    # Classification accuracies
                    train_vol_acc = (torch.argmax(volatility_logits, dim=1) == volatility_labels).float().mean()
                    val_vol_acc = (torch.argmax(val_volatility_logits, dim=1) == val_volatility_labels).float().mean()
                    
                    train_trend_acc = (torch.argmax(trend_logits, dim=1) == trend_labels).float().mean()
                    val_trend_acc = (torch.argmax(val_trend_logits, dim=1) == val_trend_labels).float().mean()
                    
                    train_regime_acc = (torch.argmax(regime_logits, dim=1) == regime_labels).float().mean()
                    val_regime_acc = (torch.argmax(val_regime_logits, dim=1) == val_regime_labels).float().mean()
                
                # Update base metrics
                metrics['train_loss'].append(float(loss))
                metrics['val_loss'].append(float(val_loss))
                metrics['train_return_loss'].append(float(return_loss))
                metrics['val_return_loss'].append(float(val_return_loss))
                metrics['train_volatility_loss'].append(float(volatility_loss))
                metrics['val_volatility_loss'].append(float(val_volatility_loss))
                metrics['train_trend_loss'].append(float(trend_loss))
                metrics['val_trend_loss'].append(float(val_trend_loss))
                metrics['learning_rates'].append(float(optimizer.param_groups[0]['lr']))
                
                # Update regime-specific metrics
                for regime, (rmse, mask) in regime_rmses.items():
                    metrics['regime_metrics'][regime]['rmse'].append(float(rmse))
                    metrics['regime_metrics'][regime]['count'].append(int(torch.sum(mask)))
                    metrics['regime_metrics'][regime]['accuracy'].append(
                        float((torch.argmax(val_regime_logits[mask], dim=1) == val_regime_labels[mask]).float().mean())
                        if torch.any(mask) else 0.0
                    )
                
                # Update additional metrics
                metrics['directional_accuracy'].append(directional_accuracy)
                metrics['prediction_bias'].append(prediction_bias)
                metrics['uncertainty_calibration'].append(uncertainty_correlation)
                
                # Update regime distribution
                for regime, mask in regime_masks.items():
                    regime_distribution[regime] = int(torch.sum(mask))
                
                logger.info(
                    f"Epoch {epoch+1}/{epochs}\n"
                    f"Loss: {loss:.4f} (val: {val_loss:.4f})\n"
                    f"RMSE: {train_rmse:.4f} (val: {val_rmse:.4f})\n"
                    f"Vol Acc: {train_vol_acc:.3f} (val: {val_vol_acc:.3f})\n"
                    f"Trend Acc: {train_trend_acc:.3f} (val: {val_trend_acc:.3f})\n"
                    f"Regime Acc: {train_regime_acc:.3f} (val: {val_regime_acc:.3f})\n"
                    f"Dir Acc: {directional_accuracy:.3f}\n"
                    f"Uncertainty Corr: {uncertainty_correlation:.3f}\n"
                    f"Regime Distribution: " + 
                    ", ".join(f"{k}: {v}" for k, v in regime_distribution.items())
                )
            
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                # Save best model state
                torch.save({
                    'epoch': epoch,
                    'model_state_dict': self.model.state_dict(),
                    'optimizer_state_dict': optimizer.state_dict(),
                    'loss': best_val_loss,
                }, 'best_model.pt')
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    # Load best model state
                    checkpoint = torch.load('best_model.pt')
                    self.model.load_state_dict(checkpoint['model_state_dict'])
                    break
            
            self.model.train()
        
        # Calculate regime-specific metrics
        regime_metrics = {
            regime: {
                'rmse': float(rmse),
                'count': int(torch.sum(mask)),
                'accuracy': float((torch.argmax(val_regime_logits[mask], dim=1) == val_regime_labels[mask]).float().mean()) if torch.any(mask) else 0.0
            }
            for regime, (rmse, mask) in regime_rmses.items()
        }
        
        # Calculate directional accuracy
        directional_accuracy = float(torch.mean(((val_pred_mean > 0) == (val_targets.squeeze() > 0)).float()))
        
        # Calculate prediction bias
        prediction_bias = float(torch.mean(val_pred_mean - val_targets.squeeze()))
        
        # Calculate uncertainty calibration
        sorted_uncertainties, sorted_errors = zip(*sorted(
            zip(val_pred_var.cpu().numpy(), 
                (val_pred_mean - val_targets.squeeze()).abs().cpu().numpy())
        ))
        uncertainty_correlation = float(np.corrcoef(sorted_uncertainties, sorted_errors)[0, 1])
        
        # Flatten metrics for return type compatibility
        return {
            'final_train_loss': float(metrics['train_loss'][-1]),
            'final_val_loss': float(metrics['val_loss'][-1]),
            'final_train_return_loss': float(metrics['train_return_loss'][-1]),
            'final_val_return_loss': float(metrics['val_return_loss'][-1]),
            'final_train_volatility_loss': float(metrics['train_volatility_loss'][-1]),
            'final_val_volatility_loss': float(metrics['val_volatility_loss'][-1]),
            'final_train_trend_loss': float(metrics['train_trend_loss'][-1]),
            'final_val_trend_loss': float(metrics['val_trend_loss'][-1]),
            'best_val_loss': float(best_val_loss),
            'epochs_trained': float(epoch + 1),
            'final_learning_rate': float(metrics['learning_rates'][-1]),
            'train_rmse': float(train_rmse),
            'val_rmse': float(val_rmse),
            'directional_accuracy': float(directional_accuracy),
            'prediction_bias': float(prediction_bias),
            'uncertainty_calibration': float(uncertainty_correlation),
            'volatility_train_accuracy': float(train_vol_acc),
            'volatility_val_accuracy': float(val_vol_acc),
            'trend_train_accuracy': float(train_trend_acc),
            'trend_val_accuracy': float(val_trend_acc),
            'regime_train_accuracy': float(train_regime_acc),
            'regime_val_accuracy': float(val_regime_acc),
            'volatile_regime_rmse': float(regime_metrics.get('volatile', {}).get('rmse', 0.0)),
            'trending_regime_rmse': float(regime_metrics.get('trending', {}).get('rmse', 0.0)),
            'ranging_regime_rmse': float(regime_metrics.get('ranging', {}).get('rmse', 0.0))
        }
