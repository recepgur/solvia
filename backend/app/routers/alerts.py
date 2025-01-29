from fastapi import APIRouter, HTTPException
from typing import List
from ..features import Alert
from ..services.alerts import AlertService

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.post("/{user_id}", response_model=Alert)
async def create_alert(user_id: str, alert: Alert):
    try:
        return await AlertService.create_alert(user_id, alert)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{user_id}", response_model=List[Alert])
async def get_alerts(user_id: str):
    try:
        return await AlertService.get_alerts(user_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
