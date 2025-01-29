from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from ..features import Portfolio, PortfolioAsset
from .autonomous_trading import AutonomousTradingService, TradingSignal, TradeRecommendation
from .market_data import MarketDataService

class BacktestResult:
    def __init__(self):
        self.trades: List[Dict] = []
        self.portfolio_values: List[float] = []
        self.returns: List[float] = []
        self.dates: List[datetime] = []
        
    def calculate_metrics(self) -> Dict[str, float]:
        if not self.returns:
            return {}
            
        returns = np.array(self.returns)
        portfolio_values = np.array(self.portfolio_values)
        
        # Calculate key metrics
        total_return = (portfolio_values[-1] / portfolio_values[0] - 1) * 100
        daily_returns = np.diff(portfolio_values) / portfolio_values[:-1]
        
        volatility = np.std(daily_returns) * np.sqrt(252)
        sharpe_ratio = np.mean(daily_returns) / np.std(daily_returns) * np.sqrt(252)
        
        drawdowns = np.maximum.accumulate(portfolio_values) - portfolio_values
        max_drawdown = np.max(drawdowns / np.maximum.accumulate(portfolio_values)) * 100
        
        win_trades = len([t for t in self.trades if t.get('pnl', 0) > 0])
        total_trades = len(self.trades)
        
        return {
            'total_return_pct': float(total_return),
            'annualized_volatility_pct': float(volatility * 100),
            'sharpe_ratio': float(sharpe_ratio),
            'max_drawdown_pct': float(max_drawdown),
            'win_rate_pct': float(win_trades / total_trades * 100) if total_trades > 0 else 0,
            'total_trades': total_trades
        }

class BacktestingService:
    def __init__(self, start_date: datetime, end_date: datetime, initial_capital: float = 1000000):
        self.start_date = start_date
        self.end_date = end_date
        self.initial_capital = initial_capital
        self.market_data = MarketDataService()
        
    async def simulate_market_data(self, symbol: str, date: datetime) -> Dict[str, Any]:
        try:
            base_price = (await self.market_data.get_asset_data(symbol)).current_price
            # Generate synthetic price data based on date
            days_from_start = (date - self.start_date).days
            trend = 0.0001 * days_from_start  # Slight upward trend
            noise = np.random.normal(0, 0.02)  # Daily volatility
            price = base_price * (1 + trend + noise)
            
            return {
                'symbol': symbol,
                'price': price,
                'volume': np.random.randint(500000, 2000000),
                'date': date
            }
        except Exception as e:
            raise ValueError(f"Error simulating market data: {str(e)}")
    
    async def run_backtest(
        self,
        symbols: List[str],
        strategy_params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, float]:
        try:
            result = BacktestResult()
            trading_service = AutonomousTradingService(risk_params=strategy_params)
            
            # Initialize portfolio
            portfolio = Portfolio(
                user_id="backtest",
                assets=[],
                total_value=self.initial_capital,
                risk_score=0.0,
                last_updated=self.start_date
            )
            
            current_date = self.start_date
            while current_date <= self.end_date:
                if current_date.weekday() < 5:  # Only trade on weekdays
                    # Update market data
                    for symbol in symbols:
                        market_data = await self.simulate_market_data(symbol, current_date)
                        
                        # Update portfolio values
                        for asset in portfolio.assets:
                            if asset.symbol == symbol:
                                old_value = asset.total_value
                                asset.current_price = market_data['price']
                                new_value = float(asset.quantity or 0) * float(market_data['price'])
                                asset.total_value = new_value
                                asset.profit_loss = new_value - (float(asset.quantity or 0) * float(asset.purchase_price or 0))
                                result.returns.append((new_value - float(old_value or 0)) / float(old_value or 1))
                    
                    # Run trading cycle
                    trades = await trading_service.run_trading_cycle("backtest")
                    for trade in trades:
                        trade['date'] = current_date
                        result.trades.append(trade)
                    
                    # Record portfolio state
                    portfolio.total_value = sum(float(asset.total_value or 0) for asset in portfolio.assets)
                    result.portfolio_values.append(portfolio.total_value)
                    result.dates.append(current_date)
                
                current_date += timedelta(days=1)
            
            return result.calculate_metrics()
            
        except Exception as e:
            raise ValueError(f"Backtest failed: {str(e)}")
