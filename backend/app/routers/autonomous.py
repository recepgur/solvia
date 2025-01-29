from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from ..services.autonomous_trading import AutonomousTradingService
from ..services.backtesting import BacktestingService

router = APIRouter(prefix="/autonomous", tags=["autonomous"])

from pydantic import BaseModel

class TradeRequest(BaseModel):
    user_id: str

@router.post("/trade")
async def run_trading_cycle(request: TradeRequest):
    try:
        trading_service = AutonomousTradingService()
        return await trading_service.run_trading_cycle(request.user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class RebalanceRequest(BaseModel):
    user_id: str
    target_weights: Optional[Dict[str, float]] = None

@router.post("/rebalance")
async def rebalance_portfolio(request: RebalanceRequest):
    try:
        trading_service = AutonomousTradingService()
        return await trading_service.rebalance_portfolio(request.user_id, request.target_weights)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class BacktestRequest(BaseModel):
    symbols: List[str]
    start_date: datetime
    end_date: datetime
    initial_capital: float = 1000000
    strategy_params: Optional[Dict[str, float]] = None

@router.post("/backtest")
async def run_backtest(request: BacktestRequest):
    try:
        backtesting_service = BacktestingService(
            start_date=request.start_date,
            end_date=request.end_date,
            initial_capital=request.initial_capital
        )
        return await backtesting_service.run_backtest(request.symbols, request.strategy_params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
