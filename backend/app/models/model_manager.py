from pathlib import Path
import os
from typing import Dict, Optional, List
from pathlib import Path
from .price_prediction.lstm_model import PricePredictionModel
from .sentiment_analysis.sentiment_model import SentimentAnalysisModel, ModelMetrics
import logging
import os
import torch

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def ensure_model_dir(path: Path) -> None:
    """Ensure model directory exists and is writable."""
    path.mkdir(parents=True, exist_ok=True)
    if not os.access(path, os.W_OK):
        raise PermissionError(f"No write access to model directory: {path}")

class ModelManager:
    def __init__(self, base_path: Optional[str] = None):
        if base_path is None:
            base_path = str(Path.home() / ".finance_app" / "models")
        self.base_path = Path(base_path)
        self.price_model_path = self.base_path / "price_prediction"
        self.sentiment_model_path = self.base_path / "sentiment_analysis"
        
        # Ensure model directories exist and are writable
        ensure_model_dir(self.price_model_path)
        ensure_model_dir(self.sentiment_model_path)
        
        # Initialize models
        self.price_model = PricePredictionModel(
            model_path=str(self.price_model_path / "model.pt") if (self.price_model_path / "model.pt").exists() else None
        )
        self.sentiment_model = SentimentAnalysisModel(
            model_path=str(self.sentiment_model_path) if (self.sentiment_model_path / "pytorch_model.bin").exists() else None
        )
    
    def save_models(self) -> None:
        self.price_model.save_model(str(self.price_model_path / "model.pt"))
        self.sentiment_model.save_model(str(self.sentiment_model_path))
    
    def train_price_model(self, prices: List[float], **kwargs) -> Dict[str, float]:
        try:
            metrics = self.price_model.train(prices, **kwargs)
            self.save_models()
            return metrics
        except Exception as e:
            logger.error(f"Error training price model: {str(e)}")
            raise
    
    def train_sentiment_model(self, texts: List[str], labels: List[int]) -> ModelMetrics:
        try:
            metrics = self.sentiment_model.evaluate(texts, labels)
            self.save_models()
            return metrics
        except Exception as e:
            logger.error(f"Error training sentiment model: {str(e)}")
            raise
    
    def get_price_model(self) -> PricePredictionModel:
        return self.price_model
    
    def get_sentiment_model(self) -> SentimentAnalysisModel:
        return self.sentiment_model
        
    def initialize_models(self) -> None:
        """Initialize all models."""
        try:
            # Initialize price prediction model
            self.price_model = PricePredictionModel(
                model_path=str(self.price_model_path / "model.pt") if (self.price_model_path / "model.pt").exists() else None
            )
            
            # Initialize sentiment analysis model
            self.sentiment_model = SentimentAnalysisModel(
                model_path=str(self.sentiment_model_path) if (self.sentiment_model_path / "pytorch_model.bin").exists() else None
            )
        except Exception as e:
            logger.error(f"Error initializing models: {str(e)}")
            raise
        
    def cross_validate_price_model(self, prices: List[float], n_splits: int = 3) -> Dict[str, float]:
        """Cross validate price prediction model using time series split."""
        from sklearn.model_selection import TimeSeriesSplit
        import numpy as np
        
        prices = np.array(prices)
        tscv = TimeSeriesSplit(n_splits=n_splits)
        scores = []
        
        for train_idx, test_idx in tscv.split(prices):
            train_data = prices[train_idx]
            test_data = prices[test_idx]
            
            try:
                predictions = []
                for i in range(len(test_data)):
                    window = train_data[-30:] if len(train_data) > 30 else train_data
                    pred = self.price_model.predict(window.tolist())
                    predictions.append(pred)
                    train_data = np.append(train_data, test_data[i:i+1])
                
                rmse = np.sqrt(np.mean((np.array(predictions) - test_data) ** 2))
                scores.append(rmse)
            except Exception as e:
                logger.error(f"Error in price model validation fold: {str(e)}")
                continue
        
        return {
            "mean_rmse": float(np.mean(scores)) if scores else None,
            "std_rmse": float(np.std(scores)) if scores else None,
            "n_valid_splits": len(scores)
        }
    
    def cross_validate_sentiment_model(self, texts: List[str], labels: List[int], n_splits: int = 3) -> Dict[str, float]:
        """Cross validate sentiment analysis model using k-fold split."""
        from sklearn.model_selection import KFold
        import numpy as np
        
        kf = KFold(n_splits=n_splits, shuffle=True, random_state=42)
        scores = []
        
        for train_idx, test_idx in kf.split(texts):
            train_texts = [texts[i] for i in train_idx]
            test_texts = [texts[i] for i in test_idx]
            train_labels = [labels[i] for i in train_idx]
            test_labels = [labels[i] for i in test_idx]
            
            try:
                predictions = []
                for text in test_texts:
                    sentiment = self.sentiment_model.analyze_text(text)
                    pred = 1 if sentiment['positive'] > sentiment['negative'] else -1
                    predictions.append(pred)
                
                accuracy = sum(1 for x, y in zip(predictions, test_labels) if x == y) / len(predictions)
                scores.append(accuracy)
            except Exception as e:
                logger.error(f"Error in sentiment model validation fold: {str(e)}")
                continue
        
        return {
            "mean_accuracy": float(np.mean(scores)) if scores else None,
            "std_accuracy": float(np.std(scores)) if scores else None,
            "n_valid_splits": len(scores)
        }
