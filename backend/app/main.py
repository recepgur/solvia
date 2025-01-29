from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
from datetime import datetime
import yfinance as yf
from .features import PricePrediction, NewsAnalysis, Alert
import numpy as np
from .services.predictions import PredictionService
from .services.alerts import AlertService
from .routers import (
    portfolio, market_data, predictions, news,
    alerts, training, feedback, autonomous
)

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(portfolio.router)
app.include_router(market_data.router)
app.include_router(predictions.router)
app.include_router(news.router)
app.include_router(alerts.router)
app.include_router(training.router)
app.include_router(feedback.router)
app.include_router(autonomous.router)

@app.get("/healthz")
async def health_check():
    return {"status": "ok"}

@app.get("/market-data/search")
async def search_assets(query: str = ""):
    return [{
        "symbol": "THYAO",
        "type": "stock",
        "name": "Türk Hava Yolları",
        "current_price": 238.26,
        "change_24h": 2.5,
        "volume": 1234567,
        "last_updated": datetime.now().isoformat()
    }]

@app.post("/portfolio")
async def create_portfolio(portfolio: dict):
    return portfolio

@app.post("/news/analyze", response_model=NewsAnalysis)
async def analyze_news(text: dict):
    try:
        return await PredictionService.analyze_news(text["text"])
    except Exception as e:
        logger.error(f"Error analyzing news: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/alerts", response_model=Alert)
async def create_alert(alert: Alert):
    try:
        return await AlertService.create_alert(alert.user_id, alert)
    except Exception as e:
        logger.error(f"Error creating alert: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predictions/price/{symbol}")
async def get_price_prediction(symbol: str):
    try:
        # Add .IS suffix for Turkish stocks if not present
        ticker_symbol = f"{symbol}.IS" if not symbol.endswith('.IS') else symbol
        ticker = yf.Ticker(ticker_symbol)
        hist = ticker.history(period='60d')
        
        if len(hist) < 30:
            raise HTTPException(status_code=400, detail=f"Insufficient historical data for {symbol}")
        
        prices = hist['Close'].values.tolist()
        current_price = prices[-1]
        
        # Simple moving average prediction for now
        predicted_price = np.mean(prices[-5:]) * (1 + np.random.normal(0, 0.01))
        
        return PricePrediction(
            asset_symbol=symbol,
            predicted_price=float(predicted_price),
            confidence=0.7,
            prediction_date=datetime.now(),
            horizon="1d",
            historical_prices=[float(p) for p in prices[-30:]],
            prediction_factors={
                "trend": float((np.mean(prices[-5:]) - np.mean(prices[-30:-25])) / np.mean(prices[-30:-25])),
                "volatility": float(np.std(prices[-10:]) / np.mean(prices[-10:])),
                "volume_change": float((hist['Volume'].iloc[-1] - hist['Volume'].iloc[-5]) / hist['Volume'].iloc[-5])
            }
        )
    except Exception as e:
        logger.error(f"Error predicting price for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
