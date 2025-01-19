from fastapi.testclient import TestClient
from app.main import app
from app.models import Category, ItemCondition, Location
from app.auth import create_access_token
import pytest

client = TestClient(app)

@pytest.fixture
def auth_headers():
    access_token = create_access_token({"sub": "test-user-id"})
    return {"Authorization": f"Bearer {access_token}"}

@pytest.fixture
def test_listing():
    return {
        "title": "Test Apartment",
        "price": 250000.00,
        "description": "Beautiful apartment for sale",
        "location": {
            "latitude": 41.0082,
            "longitude": 28.9784
        },
        "image_urls": ["https://example.com/image1.jpg"],
        "category": Category.REAL_ESTATE,
        "condition": ItemCondition.NEW,
        "category_specific": {
            "square_meters": 120,
            "rooms": 3,
            "floor": 2
        }
    }

def test_create_listing(auth_headers, test_listing):
    response = client.post(
        "/api/listings",
        json=test_listing,
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == test_listing["title"]
    assert data["category"] == test_listing["category"]
    assert data["condition"] == test_listing["condition"]
    assert "id" in data

def test_create_listing_without_auth(test_listing):
    response = client.post("/api/listings", json=test_listing)
    assert response.status_code == 401

def test_get_listing_feed(auth_headers, test_listing):
    # Create a test listing first
    client.post("/api/listings", json=test_listing, headers=auth_headers)
    
    # Test without filters
    response = client.get(
        "/api/listings/feed",
        params={
            "latitude": 41.0082,
            "longitude": 28.9784
        },
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["listings"]) > 0
    
    # Test with category filter
    response = client.get(
        "/api/listings/feed",
        params={
            "latitude": 41.0082,
            "longitude": 28.9784,
            "category": Category.REAL_ESTATE
        },
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert all(listing["category"] == Category.REAL_ESTATE for listing in data["listings"])
    
    # Test with condition filter
    response = client.get(
        "/api/listings/feed",
        params={
            "latitude": 41.0082,
            "longitude": 28.9784,
            "condition": ItemCondition.NEW
        },
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert all(listing["condition"] == ItemCondition.NEW for listing in data["listings"])

def test_get_my_listings(auth_headers, test_listing):
    # Create a test listing
    client.post("/api/listings", json=test_listing, headers=auth_headers)
    
    response = client.get("/api/listings/my", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert all(listing["seller_id"] == "test-user-id" for listing in data)

def test_swipe_listing(auth_headers, test_listing):
    # Create a test listing
    create_response = client.post(
        "/api/listings",
        json=test_listing,
        headers=auth_headers
    )
    listing_id = create_response.json()["id"]
    
    # Test like action
    response = client.post(
        f"/api/listings/{listing_id}/swipe",
        json={"action": "like"},
        headers=auth_headers
    )
    assert response.status_code == 200
    
    # Verify liked listings
    liked_response = client.get("/api/listings/liked", headers=auth_headers)
    assert response.status_code == 200
    liked_listings = liked_response.json()
    assert any(listing["id"] == listing_id for listing in liked_listings)

def test_category_fields():
    for category in Category:
        response = client.get(f"/api/categories/{category}/fields")
        assert response.status_code == 200
        data = response.json()
        assert "required" in data
        assert "optional" in data
        assert isinstance(data["required"], list)
        assert isinstance(data["optional"], list)

def test_invalid_category_specific_fields(auth_headers):
    invalid_listing = {
        "title": "Test Item",
        "price": 100.00,
        "description": "Test description",
        "location": {
            "latitude": 41.0082,
            "longitude": 28.9784
        },
        "image_urls": ["https://example.com/image1.jpg"],
        "category": Category.REAL_ESTATE,
        "condition": ItemCondition.NEW,
        "category_specific": {}  # Missing required fields
    }
    
    response = client.post(
        "/api/listings",
        json=invalid_listing,
        headers=auth_headers
    )
    assert response.status_code == 400
