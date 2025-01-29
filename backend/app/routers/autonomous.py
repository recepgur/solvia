from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from ..services.autonomous_trading import AutonomousTradingService
from ..services.backtesting import BacktestingService

router = APIRouter(prefix="/autonomous", tags=["autonomous"])

@router.post("/trade")
async def run_trading_cycle(user_id: str):
    try:
        trading_service = AutonomousTradingService()
        return await trading_service.run_trading_cycle(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rebalance")
async def rebalance_portfolio(
    user_id: str,
    target_weights: Optional[Dict[str, float]] = None
):
    try:
        trading_service = AutonomousTradingService()
        return await trading_service.rebalance_portfolio(user_id, target_weights)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/backtest")
async def run_backtest(
    symbols: List[str],
    start_date: datetime,
    end_date: datetime,
    initial_capital: float = 1000000,
    strategy_params: Optional[Dict[str, float]] = None
):
    try:
        backtesting_service = BacktestingService(
            start_date=start_date,
            end_date=end_date,
            initial_capital=initial_capital
        )
        return await backtesting_service.run_backtest(symbols, strategy_params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
