from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
from datetime import datetime
import uuid

from ..models.user import User
from .jwt import decode_token

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# In-memory user storage
users = {}

def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not isinstance(user_id, str) or user_id not in users:
            raise credentials_exception
    except Exception:
        raise credentials_exception
        
    return users[user_id]

# Helper function to create a new user
def create_new_user(user_data: dict) -> User:
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        created_at=datetime.now(),
        **user_data
    )
    users[user_id] = user
    return user

# Helper function to get user by email
def get_user_by_email(email: str) -> Optional[User]:
    for user in users.values():
        if user.email == email:
            return user
    return None
