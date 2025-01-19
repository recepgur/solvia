from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class Location(BaseModel):
    latitude: float
    longitude: float
