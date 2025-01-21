from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, Optional
import json

from app.core.webrtc import WebRTCSignaling
from .messages import get_current_wallet, security

router = APIRouter()
webrtc = WebRTCSignaling()

@router.websocket("/signal/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for WebRTC signaling"""
    await webrtc.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "offer":
                await webrtc.handle_offer(
                    from_id=client_id,
                    to_id=message["to"],
                    offer=message["offer"]
                )
            elif message["type"] == "answer":
                await webrtc.handle_answer(
                    from_id=client_id,
                    to_id=message["to"],
                    answer=message["answer"]
                )
            elif message["type"] == "ice-candidate":
                await webrtc.handle_ice_candidate(
                    from_id=client_id,
                    to_id=message["to"],
                    candidate=message["candidate"]
                )
    except WebSocketDisconnect:
        webrtc.disconnect(client_id)
    except Exception as e:
        print(f"Error in WebRTC signaling: {e}")
        webrtc.disconnect(client_id)
