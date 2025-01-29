from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
from ..features import Portfolio, PortfolioAsset
from ..services.portfolio import PortfolioService

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.post("")
async def create_portfolio(portfolio: Portfolio):
    try:
        if not portfolio.user_id:
            raise ValueError("user_id is required")
        return await PortfolioService.create_portfolio(portfolio)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{user_id}/assets")
async def add_asset(user_id: str, asset: PortfolioAsset):
    try:
        return await PortfolioService.add_asset(user_id, asset)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{user_id}")
async def get_portfolio(user_id: str):
    try:
        return await PortfolioService.get_portfolio(user_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{user_id}/risk")
async def get_risk_analysis(user_id: str):
    try:
        portfolio = await PortfolioService.get_portfolio(user_id)
        risk_analysis = await PortfolioService.get_risk_analysis(user_id)
        
        # Calculate portfolio metrics
        total_value = sum(asset.total_value or 0 for asset in portfolio.assets)
        asset_weights = [(asset.total_value or 0) / total_value if total_value > 0 else 0 for asset in portfolio.assets]
        
        return {
            "portfolio_risk_score": risk_analysis.risk_score,
            "total_value": total_value,
            "diversification_score": len(portfolio.assets) / 10 if len(portfolio.assets) <= 10 else 1.0,
            "asset_weights": dict(zip([asset.symbol for asset in portfolio.assets], asset_weights)),
            "recommendations": [
                "Portföy çeşitlendirmesi önerilir" if len(portfolio.assets) < 5 else "Portföy çeşitlendirmesi yeterli",
                "Risk seviyesi uygun" if 0.3 <= risk_analysis.risk_score <= 0.7 else "Risk seviyesi gözden geçirilmeli"
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
