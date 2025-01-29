from fastapi import APIRouter, HTTPException
from typing import List
from ..features import PricePrediction
from ..services.predictions import PredictionService

router = APIRouter(prefix="/predictions", tags=["predictions"])

@router.get("/price/{symbol}", response_model=PricePrediction)
async def get_price_predictions(symbol: str):
    try:
        return await PredictionService.get_price_prediction(symbol)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/news-sentiment/{symbol}")
async def get_news_sentiment(symbol: str):
    # TODO: Implement news sentiment analysis
    raise HTTPException(status_code=501, detail="Not implemented yet")
