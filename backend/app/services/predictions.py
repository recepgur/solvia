from datetime import datetime
import numpy as np
import yfinance as yf
from typing import List
from ..features import PricePrediction, NewsAnalysis
from ..models.price_prediction.lstm_model import PricePredictionModel
from ..models.sentiment_analysis.sentiment_model import SentimentAnalysisModel

from ..models.model_manager import ModelManager

class PredictionService:
    _model_manager = ModelManager()
    _price_model = _model_manager.get_price_model()
    _sentiment_model = _model_manager.get_sentiment_model()

    @staticmethod
    async def get_price_prediction(symbol: str) -> PricePrediction:
        try:
            # Add .IS suffix for Turkish stocks
            ticker_symbol = f"{symbol}.IS" if not symbol.endswith('.IS') else symbol
            ticker = yf.Ticker(ticker_symbol)
            hist = ticker.history(period='60d')
            
            if len(hist) < 30:
                raise ValueError(f"Insufficient historical data for {symbol}")
            
            prices = hist['Close'].values.tolist()
            current_price = prices[-1]
            historical_prices = prices[-30:]  # Last 30 days
            
            # Validate data
            if not all(isinstance(p, (int, float)) and p > 0 for p in prices):
                raise ValueError(f"Invalid price data received for {symbol}")
            
            # Calculate returns for normalization
            returns = np.diff(prices) / prices[:-1]
            mean_return = np.mean(returns)
            std_return = np.std(returns)
            
            # Get relative price change prediction with normalization
            try:
                price_change = PredictionService._price_model.predict(prices)
                price_change = np.clip(price_change, mean_return - 2*std_return, mean_return + 2*std_return)
                predicted_price = current_price * (1 + price_change)
                confidence = 0.8
            except Exception as model_error:
                # Fallback to trend-based prediction if model fails
                price_change = mean_return
                predicted_price = current_price * (1 + price_change)
                confidence = 0.5
            
            # Calculate prediction factors
            volatility = float(np.std(prices[-10:]) / np.mean(prices[-10:]))
            trend = float((np.mean(prices[-5:]) - np.mean(prices[-30:-25])) / np.mean(prices[-30:-25]))
            volume_change = float((hist['Volume'].iloc[-1] - hist['Volume'].iloc[-5]) / hist['Volume'].iloc[-5])
            
            return PricePrediction(
                asset_symbol=symbol,
                predicted_price=float(predicted_price),  # Ensure float type
                confidence=confidence,
                prediction_date=datetime.now(),
                horizon="1d",
                historical_prices=[float(p) for p in historical_prices],  # Ensure float type
                prediction_factors={
                    "trend": max(min(trend, 1.0), -1.0),
                    "volatility": min(volatility, 1.0),
                    "volume_change": max(min(volume_change, 1.0), -1.0)
                }
            )
        except Exception as e:
            # Return a more informative fallback prediction
            try:
                last_price = float(hist['Close'].iloc[-1]) if len(hist) > 0 else 100.0
            except:
                last_price = 100.0
                
            return PricePrediction(
                asset_symbol=symbol,
                predicted_price=last_price,
                confidence=0.3,  # Lower confidence for fallback
                prediction_date=datetime.now(),
                horizon="1d",
                historical_prices=[last_price] * 30,
                prediction_factors={
                    "trend": 0.0,
                    "volatility": 0.0,
                    "volume_change": 0.0
                }
            )
    
    @staticmethod
    async def analyze_news(text: str) -> NewsAnalysis:
        try:
            sentiment_scores = PredictionService._sentiment_model.analyze_text(text)
            
            # Calculate overall sentiment score (-1 to 1)
            sentiment_score = sentiment_scores['positive'] - sentiment_scores['negative']
            
            # Extract keywords (improved version)
            words = text.split()
            keywords = []
            for word in words:
                # Only consider words that are all uppercase and contain at least one letter
                if word.isupper() and any(c.isalpha() for c in word) and len(word) >= 2:
                    keywords.append(word)
            
            return NewsAnalysis(
                title=text[:100],
                source="News Source",
                published_date=datetime.now(),
                sentiment_score=sentiment_score,
                relevance_score=0.8,
                affected_assets=keywords[:5] if keywords else ["THYAO", "GARAN"],
                raw_sentiment={
                    'positive': sentiment_scores['positive'],
                    'neutral': sentiment_scores['neutral'],
                    'negative': sentiment_scores['negative']
                },
                keywords=keywords[:10] if keywords else None
            )
        except Exception as e:
            raise ValueError(f"Failed to analyze news: {str(e)}")
