from fastapi.testclient import TestClient
from app.main import app
from app.auth import create_access_token, get_password_hash
from datetime import timedelta

client = TestClient(app)

def test_register_user():
    response = client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpass123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    assert "password_hash" in data
    assert "id" in data

def test_login_user():
    # First register a user
    client.post(
        "/api/auth/register",
        json={
            "username": "logintest",
            "email": "login@example.com",
            "password": "testpass123"
        }
    )
    
    # Then try to login
    response = client.post(
        "/api/auth/login",
        data={
            "username": "login@example.com",
            "password": "testpass123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_get_current_user():
    # Create a test user
    user_data = {
        "username": "currentuser",
        "email": "current@example.com",
        "password": "testpass123"
    }
    client.post("/api/auth/register", json=user_data)
    
    # Login to get token
    response = client.post(
        "/api/auth/login",
        data={
            "username": user_data["email"],
            "password": user_data["password"]
        }
    )
    token = response.json()["access_token"]
    
    # Get current user info
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == user_data["username"]
    assert data["email"] == user_data["email"]

def test_invalid_login():
    response = client.post(
        "/api/auth/login",
        data={
            "username": "nonexistent@example.com",
            "password": "wrongpass"
        }
    )
    assert response.status_code == 401

def test_protected_route_without_token():
    response = client.get("/api/auth/me")
    assert response.status_code == 401

def test_protected_route_with_invalid_token():
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401
