from typing import Dict, Set, Optional, List
from dataclasses import dataclass
from unittest.mock import AsyncMock, MagicMock
from .config import settings
import asyncio
import json
from .storage import ipfs

# Mock WebRTC classes
class RTCPeerConnection:
    def __init__(self, configuration=None):
        self.configuration = configuration or {}
        self.local_description = None
        self.remote_description = None
        self.ice_candidates = []
        self.tracks = []
        self.connection_state = "new"
        self._event_handlers = {
            "icecandidate": [],
            "track": [],
            "connectionstatechange": []
        }

    def on(self, event_name):
        def decorator(f):
            self._event_handlers[event_name].append(f)
            return f
        return decorator

    async def setRemoteDescription(self, desc):
        self.remote_description = desc

    async def setLocalDescription(self, desc):
        self.local_description = desc

    async def createAnswer(self):
        return RTCSessionDescription(type="answer", sdp="mock_answer_sdp")

    async def createOffer(self):
        return RTCSessionDescription(type="offer", sdp="mock_offer_sdp")

    async def addIceCandidate(self, candidate):
        self.ice_candidates.append(candidate)

    def addTrack(self, track):
        self.tracks.append(track)

    def close(self):
        self.connection_state = "closed"

class RTCSessionDescription:
    def __init__(self, type=None, sdp=None):
        self.type = type
        self.sdp = sdp

class RTCIceCandidate:
    def __init__(self, candidate="", sdpMid="", sdpMLineIndex=0):
        self.candidate = candidate
        self.sdpMid = sdpMid
        self.sdpMLineIndex = sdpMLineIndex

class MediaStreamTrack:
    def __init__(self, kind="audio"):
        self.kind = kind
        self.id = f"mock_{kind}_track"

    def stop(self):
        pass

@dataclass
class Participant:
    peer_id: str
    connection: RTCPeerConnection
    ice_candidates: List[RTCIceCandidate]
    audio_enabled: bool = True
    audio_track: Optional[MediaStreamTrack] = None

class VoiceRoom:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.participants: Dict[str, Participant] = {}
        self.ice_candidates: Dict[str, List[RTCIceCandidate]] = {}

class WebRTCManager:
    def __init__(self):
        self.rooms: Dict[str, VoiceRoom] = {}
    
    def get_or_create_room(self, room_id: str) -> VoiceRoom:
        if room_id not in self.rooms:
            self.rooms[room_id] = VoiceRoom(room_id)
        return self.rooms[room_id]

    async def create_peer_connection(self, room_id: str, peer_id: str) -> RTCPeerConnection:
        room = self.get_or_create_room(room_id)
        
        pc = RTCPeerConnection({
            "iceServers": [
                {"urls": settings.STUN_SERVER},
                {"urls": settings.TURN_SERVER} if settings.TURN_SERVER else None
            ]
        })

        # Handle ICE candidate events
        @pc.on("icecandidate")
        async def on_ice_candidate(event):
            if event.candidate:
                if peer_id not in room.ice_candidates:
                    room.ice_candidates[peer_id] = []
                room.ice_candidates[peer_id].append(event.candidate)
                # Store ICE candidates in IPFS for decentralized discovery
                await self._update_room_state(room)

        # Handle connection state changes
        @pc.on("connectionstatechange")
        async def on_connection_state_change():
            if pc.connectionState == "failed" or pc.connectionState == "closed":
                await self.remove_participant(room_id, peer_id)

        # Handle incoming audio tracks
        @pc.on("track")
        async def on_track(track):
            if track.kind == "audio":
                participant = room.participants.get(peer_id)
                if participant:
                    participant.audio_track = track
                    # Relay audio to other participants in mesh topology
                    await self._relay_audio_track(room, peer_id, track)

        room.participants[peer_id] = Participant(
            peer_id=peer_id,
            connection=pc,
            ice_candidates=[],
            audio_enabled=True
        )
        
        return pc

    async def handle_offer(self, room_id: str, peer_id: str, offer: RTCSessionDescription) -> RTCSessionDescription:
        pc = await self.create_peer_connection(room_id, peer_id)
        await pc.setRemoteDescription(offer)
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        
        # Connect to existing participants in the room (mesh topology)
        room = self.rooms[room_id]
        for participant_id, participant in room.participants.items():
            if participant_id != peer_id:
                await self._connect_peers(room_id, peer_id, participant_id)
        
        return pc.localDescription

    async def _connect_peers(self, room_id: str, peer_id1: str, peer_id2: str):
        """Create a peer connection between two participants in the same room"""
        room = self.rooms[room_id]
        pc1 = room.participants[peer_id1].connection
        pc2 = room.participants[peer_id2].connection

        # Exchange ICE candidates
        for candidate in room.ice_candidates.get(peer_id1, []):
            await pc2.addIceCandidate(candidate)
        for candidate in room.ice_candidates.get(peer_id2, []):
            await pc1.addIceCandidate(candidate)

    async def _relay_audio_track(self, room: VoiceRoom, source_peer_id: str, track: MediaStreamTrack):
        """Relay audio track to all other participants in the room"""
        for peer_id, participant in room.participants.items():
            if peer_id != source_peer_id:
                participant.connection.addTrack(track)

    async def remove_participant(self, room_id: str, peer_id: str):
        """Remove a participant from the room and clean up their connections"""
        if room_id in self.rooms:
            room = self.rooms[room_id]
            if peer_id in room.participants:
                participant = room.participants[peer_id]
                if participant.audio_track:
                    participant.audio_track.stop()
                participant.connection.close()
                del room.participants[peer_id]
                if peer_id in room.ice_candidates:
                    del room.ice_candidates[peer_id]
                
                # Update room state in IPFS
                await self._update_room_state(room)

                # Remove room if empty
                if not room.participants:
                    del self.rooms[room_id]

    async def _update_room_state(self, room: VoiceRoom):
        """Store room state in IPFS for decentralized discovery"""
        state = {
            "room_id": room.room_id,
            "participants": {
                pid: {
                    "peer_id": p.peer_id,
                    "audio_enabled": p.audio_enabled,
                    "ice_candidates": [
                        {
                            "candidate": c.candidate,
                            "sdpMid": c.sdpMid,
                            "sdpMLineIndex": c.sdpMLineIndex,
                        }
                        for c in room.ice_candidates.get(pid, [])
                    ]
                }
                for pid, p in room.participants.items()
            }
        }
        
        # Store in IPFS
        await ipfs.store_message(json.dumps(state))

webrtc = WebRTCManager()
