from typing import List, Optional
from datetime import datetime
import logging
from ..features import Portfolio, PortfolioAsset

logger = logging.getLogger(__name__)

class PortfolioService:
    _portfolios = {}  # In-memory storage for testing

    @staticmethod
    async def create_portfolio(portfolio: Portfolio) -> Portfolio:
        try:
            PortfolioService._portfolios[portfolio.user_id] = portfolio
            return portfolio
        except Exception as e:
            logger.error(f"Error creating portfolio: {str(e)}")
            raise ValueError(f"Failed to create portfolio: {str(e)}")

    @staticmethod
    async def get_portfolio(user_id: str) -> Portfolio:
        portfolio = PortfolioService._portfolios.get(user_id)
        if not portfolio:
            portfolio = Portfolio(user_id=user_id)
            PortfolioService._portfolios[user_id] = portfolio
        return portfolio

    @staticmethod
    async def add_asset(user_id: str, asset: PortfolioAsset) -> Portfolio:
        portfolio = await PortfolioService.get_portfolio(user_id)
        if not portfolio:
            raise ValueError(f"Portfolio not found for user {user_id}")
        
        # Calculate asset values
        asset.total_value = asset.quantity * asset.current_price if asset.current_price else asset.quantity * asset.purchase_price
        asset.profit_loss = asset.total_value - (asset.quantity * asset.purchase_price)
        asset.profit_loss_percentage = (asset.profit_loss / (asset.quantity * asset.purchase_price)) * 100
        
        portfolio.assets.append(asset)
        portfolio.total_value = sum(a.total_value or 0 for a in portfolio.assets)
        portfolio.last_updated = datetime.now()
        return portfolio

    @staticmethod
    async def get_risk_analysis(user_id: str) -> Portfolio:
        return await PortfolioService.get_portfolio(user_id)
