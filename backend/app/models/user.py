from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from .base import Location

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    location: Optional[Location] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    username: str
    email: EmailStr
    password_hash: str
    location: Optional[Location] = None
    created_at: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "id": "user123",
                "username": "john_doe",
                "email": "john@example.com",
                "password_hash": "hashed_password",
                "location": {
                    "latitude": 41.0082,
                    "longitude": 28.9784
                },
                "created_at": "2024-01-19T12:00:00"
            }
        }
