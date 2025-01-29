from typing import List
from datetime import datetime
from ..features import Alert

class AlertService:
    alerts = {}  # In-memory storage for now
    
    @staticmethod
    async def create_alert(user_id: str, alert: Alert) -> Alert:
        if user_id not in AlertService.alerts:
            AlertService.alerts[user_id] = []
        AlertService.alerts[user_id].append(alert)
        return alert
    
    @staticmethod
    async def get_alerts(user_id: str) -> List[Alert]:
        return AlertService.alerts.get(user_id, [])
