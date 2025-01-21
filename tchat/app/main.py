from fastapi import FastAPI, WebSocket, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import json
import uvicorn

from .api.v1.api import api_router
from .core.solana import SolanaManager
from .core.ipfs import IPFSManager
from .core.encryption import EncryptionManager
from .core.webrtc import WebRTCSignaling

# Initialize core services
solana = SolanaManager()
ipfs = IPFSManager()
webrtc = WebRTCSignaling()

security = HTTPBearer()

app = FastAPI(
    title="TChat Backend API",
    description="Decentralized messaging platform built on Solana blockchain",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
)

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections
active_connections = {}

app.include_router(api_router, prefix="/api/v1")

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """Custom Swagger UI route for API documentation"""
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="TChat API Documentation",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
    )

@app.get("/openapi.json", include_in_schema=False)
async def get_openapi_schema():
    """Generate OpenAPI schema for Node.js client generation"""
    return get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

@app.get("/", tags=["status"])
async def root():
    """Check API status"""
    return {"message": "Welcome to TChat Backend API", "status": "operational"}

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time messaging"""
    await websocket.accept()
    active_connections[user_id] = websocket
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            # Forward message to receiver
            if message["receiver"] in active_connections:
                await active_connections[message["receiver"]].send_text(data)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if user_id in active_connections:
            del active_connections[user_id]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
