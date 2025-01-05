from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Set, List
from pydantic import BaseModel
import json
import logging
import os
from datetime import datetime
import base58
from nacl.signing import VerifyKey
from solana.transaction import Transaction
from solana.rpc.api import Client
from solders.keypair import Keypair
from solders.pubkey import Pubkey

class PublicKey:
    def __init__(self, key):
        self.key = key
        self._bytes = None
        if isinstance(key, str):
            self._bytes = base58.b58decode(key)
    
    @staticmethod
    def from_string(address):
        return PublicKey(address)
        
    def __str__(self):
        return self.key
        
    def __bytes__(self):
        if self._bytes is None:
            raise ValueError("Cannot convert PublicKey to bytes")
        return self._bytes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Solvia İletişim Platformu")

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Wallet doğrulama için model
class WalletAuthRequest(BaseModel):
    walletAddress: str
    signature: str
    message: str

@app.post("/api/auth/wallet")
async def wallet_auth(request: WalletAuthRequest):
    try:
        # Validate wallet address format
        try: 
            wallet = PublicKey(request.walletAddress)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Geçersiz cüzdan adresi formatı. Lütfen doğru bir Solana cüzdan adresi girin."
            )
        
        # Validate signature
        try:
            # Decode base58 signature
            try:
                signature_bytes = base58.b58decode(request.signature)
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail="Geçersiz imza formatı. İmza base58 formatında olmalıdır."
                )
            
            message_bytes = request.message.encode('utf-8')
            
            # Convert wallet public key to verify key
            try:
                verify_key = VerifyKey(bytes(wallet))
                verify_key.verify(message_bytes, signature_bytes)
            except Exception:
                raise HTTPException(
                    status_code=401,
                    detail="İmza doğrulaması başarısız. Lütfen mesajı doğru şekilde imzaladığınızdan emin olun."
                )
            
            return {
                "status": "success",
                "wallet": str(wallet),
                "message": "Cüzdan doğrulaması başarılı",
                "timestamp": datetime.now().isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error during signature verification: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in wallet auth: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Sunucu hatası. Lütfen daha sonra tekrar deneyin."
        )

# Mount static files
app.mount("/static", StaticFiles(directory="../../static"), name="static")

class MessageStorage:
    def __init__(self):
        self.messages: Dict[str, List[Dict]] = {}
        self.direct_messages: Dict[str, Dict[str, List[Dict]]] = {}  # sender -> {receiver -> [messages]}
    
    def store_message(self, sender: str, content: str, message_type: str = "chat") -> Dict:
        if sender not in self.messages:
            self.messages[sender] = []
        
        message = {
            "type": message_type,
            "sender": sender,
            "content": content,
            "timestamp": datetime.now().isoformat()
        }
        self.messages[sender].append(message)
        return message
    
    def store_direct_message(self, sender: str, receiver: str, content: str) -> Dict:
        if sender not in self.direct_messages:
            self.direct_messages[sender] = {}
        if receiver not in self.direct_messages[sender]:
            self.direct_messages[sender][receiver] = []
        
        message = {
            "type": "direct",
            "sender": sender,
            "receiver": receiver,
            "content": content,
            "timestamp": datetime.now().isoformat()
        }
        self.direct_messages[sender][receiver].append(message)
        return message
    
    def get_messages(self, wallet_address: str, limit: int = 50) -> List[Dict]:
        messages = self.messages.get(wallet_address, [])
        return messages[-limit:]
    
    def get_direct_messages(self, sender: str, receiver: str, limit: int = 50) -> List[Dict]:
        if sender not in self.direct_messages or receiver not in self.direct_messages[sender]:
            return []
        messages = self.direct_messages[sender][receiver]
        return messages[-limit:]

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.peer_connections: Dict[str, Set[str]] = {}
        self.message_storage = MessageStorage()
        
    async def connect(self, wallet_address: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[wallet_address] = websocket
        self.peer_connections[wallet_address] = set()
        
        # Send message history to the newly connected user
        recent_messages = self.message_storage.get_messages(wallet_address)
        if recent_messages:
            await websocket.send_json({
                "type": "message_history",
                "messages": recent_messages
            })
        
        # Notify about new connection
        system_message = self.message_storage.store_message(
            wallet_address,
            f"Cüzdan {wallet_address[:8]}... bağlandı",
            "system"
        )
        await self.broadcast_message(wallet_address, system_message)
        logger.info(f"Wallet connected: {wallet_address}")
        
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
        # Store the message if it's a chat or system message
        if message["type"] in ["chat", "system"]:
            stored_message = self.message_storage.store_message(
                sender_id,
                message["content"],
                message["type"]
            )
            # Update message with stored version (includes timestamp)
            message.update(stored_message)
        
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
                # Store direct messages
                if message["type"] == "chat":
                    stored_message = self.message_storage.store_direct_message(
                        sender_id,
                        target_id,
                        message["content"]
                    )
                    # Update message with stored version
                    message.update(stored_message)
                
                await self.active_connections[target_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending direct message to {target_id}: {str(e)}")
                await self.disconnect(target_id)

manager = ConnectionManager()

@app.get("/")
async def get_index():
    return FileResponse("../../frontend/src/index.html")

@app.websocket("/ws/{wallet_address}")
async def websocket_endpoint(websocket: WebSocket, wallet_address: str):
    # Cüzdan adresini doğrula
    try:
        # Add more detailed logging
        print(f"Attempting WebSocket connection with wallet address: {wallet_address}")
        try:
            # Allow test client IDs in development
            if wallet_address.startswith('client-'):
                wallet = wallet_address
                print(f"Valid test client ID: {wallet_address}")
            else:
                # Let PublicKey class handle the validation for real wallet addresses
                wallet = PublicKey(wallet_address)
                print(f"Valid Solana wallet address: {wallet_address}")
        except Exception as e:
            print(f"Invalid wallet address: {str(e)}")
            await websocket.close(code=1008, reason="Geçersiz cüzdan adresi")
            return
    except Exception as e:
        print(f"Connection error: {str(e)}")
        await websocket.close(code=1008, reason="Bağlantı hatası")
        return
        
    # Use wallet_address directly for test clients, str(wallet) for real wallets
    wallet_str = wallet_address if isinstance(wallet, str) else str(wallet)
    await manager.connect(wallet_str, websocket)
    try:
        while True:
            message = await websocket.receive_json()
            
            if message["type"] == "chat":
                await manager.broadcast_message(
                    wallet_str,
                    {
                        "type": "chat",
                        "sender": wallet_str[:8] + "...",  # Show first 8 chars of wallet
                        "content": message["content"]
                    }
                )
            
            elif message["type"] in ["offer", "answer", "ice-candidate"]:
                # Handle WebRTC signaling
                target_id = message.get("target")
                if target_id:
                    message["sender"] = wallet_str
                    await manager.send_direct_message(wallet_str, target_id, message)
            
            elif message["type"] == "call-ended":
                # Notify peers about call end
                for peer_id in manager.peer_connections[wallet_str]:
                    await manager.send_direct_message(
                        wallet_str,
                        peer_id,
                        {"type": "call-ended"}
                    )
                manager.peer_connections[wallet_str].clear()
            
    except WebSocketDisconnect:
        await manager.disconnect(wallet_str)
    except Exception as e:
        logger.error(f"Error in websocket connection for {wallet_str}: {str(e)}")
        await manager.disconnect(wallet_str)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
