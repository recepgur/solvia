from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.routing import APIRoute
import os
from fastapi.security import OAuth2PasswordRequestForm
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
import uuid
from datetime import datetime, timedelta
from enum import Enum

class SwipeAction(str, Enum):
    LIKE = "like"
    DISLIKE = "dislike"

from app.models import (
    Listing, Category, ItemCondition, Location
)
from app.models.user import User, UserCreate, UserLogin
from app.auth import (
    verify_password, get_password_hash,
    create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_user, create_new_user,
    get_user_by_email, users
)

from fastapi import APIRouter

# Create API router
api_router = APIRouter(tags=["api"])

# Create main app
app = FastAPI(
    title="Solvia API",
    description="Multi-category marketplace API",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add debug middleware
@app.middleware("http")
async def debug_middleware(request, call_next):
    print(f"\nDEBUG: Request to {request.url.path}")
    print(f"DEBUG: Method: {request.method}")
    print(f"DEBUG: Headers: {request.headers}")
    response = await call_next(request)
    print(f"DEBUG: Response status: {response.status_code}")
    return response

# Health check endpoint
@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

# In-memory storage
listings: List[Listing] = []
user_preferences: Dict[str, Dict[str, SwipeAction]] = {}

# Add some test data
test_listing = Listing(
    id="test-1",
    title="Test Apartment",
    price=250000.00,
    description="Beautiful apartment for sale",
    location=Location(latitude=41.0082, longitude=28.9784),
    image_urls=["https://example.com/image1.jpg"],
    category=Category.REAL_ESTATE,
    condition=ItemCondition.NEW,
    category_specific={
        "square_meters": 120,
        "rooms": 3,
        "floor": 2
    },
    created_at=datetime.now()
)
listings.append(test_listing)

# Add error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    print(f"DEBUG: HTTP Exception: {exc.detail} (status_code={exc.status_code})")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    print(f"DEBUG: Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# Get frontend path from environment
frontend_path = os.getenv("FRONTEND_PATH", "")

# Configure static files if frontend path exists
if not frontend_path:
    print("Warning: FRONTEND_PATH environment variable is not set")
else:
    print(f"\nDEBUG: Frontend path configuration:")
    print(f"FRONTEND_PATH={frontend_path}")
    print(f"Path exists: {os.path.exists(frontend_path)}")
    print(f"Directory contents:")
    try:
        # List directory contents for debugging
        for root, dirs, files in os.walk(frontend_path):
            level = root.replace(frontend_path, '').count(os.sep)
            indent = ' ' * 4 * level
            print(f"{indent}{os.path.basename(root)}/")
            subindent = ' ' * 4 * (level + 1)
            for f in files:
                print(f"{subindent}{f}")
        
        # Mount assets directory for static files
        assets_path = os.path.join(frontend_path, "assets")
        if os.path.exists(assets_path):
            app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
            print("Successfully mounted assets directory")
        
        # Serve favicon.ico directly
        @app.get("/favicon.ico")
        async def favicon():
            favicon_path = os.path.join(frontend_path, "favicon.ico")
            if os.path.exists(favicon_path):
                return FileResponse(favicon_path)
            raise HTTPException(status_code=404, detail="Favicon not found")
        
        # Serve static files directly
        @app.get("/{path:path}")
        async def serve_static(path: str):
            # Don't handle API routes
            if path.startswith("api/"):
                raise HTTPException(status_code=404, detail="Not Found")
            
            # Try to serve static files first
            static_path = os.path.join(frontend_path, path)
            if os.path.exists(static_path) and os.path.isfile(static_path):
                return FileResponse(static_path)
            
            # Fall back to index.html for client-side routing
            index_path = os.path.join(frontend_path, "index.html")
            if os.path.exists(index_path):
                return FileResponse(index_path)
            raise HTTPException(status_code=404, detail="Frontend not found")
        
        # Serve index.html for root
        @app.get("/")
        async def serve_root():
            index_path = os.path.join(frontend_path, "index.html")
            if os.path.exists(index_path):
                return FileResponse(index_path)
            raise HTTPException(status_code=404, detail="Frontend not found")
        
        print("\nDEBUG: Route configuration:")
        for route in app.routes:
            if isinstance(route, APIRoute):
                print(f"  {route.path} [{','.join(route.methods)}]")
            else:
                print(f"  {str(route)} (mounted)")
    except Exception as e:
        print(f"Error configuring frontend: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise

# Register API routes after static file configuration
app.include_router(api_router, prefix="/api")
print("\nDEBUG: Final route configuration:")
for route in app.routes:
    if isinstance(route, APIRoute):
        print(f"  {route.path} [{','.join(route.methods)}]")
    else:
        print(f"  {str(route)} (mounted)")

# Auth endpoints
@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    try:
        if get_user_by_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user with hashed password
        user_dict = user_data.model_dump()
        user_dict["password_hash"] = get_password_hash(user_dict.pop("password"))
        return create_new_user(user_dict)
    except Exception as e:
        print(f"Error in register endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@api_router.post("/auth/login")
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

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Health check endpoint is now defined above

class CategoryFields(BaseModel):
    real_estate: Dict[str, List[str]] = {
        "required": ["square_meters", "rooms", "floor"],
        "optional": ["heating_type", "building_age"]
    }
    vehicle: Dict[str, List[str]] = {
        "required": ["make", "model", "year", "mileage"],
        "optional": ["fuel_type", "transmission"]
    }
    electronics: Dict[str, List[str]] = {
        "required": ["brand", "model"],
        "optional": ["warranty_months", "specifications"]
    }
    other: Dict[str, List[str]] = {
        "required": [],
        "optional": ["brand", "model", "specifications"]
    }

class CategoryFieldsResponse(BaseModel):
    required: List[str]
    optional: List[str]

@api_router.get("/categories/{category}/fields", response_model=CategoryFieldsResponse)
async def get_category_fields(category: Category):
    fields = getattr(CategoryFields(), category.value, None)
    if not fields:
        raise HTTPException(status_code=404, detail="Category not found")
    return fields

@api_router.post("/listings", response_model=Listing)
async def create_listing(
    listing: Listing,
    current_user: User = Depends(get_current_user)
):
    # Validate category-specific fields
    required_fields = getattr(CategoryFields(), listing.category.value)["required"]
    optional_fields = getattr(CategoryFields(), listing.category.value)["optional"]
    
    # Check required fields
    for field in required_fields:
        if field not in listing.category_specific:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required field for {listing.category}: {field}"
            )
    
    # Remove any fields that aren't in required or optional
    allowed_fields = set(required_fields + optional_fields)
    listing.category_specific = {
        k: v for k, v in listing.category_specific.items()
        if k in allowed_fields
    }
    
    # Validate image URLs
    if not listing.image_urls:
        raise HTTPException(
            status_code=400,
            detail="At least one image URL is required"
        )
    
    # Set listing metadata
    listing.id = str(uuid.uuid4())
    listing.created_at = datetime.now()
    listing.seller_id = current_user.id
    
    # Add to listings database
    listings.append(listing)
    return listing

class ListingFilter(BaseModel):
    category: Optional[Category] = None
    condition: Optional[ItemCondition] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    radius: float = Field(default=10.0, gt=0)

class ListingFeedResponse(BaseModel):
    listings: List[Listing]

@api_router.get("/listings/feed", response_model=ListingFeedResponse)
async def get_listing_feed(
    latitude: float = Query(..., description="Latitude for location-based search"),
    longitude: float = Query(..., description="Longitude for location-based search"),
    filters: ListingFilter = Depends(),
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
        if filters.category and listing.category != filters.category:
            continue
            
        # Apply condition filter
        if filters.condition and listing.condition != filters.condition:
            continue
            
        # Apply price range filter
        if filters.min_price is not None and listing.price < filters.min_price:
            continue
        if filters.max_price is not None and listing.price > filters.max_price:
            continue
            
        # Calculate distance (simplified)
        dx = listing.location.latitude - user_location.latitude
        dy = listing.location.longitude - user_location.longitude
        distance = (dx * dx + dy * dy) ** 0.5
        
        if distance <= filters.radius:
            filtered_listings.append(listing)
    
    return {"listings": filtered_listings}

@api_router.get("/listings/my", response_model=List[Listing])
async def get_my_listings(current_user: User = Depends(get_current_user)):
    return [listing for listing in listings if listing.seller_id == current_user.id]

@api_router.get("/listings/liked", response_model=List[Listing])
async def get_liked_listings(current_user: User = Depends(get_current_user)):
    liked_ids = [
        listing_id
        for listing_id, action in user_preferences.get(current_user.id, {}).items()
        if action == SwipeAction.LIKE
    ]
    return [listing for listing in listings if listing.id in liked_ids]

@api_router.get("/listings/seller/{seller_id}", response_model=List[Listing])
async def get_seller_listings(
    seller_id: str,
    current_user: User = Depends(get_current_user)
):
    return [listing for listing in listings if listing.seller_id == seller_id]

class CategoriesResponse(BaseModel):
    categories: List[str]

@api_router.get("/categories", response_model=CategoriesResponse)
async def get_categories():
    return {"categories": [category.value for category in Category]}

class SwipeRequest(BaseModel):
    action: SwipeAction

class SwipeResponse(BaseModel):
    status: str
    message: str

@api_router.post("/listings/{listing_id}/swipe", response_model=SwipeResponse)
async def swipe_listing(
    listing_id: str,
    swipe: SwipeRequest,
    current_user: User = Depends(get_current_user)
):
    # Validate listing exists
    listing = None
    for l in listings:
        if l.id == listing_id:
            listing = l
            break
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Initialize user preferences if not exists
    if current_user.id not in user_preferences:
        user_preferences[current_user.id] = {}
    
    # Store the swipe action
    user_preferences[current_user.id][listing_id] = swipe.action
    
    return SwipeResponse(
        status="success",
        message=f"Successfully recorded {swipe.action} for listing {listing_id}"
    )
