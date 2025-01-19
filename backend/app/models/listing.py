from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from .base import Location
from .enums import Category, ItemCondition

class Listing(BaseModel):
    id: Optional[str] = None
    title: str = Field(min_length=3, max_length=100)
    price: float = Field(gt=0)
    description: str = Field(min_length=10, max_length=1000)
    location: Location
    image_urls: List[str] = []
    category: Category
    condition: ItemCondition
    created_at: Optional[datetime] = None
    seller_id: Optional[str] = None
    category_specific: Dict[str, Any] = {}

    @field_validator('image_urls')
    def validate_image_urls(cls, v):
        if not v:
            raise ValueError('At least one image URL is required')
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "3+1 Apartment in City Center",
                "price": 250000.00,
                "description": "Spacious apartment with modern amenities",
                "location": {
                    "latitude": 41.0082,
                    "longitude": 28.9784
                },
                "image_urls": ["https://example.com/image1.jpg"],
                "category": "real_estate",
                "condition": "new",
                "category_specific": {
                    "square_meters": 120,
                    "rooms": 4,
                    "floor": 3
                }
            }
        }
    }
