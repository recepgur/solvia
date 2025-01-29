from fastapi import APIRouter, HTTPException, Request
from typing import List
import logging
from ..features import NewsAnalysis
from ..services.predictions import PredictionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/news", tags=["news"])

@router.post("/analyze", response_model=NewsAnalysis)
async def analyze_news(request: Request):
    try:
        body = await request.json()
        if not isinstance(body, dict) or "text" not in body:
            raise HTTPException(status_code=400, detail="Request body must contain 'text' field")
        
        logger.info(f"Analyzing news text: {body['text'][:100]}...")
        result = await PredictionService.analyze_news(body["text"])
        logger.info(f"Analysis complete with sentiment score: {result.sentiment_score}")
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error analyzing news: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze news: {str(e)}")

@router.post("/analyze-batch", response_model=List[NewsAnalysis])
async def analyze_news_batch(request: Request):
    try:
        body = await request.json()
        if not isinstance(body, dict) or "texts" not in body or not isinstance(body["texts"], list):
            raise HTTPException(status_code=400, detail="Request body must contain 'texts' field as a list")
        
        logger.info(f"Analyzing batch of {len(body['texts'])} news items")
        results = []
        for text in body["texts"]:
            try:
                result = await PredictionService.analyze_news(text)
                results.append(result)
            except Exception as e:
                logger.error(f"Error analyzing news item: {str(e)}")
                continue
        
        logger.info(f"Batch analysis complete, processed {len(results)} items")
        return results
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in batch analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze news batch: {str(e)}")
