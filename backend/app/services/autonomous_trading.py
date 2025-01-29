from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging
import numpy as np
from ..features import Portfolio, PortfolioAsset, Asset, PricePrediction
from ..services.market_data import MarketDataService
from ..services.portfolio import PortfolioService
from ..models.model_manager import ModelManager

def calculate_technical_indicators(prices: List[float]) -> Dict[str, float]:
    prices = np.array(prices)
    returns = np.diff(prices) / prices[:-1]
    
    sma_5 = np.mean(prices[-5:])
    sma_20 = np.mean(prices[-20:])
    
    volatility = np.std(returns) * np.sqrt(252)  # Annualized volatility
    momentum = (prices[-1] / prices[-5] - 1) if len(prices) >= 5 else 0
    
    return {
        "sma_5": float(sma_5),
        "sma_20": float(sma_20),
        "volatility": float(volatility),
        "momentum": float(momentum),
        "trend": float(sma_5 / sma_20 - 1) if len(prices) >= 20 else 0
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
            'max_position_size': 0.2,
            'stop_loss_threshold': 0.05,
            'max_daily_drawdown': 0.03,
            'min_confidence_threshold': 0.7,
            'max_volatility': 0.4,
            'min_liquidity': 1000000,
            'max_trades_per_day': 5,
            'position_scaling': 0.5
        }
        
        self.risk_params = {**default_params, **(risk_params or {})}
        self._daily_trades = []
        self._daily_pnl = 0.0
    
    async def analyze_asset(self, symbol: str) -> Tuple[str, float]:
        try:
            # Get historical data and calculate indicators
            prices = await self.market_data.get_historical_prices(symbol)
            indicators = calculate_technical_indicators(prices)
            
            # Get price prediction
            prediction = self.model_manager.get_price_model().predict(prices)
            predicted_return = (prediction - prices[-1]) / prices[-1]
            
            # Get latest news sentiment
            news = await self.market_data.get_latest_news(symbol)
            if news:
                sentiment = self.model_manager.get_sentiment_model().analyze_text(news)
                sentiment_score = sentiment.get('positive', 0) - sentiment.get('negative', 0)
            else:
                sentiment_score = 0
            
            # Combine multiple signals
            signal_weights = {
                'prediction': 0.4,
                'sentiment': 0.2,
                'trend': 0.2,
                'momentum': 0.2
            }
            
            combined_score = (
                signal_weights['prediction'] * predicted_return +
                signal_weights['sentiment'] * sentiment_score +
                signal_weights['trend'] * indicators['trend'] +
                signal_weights['momentum'] * indicators['momentum']
            )
            
            # Apply volatility adjustment
            volatility_factor = 1.0 / (1.0 + indicators['volatility'])
            adjusted_score = combined_score * volatility_factor
            
            # Generate signal with confidence
            confidence = abs(adjusted_score)
            
            if adjusted_score > 0.015 and indicators['trend'] > 0:
                return TradingSignal.BUY, confidence
            elif adjusted_score < -0.015 and indicators['trend'] < 0:
                return TradingSignal.SELL, confidence
            return TradingSignal.HOLD, 0
            
        except Exception as e:
            logger.error(f"Error analyzing asset {symbol}: {str(e)}")
            return TradingSignal.HOLD, 0
    
    async def apply_risk_management(self, portfolio: Portfolio, recommendation: TradeRecommendation) -> Optional[TradeRecommendation]:
        try:
            if recommendation.confidence < self.risk_params['min_confidence_threshold']:
                logger.info(f"Rejected trade: confidence {recommendation.confidence} below threshold")
                return None
            
            today = datetime.now().date()
            self._daily_trades = [t for t in self._daily_trades if t.timestamp.date() == today]
            if len(self._daily_trades) >= self.risk_params['max_trades_per_day']:
                logger.info("Rejected trade: daily trade limit reached")
                return None
            
            if self._daily_pnl < -portfolio.total_value * self.risk_params['max_daily_drawdown']:
                logger.info("Rejected trade: daily drawdown limit reached")
                return None
            
            prices = await self.market_data.get_historical_prices(recommendation.symbol)
            indicators = calculate_technical_indicators(prices)
            if indicators['volatility'] > self.risk_params['max_volatility']:
                logger.info(f"Rejected trade: volatility {indicators['volatility']} above threshold")
                return None
            
            max_position_value = portfolio.total_value * self.risk_params['max_position_size']
            asset = next((a for a in portfolio.assets if a.symbol == recommendation.symbol), None)
            current_value = asset.total_value if asset else 0
            
            confidence_scalar = recommendation.confidence * self.risk_params['position_scaling']
            adjusted_max = max_position_value * confidence_scalar
            
            if recommendation.action == TradingSignal.BUY:
                if current_value >= adjusted_max:
                    logger.info("Rejected trade: position size limit reached")
                    return None
                max_additional = adjusted_max - current_value
                recommendation.quantity = min(recommendation.quantity, max_additional)
                
            elif recommendation.action == TradingSignal.SELL:
                if not asset:
                    return None
                if asset.profit_loss_percentage <= -self.risk_params['stop_loss_threshold'] * 100:
                    recommendation.quantity = asset.quantity
                else:
                    recommendation.quantity = min(recommendation.quantity, asset.quantity)
            
            self._daily_trades.append(recommendation)
            return recommendation
            
        except Exception as e:
            logger.error(f"Error in risk management: {str(e)}")
            return None
            
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
    
    async def rebalance_portfolio(self, user_id: str, target_weights: Optional[Dict[str, float]] = None) -> List[Dict]:
        try:
            portfolio = await self.portfolio_service.get_portfolio(user_id)
            if not portfolio.assets:
                return []
            
            # Calculate current weights
            total_value = portfolio.total_value
            current_weights = {
                asset.symbol: asset.total_value / total_value 
                for asset in portfolio.assets
            }
            
            # Use default weights if none provided (equal weight)
            if not target_weights:
                target_weights = {
                    symbol: 1.0 / len(portfolio.assets)
                    for symbol in current_weights.keys()
                }
            
            results = []
            for symbol, target_weight in target_weights.items():
                current_weight = current_weights.get(symbol, 0.0)
                weight_diff = target_weight - current_weight
                
                if abs(weight_diff) > 0.01:  # 1% threshold for rebalancing
                    asset = next((a for a in portfolio.assets if a.symbol == symbol), None)
                    current_price = await self.market_data.get_current_price(symbol)
                    
                    action = TradingSignal.BUY if weight_diff > 0 else TradingSignal.SELL
                    quantity = abs(weight_diff * total_value / current_price)
                    
                    recommendation = TradeRecommendation(
                        symbol=symbol,
                        action=action,
                        quantity=quantity,
                        confidence=1.0  # High confidence for rebalancing
                    )
                    
                    filtered_rec = await self.apply_risk_management(portfolio, recommendation)
                    if filtered_rec and await self.execute_trade(user_id, filtered_rec):
                        results.append({
                            "symbol": filtered_rec.symbol,
                            "action": filtered_rec.action,
                            "quantity": filtered_rec.quantity,
                            "type": "rebalance",
                            "timestamp": filtered_rec.timestamp.isoformat()
                        })
            
            return results
            
        except Exception as e:
            logger.error(f"Error in portfolio rebalancing: {str(e)}")
            return []

    async def run_trading_cycle(self, user_id: str, rebalance_threshold: float = 0.1) -> List[Dict]:
        try:
            portfolio = await self.portfolio_service.get_portfolio(user_id)
            results = []
            
            # Check if rebalancing is needed
            if portfolio.assets:
                total_value = portfolio.total_value
                max_weight = max(asset.total_value / total_value for asset in portfolio.assets)
                if max_weight > (1.0 / len(portfolio.assets)) * (1 + rebalance_threshold):
                    rebalance_results = await self.rebalance_portfolio(user_id)
                    results.extend(rebalance_results)
            
            # Regular trading analysis
            for asset in portfolio.assets:
                signal, confidence = await self.analyze_asset(asset.symbol)
                
                if signal != TradingSignal.HOLD:
                    recommendation = TradeRecommendation(
                        symbol=asset.symbol,
                        action=signal,
                        quantity=asset.quantity if signal == TradingSignal.SELL else asset.quantity * 0.5,
                        confidence=confidence
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
