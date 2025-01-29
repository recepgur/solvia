from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging
import numpy as np
from ..features import Portfolio, PortfolioAsset, Asset, PricePrediction
from ..services.market_data import MarketDataService
from ..services.portfolio import PortfolioService
from ..models.model_manager import ModelManager

def calculate_rsi(prices: np.ndarray, period: int = 14) -> float:
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    
    avg_gain = np.convolve(gains, np.ones(period)/period, mode='valid')
    avg_loss = np.convolve(losses, np.ones(period)/period, mode='valid')
    
    rs = avg_gain / (avg_loss + 1e-6)
    rsi = 100 - (100 / (1 + rs))
    return float(rsi[-1])

def calculate_macd(prices: np.ndarray, fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[float, float]:
    exp1 = np.exp(-np.arange(fast)[::-1]/fast)
    exp2 = np.exp(-np.arange(slow)[::-1]/slow)
    exp3 = np.exp(-np.arange(signal)[::-1]/signal)
    
    fast_ma = np.convolve(prices, exp1/exp1.sum(), mode='valid')
    slow_ma = np.convolve(prices, exp2/exp2.sum(), mode='valid')
    
    macd_line = fast_ma[-len(slow_ma):] - slow_ma
    signal_line = np.convolve(macd_line, exp3/exp3.sum(), mode='valid')
    
    return float(macd_line[-1]), float(signal_line[-1])

def calculate_bollinger_position(prices: np.ndarray, period: int = 20, num_std: float = 2.0) -> float:
    sma = np.convolve(prices, np.ones(period)/period, mode='valid')
    rolling_std = np.array([np.std(prices[i:i+period]) for i in range(len(prices)-period+1)])
    
    upper_band = sma + num_std * rolling_std
    lower_band = sma - num_std * rolling_std
    
    current_price = prices[-1]
    current_sma = sma[-1]
    band_width = upper_band[-1] - lower_band[-1]
    
    position = (current_price - current_sma) / (band_width/2)
    return float(np.clip(position, -1, 1))

def calculate_technical_indicators(prices: List[float]) -> Dict[str, float]:
    prices_array = np.array(prices)
    returns = np.diff(prices_array) / prices_array[:-1]
    
    # Moving averages
    sma_5 = np.mean(prices[-5:])
    sma_20 = np.mean(prices[-20:])
    ema_12 = np.mean(prices[-12:] * np.exp(np.linspace(0, 1, 12)))
    ema_26 = np.mean(prices[-26:] * np.exp(np.linspace(0, 1, 26)))
    
    # Volatility and momentum
    volatility = np.std(returns) * np.sqrt(252)
    momentum = (prices[-1] / prices[-5] - 1) if len(prices) >= 5 else 0
    
    # Advanced indicators
    rsi = calculate_rsi(prices_array)
    macd_line, signal_line = calculate_macd(prices_array)
    bollinger_pos = calculate_bollinger_position(prices_array)
    
    # Volume-weighted metrics
    vwap = np.mean(prices[-5:])  # Simplified VWAP calculation
    
    # Trend strength
    adx = abs(sma_5 / sma_20 - 1) * 100  # Simplified ADX
    
    # Market regime indicators
    volatility_regime = 1 if volatility > np.mean([v for v in [np.std(returns[i:i+20])*np.sqrt(252) for i in range(len(returns)-20)]]) else 0
    trend_regime = 1 if abs(sma_5/sma_20 - 1) > 0.02 else 0
    
    return {
        "sma_5": float(sma_5),
        "sma_20": float(sma_20),
        "ema_12": float(ema_12),
        "ema_26": float(ema_26),
        "volatility": float(volatility),
        "momentum": float(momentum),
        "trend": float(sma_5 / sma_20 - 1) if len(prices) >= 20 else 0,
        "rsi": float(rsi),
        "macd": float(macd_line),
        "macd_signal": float(signal_line),
        "bollinger_position": float(bollinger_pos),
        "vwap": float(vwap),
        "adx": float(adx),
        "volatility_regime": float(volatility_regime),
        "trend_regime": float(trend_regime)
    }

logger = logging.getLogger(__name__)

class TradingSignal:
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"

class TradeRecommendation:
    def __init__(self, symbol: str, action: str, quantity: float, confidence: float):
        self.symbol = symbol
        self.action = action
        self.quantity = quantity
        self.confidence = confidence
        self.timestamp = datetime.now()

class AutonomousTradingService:
    def __init__(self, risk_params: Optional[Dict[str, float]] = None):
        self.model_manager = ModelManager()
        self.market_data = MarketDataService()
        self.portfolio_service = PortfolioService()
        
        default_params = {
            'max_position_size': 0.12,
            'stop_loss_threshold': 0.04,
            'trailing_stop_distance': 0.025,
            'max_daily_drawdown': 0.015,
            'min_confidence_threshold': 0.80,
            'max_volatility': 0.35,
            'min_liquidity': 2500000,
            'max_trades_per_day': 3,
            'position_scaling': 0.4,
            'min_profit_taking': 0.04,
            'max_correlation': 0.65,
            'sector_exposure_limit': 0.25,
            'momentum_threshold': 0.025,
            'mean_reversion_threshold': 1.8,
            'volume_factor': 1.8,
            'trend_confirmation': 0.7,
            'sector_momentum_weight': 0.3,
            'volatility_scaling': 0.8,
            'regime_adaptation_rate': 0.25,
            'min_liquidity': 2000000,
            'max_trades_per_day': 3,
            'position_scaling': 0.4,
            'min_profit_taking': 0.05,
            'max_correlation': 0.7,
            'sector_exposure_limit': 0.3,
            'momentum_threshold': 0.02,
            'mean_reversion_threshold': 2.0,
            'volume_factor': 1.5
        }
        
        self.risk_params = {**default_params, **(risk_params or {})}
        self._daily_trades = []
        self._daily_pnl = 0.0
    
    async def analyze_asset(self, symbol: str) -> Tuple[str, float]:
        try:
            # Get market context and asset data
            market_regime = await self.detect_market_regime()
            prices = await self.market_data.get_historical_prices(symbol)
            volumes = await self.market_data.get_historical_volumes(symbol)
            indicators = calculate_technical_indicators(prices)
            sector = await self.market_data.get_sector(symbol)
            sector_momentum = await self.get_sector_momentum()
            
            # Enhanced volume analysis with adaptive thresholds
            volume_weights = np.exp(np.linspace(0, 1, 20))
            weighted_avg_volume = np.average(volumes[-20:], weights=volume_weights)
            recent_volume = volumes[-1]
            volume_ratio = recent_volume / weighted_avg_volume
            
            # Dynamic liquidity thresholds based on market regime
            min_volume_factor = self.risk_params['volume_factor']
            min_liquidity = self.risk_params['min_liquidity']
            
            if market_regime['volatile'] > 0.3:
                min_volume_factor *= 1.5
                min_liquidity *= 1.2
            elif market_regime['trending'] > 0.5:
                min_volume_factor *= 0.8
            
            # Enhanced liquidity check
            if volume_ratio < min_volume_factor or recent_volume < min_liquidity:
                logger.info(f"{symbol}: Insufficient liquidity - volume: {recent_volume:.0f}, ratio: {volume_ratio:.2f}")
                return TradingSignal.HOLD, 0
            
            # Get price prediction with regime-adjusted confidence
            prediction_result = self.model_manager.get_price_model().predict(prices)
            predicted_price = float(prediction_result['price'])
            base_confidence = float(prediction_result['confidence'])
            predicted_return = (predicted_price - float(prices[-1])) / float(prices[-1])
            
            # Adjust prediction confidence based on market regime
            if market_regime['volatile'] > 0.3:
                base_confidence *= 0.7
            elif market_regime['trending'] > 0.5:
                base_confidence *= 1.2 if abs(predicted_return) > 0.02 else 0.8
            
            # Enhanced mean reversion analysis
            returns = np.diff(prices) / prices[:-1]
            volatility_adjusted_returns = returns / np.std(returns[-20:])
            returns_zscore = (returns[-1] - np.mean(returns[-20:])) / np.std(returns[-20:])
            
            # Adaptive mean reversion threshold based on market regime
            mr_threshold = self.risk_params['mean_reversion_threshold']
            if market_regime['volatile'] > 0.3:
                mr_threshold *= 1.5
            elif market_regime['ranging'] > 0.5:
                mr_threshold *= 0.8
                
            mean_reversion_signal = -np.sign(returns_zscore) if abs(returns_zscore) > mr_threshold else 0
            
            # Enhanced news sentiment analysis with sector context
            news_list = await self.market_data.get_latest_news(symbol, limit=5)
            sentiment_score = 0
            sentiment_confidence = 0
            
            if news_list:
                sentiments = []
                for i, news in enumerate(news_list):
                    sentiment = self.model_manager.get_sentiment_model().analyze_text(news['text'])
                    time_decay = np.exp(-0.1 * i)
                    sentiment_value = sentiment.get('positive', 0) - sentiment.get('negative', 0)
                    sentiment_conf = sentiment.get('confidence', 0.5)
                    
                    # Consider sector context
                    if sentiment.get('sector') == sector:
                        sentiment_value *= 1.2
                        sentiment_conf *= 1.1
                    
                    sentiments.append({
                        'value': sentiment_value * time_decay,
                        'confidence': sentiment_conf * time_decay
                    })
                
                sentiment_score = np.average([s['value'] for s in sentiments], 
                                          weights=[s['confidence'] for s in sentiments])
                sentiment_confidence = np.mean([s['confidence'] for s in sentiments])
            
            # Enhanced technical analysis with regime-specific indicators
            prices_array = np.array(prices)
            rsi = indicators['rsi']
            macd = indicators['macd']
            macd_signal = indicators['macd_signal']
            bollinger_pos = indicators['bollinger_position']
            adx = indicators['adx']
            
            # Sector-specific analysis
            sector_score = sector_momentum.get(sector, 0)
            
            # Dynamic signal weights based on market regime and sector strength
            base_weights = {
                'prediction': 0.25,
                'sentiment': 0.15,
                'trend': 0.15,
                'momentum': 0.15,
                'mean_reversion': 0.15,
                'technical': 0.15
            }
            
            # Adjust weights based on market regime
            if market_regime['volatile'] > 0.3:
                base_weights.update({
                    'prediction': 0.15,  # Reduce prediction weight in volatile markets
                    'technical': 0.25,   # Increase technical analysis weight
                    'mean_reversion': 0.20
                })
            elif market_regime['trending'] > 0.5:
                base_weights.update({
                    'trend': 0.25,       # Increase trend following
                    'momentum': 0.20,
                    'mean_reversion': 0.05
                })
            elif market_regime['ranging'] > 0.5:
                base_weights.update({
                    'mean_reversion': 0.25,  # Increase mean reversion
                    'technical': 0.20,
                    'trend': 0.10
                })
                
            # Adjust weights based on sector momentum
            if abs(sector_score) > 0.05:
                sector_factor = min(0.1, abs(sector_score))
                base_weights['trend'] += sector_factor
                base_weights['momentum'] += sector_factor
                base_weights['mean_reversion'] -= sector_factor * 2
                
            # Normalize weights
            total_weight = sum(base_weights.values())
            signal_weights = {k: v/total_weight for k, v in base_weights.items()}
            
            # Calculate technical score with regime adaptation
            technical_score = (
                0.4 * (-1 if rsi > 70 else 1 if rsi < 30 else (50 - rsi) / 50) +
                0.3 * np.sign(macd - macd_signal) +
                0.3 * (-bollinger_pos)  # Mean reversion component
            )
            
            # Calculate trend score with ADX weighting
            trend_score = (
                0.5 * indicators['trend'] +
                0.3 * indicators['momentum'] +
                0.2 * (adx / 100.0) * np.sign(indicators['trend'])
            )
            
            # Combine all signals with regime-specific weights
            combined_score = (
                signal_weights['prediction'] * predicted_return * base_confidence +
                signal_weights['sentiment'] * sentiment_score * sentiment_confidence +
                signal_weights['trend'] * trend_score +
                signal_weights['momentum'] * indicators['momentum'] +
                signal_weights['mean_reversion'] * mean_reversion_signal +
                signal_weights['technical'] * technical_score
            )
            
            # Apply regime-specific adjustments
            if market_regime['volatile'] > 0.3:
                combined_score *= (1.0 - market_regime['volatile'] * 0.5)  # Reduce signal strength in volatile markets
            elif market_regime['trending'] > 0.5:
                trend_alignment = np.sign(combined_score) == np.sign(indicators['trend'])
                combined_score *= (1.0 + trend_alignment * 0.3)  # Boost signals aligned with trend
            
            # Calculate advanced confidence score
            signal_components = [
                (predicted_return, base_confidence),
                (sentiment_score, sentiment_confidence),
                (trend_score, min(1.0, adx/30.0)),
                (indicators['momentum'], abs(indicators['momentum'])/0.1),
                (technical_score, abs(technical_score)),
                (mean_reversion_signal, abs(returns_zscore)/3.0)
            ]
            
            # Weight confidence by signal strength and component reliability
            weighted_confidence = sum(abs(sig) * conf for sig, conf in signal_components)
            signal_agreement = sum(np.sign(sig) * conf for sig, conf in signal_components)
            
            # Calculate final confidence score
            base_confidence = abs(signal_agreement) / sum(conf for _, conf in signal_components)
            volatility_penalty = market_regime['volatile'] * 0.3
            regime_boost = market_regime['trending'] * 0.2 if abs(trend_score) > 0.02 else 0
            
            confidence = base_confidence * (1.0 - volatility_penalty + regime_boost)
            confidence = max(0.1, min(0.9, confidence))
            
            # Dynamic thresholds based on market regime
            entry_threshold = self.risk_params['momentum_threshold']
            if market_regime['volatile'] > 0.3:
                entry_threshold *= (1 + market_regime['volatile'])
            elif market_regime['ranging'] > 0.5:
                entry_threshold *= 0.8
            
            # Generate trading signals with enhanced validation
            if combined_score > entry_threshold:
                if (rsi < 70 or market_regime['trending'] > 0.7) and volume_ratio > self.risk_params['volume_factor']:
                    if sector_score > -0.05:  # Avoid buying in weak sectors
                        return TradingSignal.BUY, confidence
            elif combined_score < -entry_threshold:
                if (rsi > 30 or market_regime['trending'] > 0.7) and volume_ratio > self.risk_params['volume_factor']:
                    if sector_score < 0.05:  # Avoid selling in strong sectors
                        return TradingSignal.SELL, confidence
            
            return TradingSignal.HOLD, 0
            
        except Exception as e:
            logger.error(f"Error analyzing asset {symbol}: {str(e)}")
            return TradingSignal.HOLD, 0
    
    async def apply_risk_management(self, portfolio: Portfolio, recommendation: TradeRecommendation) -> Optional[TradeRecommendation]:
        try:
            # Enhanced risk checks with market regime adaptation
            market_regime = await self.detect_market_regime()
            sector_momentum = await self.get_sector_momentum()
            
            # Dynamic risk threshold adjustment based on market regime
            volatility_factor = market_regime.get('volatile', 0)
            trend_factor = market_regime.get('trending', 0)
            
            # Exponential scaling of risk parameters based on market conditions
            position_scale = np.exp(-2 * volatility_factor)  # Reduces position size in volatile markets
            stop_scale = np.exp(-1.5 * volatility_factor)   # Tightens stops in volatile markets
            confidence_scale = np.exp(volatility_factor)     # Requires higher confidence in volatile markets
            
            # Apply dynamic adjustments
            self.risk_params['max_position_size'] *= position_scale
            self.risk_params['stop_loss_threshold'] *= stop_scale
            self.risk_params['min_confidence_threshold'] = min(0.9, self.risk_params['min_confidence_threshold'] * confidence_scale)
            
            # Trend-following adjustments
            if trend_factor > 0.5:
                self.risk_params['trailing_stop_distance'] *= (1 + 0.2 * trend_factor)  # Wider trailing stops in strong trends
                self.risk_params['position_scaling'] *= (1 + 0.1 * trend_factor)        # Larger positions in trending markets
            
            # Basic confidence and daily limits check with regime adaptation
            adjusted_confidence = recommendation.confidence
            if market_regime.get('volatile', 0) > 0.3:
                adjusted_confidence *= 0.8
            
            if adjusted_confidence < self.risk_params['min_confidence_threshold']:
                logger.info(f"Rejected trade: adjusted confidence {adjusted_confidence:.2f} below threshold")
                return None
            
            today = datetime.now().date()
            self._daily_trades = [t for t in self._daily_trades if t.timestamp.date() == today]
            if len(self._daily_trades) >= self.risk_params['max_trades_per_day']:
                logger.info("Rejected trade: daily trade limit reached")
                return None
            
            # Daily drawdown check
            if self._daily_pnl < -portfolio.total_value * self.risk_params['max_daily_drawdown']:
                logger.info("Rejected trade: daily drawdown limit reached")
                return None
            
            # Market condition checks
            prices = await self.market_data.get_historical_prices(recommendation.symbol)
            volumes = await self.market_data.get_historical_volumes(recommendation.symbol)
            indicators = calculate_technical_indicators(prices)
            
            if indicators['volatility'] > self.risk_params['max_volatility']:
                logger.info(f"Rejected trade: volatility {indicators['volatility']} above threshold")
                return None
            
            # Volume check
            avg_volume = np.mean(volumes[-20:])
            if volumes[-1] < avg_volume * self.risk_params['volume_factor']:
                logger.info("Rejected trade: insufficient volume")
                return None
            
            # Sector exposure check
            sector = await self.market_data.get_sector(recommendation.symbol)
            sector_assets = [
                asset for asset in portfolio.assets 
                if await self.market_data.get_sector(asset.symbol) == sector
            ]
            sector_exposure = sum(float(asset.total_value or 0) for asset in sector_assets)
            if sector_exposure >= portfolio.total_value * self.risk_params['sector_exposure_limit']:
                logger.info("Rejected trade: sector exposure limit reached")
                return None
            
            # Correlation check
            if recommendation.action == TradingSignal.BUY:
                for asset in portfolio.assets:
                    if asset.symbol != recommendation.symbol:
                        asset_prices = await self.market_data.get_historical_prices(asset.symbol)
                        correlation = np.corrcoef(prices[-100:], asset_prices[-100:])[0, 1]
                        if abs(correlation) > self.risk_params['max_correlation']:
                            logger.info(f"Rejected trade: high correlation with {asset.symbol}")
                            return None
            
            # Position sizing
            max_position_value = portfolio.total_value * self.risk_params['max_position_size']
            asset = next((a for a in portfolio.assets if a.symbol == recommendation.symbol), None)
            current_value = asset.total_value if asset else 0
            
            # Dynamic position sizing based on multiple factors
            volatility_scalar = 1.0 - (indicators['volatility'] / self.risk_params['max_volatility'])
            momentum_scalar = min(1.0, abs(indicators['momentum']) * 5)
            confidence_scalar = recommendation.confidence * self.risk_params['position_scaling']
            
            position_scalar = np.mean([volatility_scalar, momentum_scalar, confidence_scalar])
            adjusted_max = max_position_value * position_scalar
            
            if recommendation.action == TradingSignal.BUY:
                if current_value >= adjusted_max:
                    logger.info("Rejected trade: position size limit reached")
                    return None
                    
                # Calculate optimal position size
                max_additional = adjusted_max - current_value
                optimal_size = min(
                    max_additional,
                    portfolio.total_value * 0.05,  # Never use more than 5% of portfolio in single trade
                    volumes[-1] * prices[-1] * 0.01  # Never take more than 1% of daily volume
                )
                recommendation.quantity = min(recommendation.quantity, optimal_size / prices[-1])
                
            elif recommendation.action == TradingSignal.SELL:
                if not asset:
                    return None
                    
                # Check for stop loss or trailing stop
                current_price = prices[-1]
                purchase_price = asset.purchase_price
                high_since_purchase = max(prices[prices.index(purchase_price):])
                
                stop_loss_triggered = asset.profit_loss_percentage <= -self.risk_params['stop_loss_threshold'] * 100
                trailing_stop_triggered = (current_price <= high_since_purchase * (1 - self.risk_params['trailing_stop_distance']))
                
                if stop_loss_triggered or trailing_stop_triggered:
                    recommendation.quantity = asset.quantity  # Full position exit
                else:
                    # Partial profit taking
                    if asset.profit_loss_percentage >= self.risk_params['min_profit_taking'] * 100:
                        recommendation.quantity = min(
                            asset.quantity * 0.5,  # Take profit on at most 50% of position
                            recommendation.quantity
                        )
                    else:
                        recommendation.quantity = min(recommendation.quantity, asset.quantity)
            
            self._daily_trades.append(recommendation)
            return recommendation
            
        except Exception as e:
            logger.error(f"Error in risk management: {str(e)}")
            return None
    
    async def execute_trade(self, user_id: str, recommendation: TradeRecommendation) -> bool:
        try:
            portfolio = await self.portfolio_service.get_portfolio(user_id)
            
            if recommendation.action == TradingSignal.BUY:
                await self.portfolio_service.add_asset(user_id, PortfolioAsset(
                    symbol=recommendation.symbol,
                    quantity=recommendation.quantity,
                    purchase_price=await self.market_data.get_current_price(recommendation.symbol)
                ))
            elif recommendation.action == TradingSignal.SELL:
                # Implement sell logic here when portfolio service supports it
                pass
                
            return True
            
        except Exception as e:
            logger.error(f"Error executing trade: {str(e)}")
            return False
    
    async def detect_market_regime(self) -> Dict[str, float]:
        try:
            # Get market index, sector data, and global context
            index_prices = await self.market_data.get_historical_prices("XU100.IS")
            sector_data = await self.get_sector_momentum()
            usd_try = await self.market_data.get_historical_prices("USDTRY=X")
            
            # Enhanced market indicators with currency impact
            indicators = calculate_technical_indicators(index_prices)
            returns = np.diff(index_prices) / index_prices[:-1]
            currency_volatility = np.std(np.diff(usd_try) / usd_try[:-1]) * np.sqrt(252)
            
            # Advanced regime indicators with currency consideration
            volatility = indicators['volatility'] * (1 + currency_volatility)
            trend = indicators['trend']
            momentum = indicators['momentum']
            rsi = indicators['rsi']
            macd = indicators['macd']
            macd_signal = indicators['macd_signal']
            bollinger_pos = indicators['bollinger_position']
            
            # Enhanced market breadth analysis
            sector_strength = np.mean(list(sector_data.values()))
            sector_dispersion = np.std(list(sector_data.values()))
            market_breadth = len([v for v in sector_data.values() if v > 0]) / len(sector_data)
            
            # Advanced regime classification with Turkish market characteristics
            regimes = {
                'bullish': 0.0,
                'bearish': 0.0,
                'neutral': 0.0,
                'volatile': 0.0,
                'trending': 0.0,
                'ranging': 0.0,
                'currency_driven': 0.0
            }
            
            # Enhanced trend strength analysis with currency impact
            trend_strength = abs(trend) * (1 + abs(np.corrcoef(returns, np.diff(usd_try) / usd_try[:-1])[0,1]))
            if trend_strength > 0.05:
                if trend > 0 and rsi > 50:
                    regimes['bullish'] = min(1.0, trend_strength * 2)
                    if macd > macd_signal and market_breadth > 0.6:
                        regimes['bullish'] *= 1.3
                elif trend < 0 and rsi < 50:
                    regimes['bearish'] = min(1.0, trend_strength * 2)
                    if macd < macd_signal and market_breadth < 0.4:
                        regimes['bearish'] *= 1.3
                
                regimes['trending'] = trend_strength * (1 + sector_strength)
            
            # Enhanced volatility regime analysis with currency impact
            vol_ratio = volatility / np.mean([np.std(returns[i:i+20])*np.sqrt(252) for i in range(len(returns)-20)])
            currency_impact = currency_volatility / np.mean([np.std(np.diff(usd_try[i:i+20])/usd_try[i:i+20][:-1])*np.sqrt(252) for i in range(len(usd_try)-20)])
            
            if vol_ratio > 1.5 or currency_impact > 1.8:
                regimes['volatile'] = float(min(1.0, float((max(vol_ratio, currency_impact) - 1.5) * 2)))
                regimes['trending'] *= float(max(0.4, 1.0 - regimes['volatile']))
                if currency_impact > vol_ratio:
                    regimes['currency_driven'] = float(min(1.0, (currency_impact - vol_ratio) * 2))
            
            # Enhanced range-bound detection with sector analysis
            if abs(bollinger_pos) < 0.5 and abs(momentum) < 0.02:
                sector_consensus = float(1.0 - sector_dispersion * 2)
                ranging_score = float((1.0 - abs(momentum) * 10) * sector_consensus)
                regimes['ranging'] = ranging_score
                regimes['trending'] *= float(max(0.3, 1.0 - ranging_score))
            
            # Advanced market breadth influence with sector rotation
            if sector_strength > 0.02:
                rotation_score = sector_dispersion * market_breadth
                if rotation_score < 0.2:  # Strong sector consensus
                    regimes['trending'] *= 1.3
                    regimes['volatile'] *= 0.8
                else:  # Sector rotation
                    regimes['volatile'] *= 1.2
                    regimes['trending'] *= 0.9
            
            # Normalize regime scores
            total = sum(regimes.values()) + 1e-6
            normalized = {k: v/total for k, v in regimes.items()}
            
            # Add market metrics
            normalized.update({
                'volatility': float(volatility),
                'trend_strength': float(trend_strength),
                'momentum': float(momentum),
                'sector_strength': float(sector_strength),
                'sector_dispersion': float(sector_dispersion),
                'rsi': float(rsi),
                'volume_trend': float(indicators.get('volume_trend', 0))
            })
            
            return normalized
            
        except Exception as e:
            logger.error(f"Error detecting market regime: {str(e)}")
            return {'neutral': 1.0, 'volatility': 0.0, 'trend_strength': 0.0, 'momentum': 0.0}
    
    async def get_sector_momentum(self) -> Dict[str, float]:
        try:
            sectors = {}
            sector_returns = {}
            
            # Get all tradeable symbols
            symbols = await self.market_data.get_available_symbols()
            
            # Calculate sector momentum
            for symbol in symbols:
                sector = await self.market_data.get_sector(symbol)
                prices = await self.market_data.get_historical_prices(symbol)
                
                if len(prices) >= 60:  # Require at least 60 days of data
                    returns = (prices[-1] / prices[-60] - 1)  # 60-day return
                    if sector not in sector_returns:
                        sector_returns[sector] = []
                    sector_returns[sector].append(returns)
            
            # Calculate average sector returns
            for sector, returns in sector_returns.items():
                sectors[sector] = np.mean(returns)
            
            # Normalize to weights
            total_momentum = sum(abs(x) for x in sectors.values()) + 1e-6
            return {k: v/total_momentum for k, v in sectors.items()}
            
        except Exception as e:
            logger.error(f"Error calculating sector momentum: {str(e)}")
            return {}

    async def rebalance_portfolio(self, user_id: str, initial_weights: Optional[Dict[str, float]] = None) -> List[Dict]:
        try:
            portfolio = await self.portfolio_service.get_portfolio(user_id)
            if not portfolio or not portfolio.assets:
                return []
            
            # Get market regime, sector momentum, and risk metrics
            regime = await self.detect_market_regime()
            sector_momentum = await self.get_sector_momentum()
            
            # Calculate portfolio metrics with safe type handling
            total_value = float(portfolio.total_value or 0)
            if total_value == 0:
                return []
                
            # Initialize target weights dictionary
            target_weights: Dict[str, float] = initial_weights.copy() if initial_weights else {}
            current_weights = {
                asset.symbol: float(asset.total_value or 0) / total_value 
                for asset in portfolio.assets if asset and asset.symbol
            }
            
            # Calculate portfolio correlation matrix
            symbols = list(current_weights.keys())
            correlation_matrix = np.zeros((len(symbols), len(symbols)))
            for i, symbol1 in enumerate(symbols):
                prices1 = await self.market_data.get_historical_prices(symbol1)
                for j, symbol2 in enumerate(symbols[i:], i):
                    prices2 = await self.market_data.get_historical_prices(symbol2)
                    min_len = min(len(prices1), len(prices2))
                    correlation = np.corrcoef(prices1[-min_len:], prices2[-min_len:])[0, 1]
                    correlation_matrix[i, j] = correlation_matrix[j, i] = correlation
                    
            # Calculate portfolio diversification score
            avg_correlation = np.mean(correlation_matrix[np.triu_indices(len(symbols), k=1)])
            diversification_score = 1 - abs(avg_correlation)
            
            sector_exposures = {}
            for asset in portfolio.assets:
                sector = await self.market_data.get_sector(asset.symbol)
                if sector not in sector_exposures:
                    sector_exposures[sector] = 0
                sector_exposures[sector] += float(asset.total_value or 0) / total_value
            
            # Dynamic target weight calculation based on multiple factors
            if not target_weights:
                target_weights = {}
                available_weight = 1.0
                
                # Adjust cash position based on market regime and portfolio metrics
                if regime['volatile'] > 0.5:
                    cash_weight = 0.3 + (1 - diversification_score) * 0.2
                    available_weight -= cash_weight
                elif regime['bearish'] > 0.5:
                    cash_weight = 0.25
                    available_weight -= cash_weight
                
                # Calculate base weights considering sector momentum and correlation
                for symbol in current_weights.keys():
                    sector = await self.market_data.get_sector(symbol)
                    sector_score = sector_momentum.get(sector, 0)
                    
                    # Get symbol's average correlation with portfolio
                    symbol_idx = symbols.index(symbol)
                    avg_symbol_correlation = np.mean(correlation_matrix[symbol_idx])
                    
                    # Calculate weight components
                    momentum_factor = 1 + sector_score
                    correlation_factor = 1 - abs(avg_symbol_correlation)
                    volatility_factor = 1.0
                    
                    # Add volatility adjustment if in volatile regime
                    if regime['volatile'] > 0.3:
                        prices = await self.market_data.get_historical_prices(symbol)
                        volatility = np.std(np.diff(prices) / prices[:-1]) * np.sqrt(252)
                        volatility_factor = 1 / (1 + volatility)
                    
                    # Calculate final weight
                    raw_weight = (momentum_factor * correlation_factor * volatility_factor) / len(current_weights)
                    target_weights[symbol] = raw_weight * available_weight
                
                # Normalize weights to sum to available_weight
                if target_weights:
                    weight_sum = sum(target_weights.values())
                    if weight_sum > 0:
                        target_weights = {
                            symbol: float(weight * available_weight / weight_sum)
                            for symbol, weight in target_weights.items()
                        }
                    
                # Apply sector constraints
                for sector, exposure in sector_exposures.items():
                    if exposure > self.risk_params['sector_exposure_limit']:
                        if target_weights:
                            sector_symbols = [
                                symbol for symbol in target_weights.keys()
                                if await self.market_data.get_sector(symbol) == sector
                            ]
                            if sector_symbols:
                                excess = exposure - self.risk_params['sector_exposure_limit']
                                reduction_per_symbol = excess / len(sector_symbols)
                                
                                # Reduce weights of overexposed sector
                                for symbol in sector_symbols:
                                    if symbol in target_weights:
                                        target_weights[symbol] = max(0.01, target_weights[symbol] - reduction_per_symbol)
                                
                                # Redistribute excess weight to other sectors
                                other_symbols = [s for s in target_weights.keys() if s not in sector_symbols]
                                if other_symbols:
                                    addition_per_symbol = excess / len(other_symbols)
                                    for symbol in other_symbols:
                                        if symbol in target_weights:
                                            target_weights[symbol] += addition_per_symbol
                
                # Final normalization
                if target_weights:
                    weight_sum = sum(target_weights.values())
                    if weight_sum > 0:
                        target_weights = {
                            symbol: weight / weight_sum 
                            for symbol, weight in target_weights.items()
                        }
            elif regime['bullish'] > 0.5 or regime['bearish'] > 0.5:
                # In trending regimes, overweight momentum sectors
                target_weights = {}
                for asset in portfolio.assets:
                    sector = await self.market_data.get_sector(asset.symbol)
                    sector_score = sector_momentum.get(sector, 0)
                    target_weights[asset.symbol] = (1.0 + sector_score) / len(portfolio.assets)
            else:
                # In neutral regimes, use equal weights
                target_weights = {
                    symbol: 1.0 / len(portfolio.assets)
                    for symbol in current_weights.keys()
                }
            
            # Execute rebalancing trades
            results = []
            for symbol, target_weight in target_weights.items():
                current_weight = current_weights.get(symbol, 0.0)
                weight_diff = target_weight - current_weight
                
                # Only rebalance if difference exceeds threshold
                if abs(weight_diff) > 0.01:  # 1% threshold
                    asset = next((a for a in portfolio.assets if a.symbol == symbol), None)
                    current_price = await self.market_data.get_current_price(symbol)
                    
                    # Check sector exposure limits
                    sector = await self.market_data.get_sector(symbol)
                    if sector_exposures.get(sector, 0) + weight_diff > self.risk_params['sector_exposure_limit']:
                        continue
                    
                    action = TradingSignal.BUY if weight_diff > 0 else TradingSignal.SELL
                    quantity = abs(weight_diff * total_value / current_price)
                    
                    # Create trade recommendation
                    recommendation = TradeRecommendation(
                        symbol=symbol,
                        action=action,
                        quantity=quantity,
                        confidence=0.9  # High confidence for rebalancing
                    )
                    
                    # Apply risk management and execute trade
                    filtered_rec = await self.apply_risk_management(portfolio, recommendation)
                    if filtered_rec and await self.execute_trade(user_id, filtered_rec):
                        results.append({
                            "symbol": filtered_rec.symbol,
                            "action": filtered_rec.action,
                            "quantity": filtered_rec.quantity,
                            "type": "rebalance",
                            "regime": max(regime.items(), key=lambda x: x[1])[0],
                            "sector_score": sector_momentum.get(sector, 0),
                            "timestamp": filtered_rec.timestamp.isoformat()
                        })
                        
                        # Update sector exposure tracking
                        if action == TradingSignal.BUY:
                            sector_exposures[sector] = sector_exposures.get(sector, 0) + weight_diff
                        else:
                            sector_exposures[sector] = sector_exposures.get(sector, 0) - weight_diff
            
            return results
            
        except Exception as e:
            logger.error(f"Error in portfolio rebalancing: {str(e)}")
            return []

    async def run_trading_cycle(self, user_id: str, rebalance_threshold: float = 0.1) -> List[Dict]:
        try:
            portfolio = await self.portfolio_service.get_portfolio(user_id)
            results = []
            
            # Enhanced market regime and portfolio analysis
            regime = await self.detect_market_regime()
            sector_momentum = await self.get_sector_momentum()
            
            # Advanced risk adjustment based on market conditions
            volatility_factor = regime.get('volatile', 0)
            trend_factor = regime.get('trending', 0)
            sector_strength = np.mean(list(sector_momentum.values()))
            market_breadth = np.std(list(sector_momentum.values()))
            
            # Dynamic risk scaling based on market conditions
            risk_scale = (1.0 - volatility_factor * 0.4) * (1.0 + trend_factor * 0.2)
            if sector_strength > 0.05:
                risk_scale *= (1.0 + sector_strength * 0.3)
            if market_breadth > 0.1:
                risk_scale *= 0.8  # Reduce risk when sectors are diverging
            
            # Enhanced adaptive risk management
            self.risk_params['max_position_size'] *= risk_scale
            self.risk_params['stop_loss_threshold'] *= (1.0 - volatility_factor * 0.3)
            self.risk_params['trailing_stop_distance'] *= (1.0 - volatility_factor * 0.25)
            self.risk_params['min_confidence_threshold'] *= (1.0 + volatility_factor * 0.25)
            self.risk_params['sector_exposure_limit'] *= (1.0 - market_breadth * 0.3)
            self.risk_params['max_correlation'] *= (1.0 - sector_strength * 0.2)
            self.risk_params['momentum_threshold'] *= (1.0 + trend_factor * 0.3)
            self.risk_params['volume_factor'] *= (1.0 + volatility_factor * 0.4)
            
            # Adjust rebalancing threshold based on market conditions
            if volatility_factor > 0.5:
                rebalance_threshold *= 0.7  # More frequent rebalancing in volatile markets
            elif trend_factor > 0.5:
                rebalance_threshold *= 1.3  # Less frequent rebalancing in trending markets
                
            # Calculate portfolio metrics
            if portfolio.assets:
                total_value = float(portfolio.total_value or 0)
                if total_value > 0:
                    current_weights = {
                        asset.symbol: float(asset.total_value or 0) / total_value 
                        for asset in portfolio.assets if asset.symbol
                    }
                    
                    # Calculate sector exposures
                    sector_exposures = {}
                    for asset in portfolio.assets:
                        sector = await self.market_data.get_sector(asset.symbol)
                        if sector not in sector_exposures:
                            sector_exposures[sector] = 0
                        sector_exposures[sector] += float(asset.total_value or 0) / total_value
            
            # Check if rebalancing is needed
            if portfolio.assets:
                total_value = float(portfolio.total_value or 0)
                if total_value > 0:
                    current_weights = {
                        asset.symbol: float(asset.total_value or 0) / total_value 
                        for asset in portfolio.assets if asset.symbol
                    }
                
                # Calculate advanced portfolio metrics
                target_weights = {}
                total_momentum = 0
                
                # Calculate target weights based on sector momentum and market regime
                for asset in portfolio.assets:
                    sector = await self.market_data.get_sector(asset.symbol)
                    sector_score = sector_momentum.get(sector, 0)
                    
                    # Dynamic weight calculation
                    base_weight = 1.0 / len(portfolio.assets)
                    momentum_adj = sector_score * 0.2  # Adjust weight by sector momentum
                    regime_adj = 0.0
                    
                    if trend_factor > 0.5:
                        regime_adj = momentum_adj  # Amplify momentum in trending markets
                    elif volatility_factor > 0.5:
                        regime_adj = -abs(momentum_adj)  # Reduce exposure in volatile markets
                        
                    target_weights[asset.symbol] = max(0.05, min(0.4, base_weight + momentum_adj + regime_adj))
                    total_momentum += abs(momentum_adj)
                
                # Normalize target weights
                weight_sum = sum(target_weights.values())
                target_weights = {k: v/weight_sum for k, v in target_weights.items()}
                
                # Calculate portfolio imbalance score with momentum consideration
                imbalance_score = sum(
                    abs(current_weights.get(symbol, 0) - target_weights[symbol])
                    for symbol in target_weights
                ) / 2
                
                # Adjust imbalance threshold based on market momentum
                momentum_factor = min(1.5, 1.0 + total_momentum)
                imbalance_threshold = rebalance_threshold * momentum_factor
                
                if imbalance_score > imbalance_threshold:
                    rebalance_results = await self.rebalance_portfolio(user_id, target_weights)
                    results.extend(rebalance_results)
            
            # Enhanced trading analysis with sector rotation
            tradeable_assets = []
            for asset in portfolio.assets:
                sector = await self.market_data.get_sector(asset.symbol)
                sector_score = sector_momentum.get(sector, 0)
                
                # Skip assets in weak sectors during volatile markets
                if volatility_factor > 0.5 and sector_score < -0.05:
                    continue
                    
                signal, confidence = await self.analyze_asset(asset.symbol)
                
                # Adjust confidence based on sector momentum
                adjusted_confidence = confidence * (1.0 + sector_score)
                
                if signal != TradingSignal.HOLD:
                    # Dynamic position sizing based on multiple factors
                    position_scale = 1.0
                    if signal == TradingSignal.BUY:
                        position_scale *= (1.0 + sector_score)  # Larger positions in strong sectors
                        if trend_factor > 0.5:
                            position_scale *= 1.2  # More aggressive in trending markets
                    elif signal == TradingSignal.SELL:
                        position_scale *= (1.0 - sector_score)  # Faster exits in weak sectors
                        if volatility_factor > 0.5:
                            position_scale *= 1.3  # Faster exits in volatile markets
                            
                    quantity = asset.quantity if signal == TradingSignal.SELL else asset.quantity * position_scale * 0.5
                    
                    recommendation = TradeRecommendation(
                        symbol=asset.symbol,
                        action=signal,
                        quantity=quantity,
                        confidence=adjusted_confidence
                    )
                    
                    filtered_rec = await self.apply_risk_management(portfolio, recommendation)
                    if filtered_rec and await self.execute_trade(user_id, filtered_rec):
                        results.append({
                            "symbol": filtered_rec.symbol,
                            "action": filtered_rec.action,
                            "quantity": filtered_rec.quantity,
                            "confidence": filtered_rec.confidence,
                            "type": "trade",
                            "timestamp": filtered_rec.timestamp.isoformat()
                        })
            
            return results
            
        except Exception as e:
            logger.error(f"Error in trading cycle: {str(e)}")
            return []
