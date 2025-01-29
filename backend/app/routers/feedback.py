from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/feedback", tags=["feedback"])

class UserFeedback(BaseModel):
    user_id: str
    feature_type: str  # "prediction", "sentiment", "portfolio", "alerts"
    rating: int  # 1-5
    comment: Optional[str]
    timestamp: datetime = datetime.now()

feedback_store = []  # In-memory storage for demo

@router.post("")
async def submit_feedback(feedback: UserFeedback):
    try:
        feedback_store.append(feedback)
        return feedback
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def get_feedback():
    return feedback_store
