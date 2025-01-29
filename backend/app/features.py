from enum import Enum
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class AssetType(str, Enum):
    STOCK = "stock"
    INDEX = "index"
    CURRENCY = "currency"

class Asset(BaseModel):
    symbol: str
    type: AssetType
    name: str
    current_price: float
    change_24h: Optional[float] = None
    volume: Optional[int] = None
    last_updated: datetime

class PortfolioAsset(BaseModel):
    symbol: str
    quantity: float
    purchase_price: float
    current_price: Optional[float] = None
    total_value: Optional[float] = None
    profit_loss: Optional[float] = None
    profit_loss_percentage: Optional[float] = None

class Portfolio(BaseModel):
    user_id: str
    assets: List[PortfolioAsset] = Field(default_factory=list)
    total_value: float = 0.0
    risk_score: float = Field(ge=0.0, le=1.0, default=0.5)
    last_updated: datetime = Field(default_factory=datetime.now)

class PricePrediction(BaseModel):
    asset_symbol: str
    predicted_price: float
    confidence: float
    prediction_date: datetime
    horizon: str
    historical_prices: Optional[List[float]] = None
    prediction_factors: Optional[Dict[str, float]] = None

class SentimentScore(BaseModel):
    positive: float = Field(ge=0, le=1)
    neutral: float = Field(ge=0, le=1)
    negative: float = Field(ge=0, le=1)

class NewsAnalysis(BaseModel):
    title: str
    source: str
    published_date: datetime
    sentiment_score: float = Field(ge=-1, le=1)
    relevance_score: float = Field(ge=0, le=1)
    affected_assets: List[str]
    raw_sentiment: Optional[SentimentScore] = None
    keywords: Optional[List[str]] = None

class Alert(BaseModel):
    user_id: str
    asset_symbol: str
    target_price: float
    condition: str = Field(pattern='^(above|below)$')
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    triggered_at: Optional[datetime] = None
