from fastapi import FastAPI, HTTPException, Query, Depends, status, Request
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
api_router = APIRouter(prefix="/api", tags=["api"])

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

# Custom StaticFiles class that always returns index.html for 404s
class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        print(f"\nDEBUG: SPAStaticFiles.get_response called")
        print(f"DEBUG: Requested path: {path}")
        print(f"DEBUG: Directory: {str(self.directory)}")
        print(f"DEBUG: HTML mode: {self.html}")
        print(f"DEBUG: Scope base_url: {scope.get('root_path', '')}")
        
        try:
            # Strip leading slash for consistency
            path = path.lstrip('/')
            print(f"DEBUG: Normalized path: {path}")
            
            # Handle API routes
            if path.startswith('api/'):
                print("DEBUG: API path detected, forwarding to API router")
                raise HTTPException(status_code=404, detail="Not Found")
            
            # For static assets, try to serve directly
            if path.startswith('assets/') or path in ['favicon.ico', 'robots.txt']:
                try:
                    print(f"DEBUG: Attempting to serve static file: {path}")
                    response = await super().get_response(path, scope)
                    print(f"DEBUG: Successfully served static file: {path}")
                    return response
                except HTTPException as ex:
                    print(f"DEBUG: Static file not found: {path}")
                    raise
            
            # For root path or any other path, serve index.html
            print(f"DEBUG: Serving index.html for path: {path}")
            try:
                base_dir = str(self.directory) if self.directory else ""
                if not base_dir:
                    print("DEBUG: No directory configured!")
                    raise HTTPException(status_code=500, detail="Static files directory not configured")
                    
                index_path = os.path.join(base_dir, 'index.html')
                print(f"DEBUG: Checking index.html at: {index_path}")
                print(f"DEBUG: Base directory exists: {os.path.exists(base_dir)}")
                print(f"DEBUG: Base directory contents: {os.listdir(base_dir) if os.path.exists(base_dir) else 'N/A'}")
                
                if os.path.exists(index_path):
                    print("DEBUG: index.html found, serving")
                    try:
                        return FileResponse(
                            index_path,
                            media_type='text/html',
                            status_code=200
                        )
                    except Exception as e:
                        print(f"DEBUG: Error serving index.html: {str(e)}")
                        raise
                else:
                    print("DEBUG: index.html not found!")
                    print(f"DEBUG: Directory contents: {os.listdir(base_dir)}")
                    raise HTTPException(status_code=404, detail=f"index.html not found in {base_dir}")
            except Exception as e:
                print(f"DEBUG: Error serving index.html: {str(e)}")
                print(f"DEBUG: Error type: {type(e)}")
                raise
        except Exception as e:
            print(f"DEBUG: Unhandled error in SPAStaticFiles.get_response: {str(e)}")
            print(f"DEBUG: Error type: {type(e)}")
            import traceback
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
            raise

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

@api_router.get("/categories/{category}/fields", response_model=CategoryFieldsResponse, tags=["categories"])
async def get_category_fields(category: Category):
    """Get required and optional fields for a specific category"""
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

@api_router.get("/categories", response_model=CategoriesResponse, tags=["categories"])
async def get_categories():
    """Get all available categories"""
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

# Get frontend path from environment
frontend_path = os.getenv("FRONTEND_PATH", "")
print(f"\nDEBUG: Environment variables:")
print(f"FRONTEND_PATH: {frontend_path}")
print(f"PYTHONPATH: {os.getenv('PYTHONPATH')}")
print(f"Current working directory: {os.getcwd()}")

# Add detailed request logging middleware
@app.middleware("http")
async def debug_request_middleware(request: Request, call_next):
    print(f"\nDEBUG: Request details:")
    print(f"Method: {request.method}")
    print(f"URL: {request.url}")
    print(f"Headers: {request.headers}")
    print(f"Client: {request.client}")
    print(f"Base URL: {request.base_url}")
    print(f"Path params: {request.path_params}")
    
    response = await call_next(request)
    
    print(f"\nDEBUG: Response details:")
    print(f"Status: {response.status_code}")
    print(f"Headers: {response.headers}")
    return response

# Include API router first
print("\nDEBUG: Including API router")
app.include_router(api_router)

# Configure frontend if available
if frontend_path and os.path.exists(frontend_path):
    try:
        print("\nDEBUG: Frontend directory contents:")
        for root, dirs, files in os.walk(frontend_path):
            print(f"\nDirectory: {root}")
            print("Files:", files)
            print("Subdirectories:", dirs)

        # Verify index.html exists
        index_path = os.path.join(frontend_path, "index.html")
        if not os.path.exists(index_path):
            print(f"\nERROR: index.html not found at {index_path}")
            print(f"Directory contents: {os.listdir(frontend_path)}")
            raise RuntimeError("index.html not found in frontend path")

        print("\nDEBUG: Mounting frontend with SPAStaticFiles")
        app.mount("/", SPAStaticFiles(directory=frontend_path, html=True), name="static")
        print("\nDEBUG: Successfully configured frontend serving")

        # Print mounted routes for debugging
        print("\nDEBUG: Final route configuration:")
        routes = []
        for route in app.routes:
            if isinstance(route, APIRoute):
                routes.append(f"  API: {route.path} [{','.join(route.methods)}]")
            else:
                routes.append(f"  Mount: {str(route)}")
        routes.sort()
        print("\n".join(routes))

        print("\nDEBUG: Static files configuration:")
        print(f"Static files directory: {frontend_path}")
        print(f"Index path exists: {os.path.exists(index_path)}")
        print(f"Directory contents:")
        print("\n".join(f"  {f}" for f in os.listdir(frontend_path)))
    except Exception as e:
        print(f"\nERROR: Failed to configure frontend: {str(e)}")
        import traceback
        print(f"DEBUG: Traceback: {traceback.format_exc()}")
        raise
else:
    print("\nWARNING: FRONTEND_PATH not set or directory does not exist")

# End of application setup
