from typing import Optional
from datetime import datetime
from ..models import Message, ChainType, CrossChainStatus
import json
import aiohttp
from web3 import Web3
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey

class BridgeConfig:
    LAYERZERO_ENDPOINTS = {
        ChainType.ETHEREUM: "https://mainnet.layerzero-endpoints.com/api/v1",
        ChainType.SOLANA: "https://solana.layerzero-endpoints.com/api/v1",
        ChainType.POLYGON: "https://polygon.layerzero-endpoints.com/api/v1",
        ChainType.BSC: "https://bsc.layerzero-endpoints.com/api/v1"
    }
    
    CHAIN_RPC = {
        ChainType.ETHEREUM: "https://mainnet.infura.io/v3/${INFURA_KEY}",
        ChainType.SOLANA: "https://api.mainnet-beta.solana.com",
        ChainType.POLYGON: "https://polygon-rpc.com",
        ChainType.BSC: "https://bsc-dataseed.binance.org"
    }

class BridgeService:
    def __init__(self):
        self.solana_client = AsyncClient("https://api.mainnet-beta.solana.com")
        self.web3_clients = {
            chain: Web3(Web3.HTTPProvider(rpc))
            for chain, rpc in BridgeConfig.CHAIN_RPC.items()
            if chain != ChainType.SOLANA
        }

    async def estimate_bridge_fee(
        self,
        origin_chain: ChainType,
        destination_chain: ChainType
    ) -> float:
        """Estimate the fee for bridging a message between chains."""
        async with aiohttp.ClientSession() as session:
            endpoint = BridgeConfig.LAYERZERO_ENDPOINTS[origin_chain]
            async with session.post(
                f"{endpoint}/estimateFee",
                json={
                    "sourceChain": origin_chain,
                    "destinationChain": destination_chain,
                    "messageSize": 256  # Approximate size for a typical message
                }
            ) as response:
                data = await response.json()
                return float(data["fee"])

    async def send_cross_chain_message(self, message: Message) -> Optional[str]:
        """Send a message across chains using LayerZero protocol."""
        try:
            # Estimate bridge fee
            fee = await self.estimate_bridge_fee(
                message.origin_chain,
                message.destination_chain
            )
            message.bridge_fee = fee
            
            # Prepare message payload
            payload = {
                "id": message.id,
                "content": message.content,
                "sender": message.sender_address,
                "recipient": message.recipient_address,
                "timestamp": message.timestamp.isoformat()
            }
            
            # Send message through LayerZero
            async with aiohttp.ClientSession() as session:
                endpoint = BridgeConfig.LAYERZERO_ENDPOINTS[message.origin_chain]
                async with session.post(
                    f"{endpoint}/sendMessage",
                    json={
                        "sourceChain": message.origin_chain,
                        "destinationChain": message.destination_chain,
                        "payload": json.dumps(payload),
                        "fee": str(fee)
                    }
                ) as response:
                    data = await response.json()
                    return data.get("transactionHash")
        except Exception as e:
            print(f"Error sending cross-chain message: {e}")
            return None

    async def verify_message_delivery(
        self,
        message: Message,
        tx_hash: str
    ) -> bool:
        """Verify if a cross-chain message has been delivered."""
        try:
            async with aiohttp.ClientSession() as session:
                endpoint = BridgeConfig.LAYERZERO_ENDPOINTS[message.origin_chain]
                async with session.get(
                    f"{endpoint}/message/{tx_hash}/status"
                ) as response:
                    data = await response.json()
                    return data["status"] == "DELIVERED"
        except Exception as e:
            print(f"Error verifying message delivery: {e}")
            return False

    async def format_chain_specific_message(
        self,
        message: Message
    ) -> dict:
        """Format message according to destination chain requirements."""
        base_payload = {
            "id": message.id,
            "content": message.content,
            "sender": message.sender_address,
            "recipient": message.recipient_address,
            "timestamp": message.timestamp.isoformat(),
            "origin_chain": message.origin_chain,
            "destination_chain": message.destination_chain
        }
        
        
        if message.destination_chain == ChainType.SOLANA:
            # Format for Solana - compact binary format
            return {
                **base_payload,
                "format": "solana",
                "encoding": "base58"
            }
        else: 
            # Format for EVM chains
            return {
                **base_payload,
                "format": "evm",
                "encoding": "hex"
            }

bridge_service = BridgeService()
