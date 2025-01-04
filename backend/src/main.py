from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import Dict, Set
import json
import logging
import os
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Solvia İletişim Platformu")

# Mount static files
app.mount("/static", StaticFiles(directory="../../static"), name="static")

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.peer_connections: Dict[str, Set[str]] = {}
        
    async def connect(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.peer_connections[client_id] = set()
        await self.broadcast_message(
            client_id,
            {
                "type": "chat",
                "sender": "Sistem",
                "content": f"Yeni kullanıcı bağlandı"
            }
        )
        logger.info(f"Client connected: {client_id}")
        
    async def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            await self.broadcast_message(
                client_id,
                {
                    "type": "chat",
                    "sender": "Sistem",
                    "content": f"Kullanıcı ayrıldı"
                }
            )
            # End any active calls
            for peer_id in self.peer_connections[client_id]:
                if peer_id in self.active_connections:
                    await self.active_connections[peer_id].send_json({
                        "type": "call-ended"
                    })
                    self.peer_connections[peer_id].remove(client_id)
            
            del self.active_connections[client_id]
            del self.peer_connections[client_id]
            logger.info(f"Client disconnected: {client_id}")
    
    async def broadcast_message(self, sender_id: str, message: dict):
        disconnected_clients = set()
        for client_id, connection in self.active_connections.items():
            if client_id != sender_id:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to {client_id}: {str(e)}")
                    disconnected_clients.add(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            await self.disconnect(client_id)
    
    async def send_direct_message(self, sender_id: str, target_id: str, message: dict):
        if target_id in self.active_connections:
            try:
                await self.active_connections[target_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending direct message to {target_id}: {str(e)}")
                await self.disconnect(target_id)

manager = ConnectionManager()

@app.get("/")
async def get_index():
    return FileResponse("../../frontend/src/index.html")

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(client_id, websocket)
    try:
        while True:
            message = await websocket.receive_json()
            
            if message["type"] == "chat":
                await manager.broadcast_message(
                    client_id,
                    {
                        "type": "chat",
                        "sender": "Kullanıcı " + client_id[:4],
                        "content": message["content"]
                    }
                )
            
            elif message["type"] in ["offer", "answer", "ice-candidate"]:
                # Handle WebRTC signaling
                target_id = message.get("target")
                if target_id:
                    message["sender"] = client_id
                    await manager.send_direct_message(client_id, target_id, message)
            
            elif message["type"] == "call-ended":
                # Notify peers about call end
                for peer_id in manager.peer_connections[client_id]:
                    await manager.send_direct_message(
                        client_id,
                        peer_id,
                        {"type": "call-ended"}
                    )
                manager.peer_connections[client_id].clear()
            
    except WebSocketDisconnect:
        await manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"Error in websocket connection for {client_id}: {str(e)}")
        await manager.disconnect(client_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
