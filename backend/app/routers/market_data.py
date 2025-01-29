from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime
from ..features import Asset, AssetType
from ..services.market_data import MarketDataService

router = APIRouter(prefix="/market-data", tags=["market-data"])

@router.get("/stock/{symbol}", response_model=Asset)
async def get_stock_data(symbol: str):
    try:
        asset = await MarketDataService.get_asset_data(symbol)
        if not asset:
            raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")
        return asset
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/assets/{symbol}", response_model=Asset)
async def get_asset_data(symbol: str):
    try:
        return await MarketDataService.get_asset_data(symbol)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/search", response_model=List[Asset])
async def search_assets(query: str, type: Optional[AssetType] = None):
    try:
        assets = await MarketDataService.search_assets(query, type)
        if not assets:
            return []
        return assets
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
