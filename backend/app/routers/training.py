from fastapi import APIRouter, HTTPException
from typing import List, Dict, Union, Optional
from pydantic import BaseModel
from ..models.model_manager import ModelManager
from ..models.sentiment_analysis.sentiment_model import ModelMetrics

router = APIRouter(prefix="/training", tags=["training"])
model_manager = ModelManager()

class TrainingResponse(BaseModel):
    training_metrics: Dict[str, float]
    evaluation_metrics: ModelMetrics

class ValidationRequest(BaseModel):
    price_data: List[float]
    sentiment_data: Dict[str, Union[List[str], List[int]]]

class ValidationResponse(BaseModel):
    price_model: Dict[str, Optional[Union[float, int]]]
    sentiment_model: Dict[str, Optional[Union[float, int]]]

@router.post("/validate", response_model=ValidationResponse)
async def validate_models(request: ValidationRequest) -> ValidationResponse:
    try:
        price_validation = model_manager.cross_validate_price_model(request.price_data)
        sentiment_validation = model_manager.cross_validate_sentiment_model(
            request.sentiment_data["texts"],
            request.sentiment_data["labels"]
        )
        return ValidationResponse(
            price_model=price_validation,
            sentiment_model=sentiment_validation
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model validation failed: {str(e)}")

@router.post("/price-model", response_model=Dict[str, float])
async def train_price_model(prices: List[float]) -> Dict[str, float]:
    try:
        return model_manager.train_price_model(prices)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sentiment-model", response_model=TrainingResponse)
async def train_sentiment_model(request: dict) -> TrainingResponse:
    try:
        if not isinstance(request.get('texts', []), list) or not isinstance(request.get('labels', []), list):
            raise ValueError("Request must contain 'texts' and 'labels' lists")
            
        texts, labels = request['texts'], request['labels']
        
        if not texts or not labels:
            raise ValueError("Empty texts or labels provided")
            
        if len(texts) != len(labels):
            raise ValueError(f"Number of texts ({len(texts)}) does not match number of labels ({len(labels)})")
            
        if not all(isinstance(label, int) and 0 <= label <= 2 for label in labels):
            raise ValueError("Labels must be integers in range [0, 2]")
            
        # First train the model
        training_metrics = model_manager.get_sentiment_model().train(texts, labels)
        
        # Then evaluate on the same data to get performance metrics
        evaluation_metrics = model_manager.train_sentiment_model(texts, labels)
        
        return TrainingResponse(
            training_metrics=training_metrics,
            evaluation_metrics=evaluation_metrics
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
