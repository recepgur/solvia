from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from typing import List, Optional
import uuid
from datetime import datetime, timedelta

from app.models import (
    Listing, Category, ItemCondition, Location,
    User, UserCreate, UserLogin
)
from app.auth import (
    verify_password, get_password_hash,
    create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_user, create_new_user,
    get_user_by_email, users
)

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
listings: List[Listing] = []
user_preferences = {}

# Auth endpoints
@app.post("/api/auth/register", response_model=User)
async def register(user_data: UserCreate):
    if get_user_by_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user with hashed password
    user_dict = user_data.model_dump()
    user_dict["password_hash"] = get_password_hash(user_dict.pop("password"))
    return create_new_user(user_dict)

@app.post("/api/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_email(form_data.username)  # username is email in this case
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/api/listings", response_model=Listing)
async def create_listing(
    listing: Listing,
    current_user: User = Depends(get_current_user)
):
    listing.id = str(uuid.uuid4())
    listing.created_at = datetime.now()
    listings.append(listing)
    return listing

@app.get("/api/listings/feed")
async def get_listing_feed(
    latitude: float,
    longitude: float,
    category: Optional[Category] = None,
    condition: Optional[ItemCondition] = None,
    radius: float = Query(default=10.0, gt=0),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    current_user: User = Depends(get_current_user)
):
    user_location = Location(latitude=latitude, longitude=longitude)
    
    # Filter listings
    filtered_listings = []
    for listing in listings:
        # Skip if already seen
        if current_user.id in user_preferences and listing.id in user_preferences[current_user.id]:
            continue
            
        # Apply category filter
        if category and listing.category != category:
            continue
            
        # Apply condition filter
        if condition and listing.condition != condition:
            continue
            
        # Apply price range filter
        if min_price is not None and listing.price < min_price:
            continue
        if max_price is not None and listing.price > max_price:
            continue
            
        # Calculate distance (simplified)
        dx = listing.location.latitude - user_location.latitude
        dy = listing.location.longitude - user_location.longitude
        distance = (dx * dx + dy * dy) ** 0.5
        
        if distance <= radius:
            filtered_listings.append(listing)
    
    return {"listings": filtered_listings}

@app.get("/api/categories")
async def get_categories():
    return {"categories": [category.value for category in Category]}

@app.post("/api/listings/{listing_id}/swipe")
async def swipe_listing(
    listing_id: str,
    action: str,
    current_user: User = Depends(get_current_user)
):
    if action not in ["like", "dislike"]:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    # Initialize user preferences if not exists
    if current_user.id not in user_preferences:
        user_preferences[current_user.id] = {}
        
    # Record the swipe action
    user_preferences[current_user.id][listing_id] = action
    return {"status": "success"}
