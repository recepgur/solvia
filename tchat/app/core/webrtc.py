from typing import Dict, Optional
import json
from fastapi import WebSocket

class WebRTCSignaling:
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}
        self.peers: Dict[str, set] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Connect a new WebRTC peer"""
        await websocket.accept()
        self.connections[client_id] = websocket
        self.peers[client_id] = set()
    
    def disconnect(self, client_id: str):
        """Disconnect a WebRTC peer"""
        if client_id in self.connections:
            del self.connections[client_id]
        if client_id in self.peers:
            peers = self.peers[client_id]
            del self.peers[client_id]
            for peer_id in peers:
                if peer_id in self.peers:
                    self.peers[peer_id].remove(client_id)
    
    async def handle_offer(self, from_id: str, to_id: str, offer: dict):
        """Handle WebRTC offer"""
        if to_id in self.connections:
            message = {
                "type": "offer",
                "from": from_id,
                "offer": offer
            }
            await self.connections[to_id].send_text(json.dumps(message))
            self.peers[from_id].add(to_id)
            self.peers[to_id].add(from_id)
    
    async def handle_answer(self, from_id: str, to_id: str, answer: dict):
        """Handle WebRTC answer"""
        if to_id in self.connections:
            message = {
                "type": "answer",
                "from": from_id,
                "answer": answer
            }
            await self.connections[to_id].send_text(json.dumps(message))
    
    async def handle_ice_candidate(self, from_id: str, to_id: str, candidate: dict):
        """Handle ICE candidate"""
        if to_id in self.connections:
            message = {
                "type": "ice-candidate",
                "from": from_id,
                "candidate": candidate
            }
            await self.connections[to_id].send_text(json.dumps(message))
