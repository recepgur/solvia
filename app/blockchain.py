import aiohttp
import json
import base58
from typing import Optional, List
from solana.rpc.async_api import AsyncClient
from solana.publickey import PublicKey
from solana.system_program import SYS_PROGRAM_ID, create_account, transfer
from solana.transaction import Transaction, TransactionInstruction
from solana.sysvar import SYSVAR_RENT_PUBKEY
import asyncio
import struct

SOLVIO_TOKEN_MINT = "7bsVvXbR3524sgms6zjCF2BN3vHxuLePfb5CrqrPt4MQ"
FEE_AMOUNT = 1_000_000_000  # 1 SOLV token (9 decimals)

class SolanaManager:
    def __init__(self, endpoint: Optional[str] = None):
        self.endpoint = endpoint or "https://api.mainnet-beta.solana.com"
        self.token_address = SOLVIO_TOKEN_MINT
        self._client = AsyncClient(self.endpoint, commitment="confirmed")
        
    async def update_endpoint(self, new_endpoint: str) -> None:
        """Update RPC endpoint and recreate client"""
        self.endpoint = new_endpoint
        await self._client.close()
        self._client = AsyncClient(self.endpoint, commitment="confirmed")
        
    async def _make_rpc_call(self, method: str, params: list) -> dict:
        """Make RPC call using AsyncClient for better reliability"""
        try:
            response = await self._client._provider.make_request(method, params)
            if "error" in response:
                raise Exception(f"RPC error: {response['error']}")
            return response
        except Exception as e:
            print(f"RPC call error: {str(e)}")
            raise
    
    async def verify_signature(self, message: str, signature_str: str, public_key_str: str) -> bool:
        try:
            result = await self._make_rpc_call(
                "getSignatureStatuses",
                [[signature_str]]
            )
            return result.get("result", {}).get("value", [{}])[0] is not None
        except Exception as e:
            print(f"Signature verification error: {str(e)}")
            return False
    
    async def verify_token_balance(self, wallet_address: str) -> bool:
        """Verify if wallet has paid the one-time fee"""
        try:
            # Get fee vault PDA
            fee_vault = PublicKey.find_program_address(
                [b"fee_vault", PublicKey(self.token_address).to_bytes()],
                SYS_PROGRAM_ID
            )[0]
            
            # Check for previous payment
            signatures = await self._client.get_signatures_for_address(fee_vault)
            if signatures.value:
                for sig in signatures.value:
                    tx = await self._client.get_transaction(sig.signature)
                    if tx and tx.value:
                        for ix in tx.value.transaction.message.instructions:
                            if ix.program_id == self.token_address and ix.data[0] == 3:  # Transfer instruction
                                return True
            
            # If no previous payment, check token balance
            accounts = await self._client.get_token_accounts_by_owner(
                PublicKey(wallet_address),
                {"mint": PublicKey(self.token_address)}
            )
            
            if not accounts.value:
                return False
                
            for account in accounts.value:
                info = account.account.data["parsed"]["info"]
                if int(info["tokenAmount"]["amount"]) >= FEE_AMOUNT: 
                    return True
                    
            return False
        except Exception as e:
            print(f"Balance check error: {str(e)}")
            return False

    async def verify_nft_ownership(self, wallet_address: str, nft_mint_address: str) -> bool:
        """Verify if a wallet owns a specific NFT"""
        try:
            result = await self._make_rpc_call(
                "getTokenAccountsByOwner",
                [
                    wallet_address,
                    {"mint": nft_mint_address},
                    {"encoding": "jsonParsed"}
                ]
            )
            
            accounts = result.get("result", {}).get("value", [])
            for account in accounts:
                info = account.get("account", {}).get("data", {}).get("parsed", {}).get("info", {})
                amount = int(info.get("tokenAmount", {}).get("amount", 0))
                if amount == 1:  # NFT should have amount of 1
                    return True
            return False
        except Exception as e:
            print(f"NFT ownership verification error: {str(e)}")
            return False

    async def get_nft_metadata(self, nft_mint_address: str) -> dict: 
        """Get metadata for an NFT"""
        try:
            result = await self._make_rpc_call(
                "getAccountInfo",
                [nft_mint_address, {"encoding": "jsonParsed"}]
            )
            
            metadata = result.get("result", {}).get("value", {})
            if metadata:
                # Get Metadata Program Account
                metadata_pda = await self._make_rpc_call(
                    "getProgramAccounts",
                    [
                        "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
                        {
                            "filters": [
                                {"memcmp": {"offset": 33, "bytes": nft_mint_address}}
                            ]
                        }
                    ]
                )
                
                if metadata_pda.get("result"):
                    return {
                        "mint": nft_mint_address,
                        "metadata": metadata_pda["result"][0]["account"]["data"]
                    }
            return None
        except Exception as e:
            print(f"NFT metadata retrieval error: {str(e)}")
            return None

    async def create_message_queue_pda(self, wallet_address: str) -> PublicKey:
        """Create a PDA to store queued messages for a wallet"""
        try:
            queue_seed = f"msg_queue_{wallet_address}".encode()
            queue_pda = PublicKey.find_program_address(
                [queue_seed],
                SYS_PROGRAM_ID
            )[0]
            return queue_pda
        except Exception as e:
            print(f"Error creating message queue PDA: {str(e)}")
            raise

    async def store_queued_message(self, recipient: str, encrypted_message: str, sender: str) -> bool:
        """Store an encrypted message in recipient's queue PDA"""
        try:
            queue_pda = await self.create_message_queue_pda(recipient)
            
            # Create message data structure
            message_data = struct.pack(
                "<32s32sQ256s",
                bytes.fromhex(sender),
                bytes.fromhex(recipient),
                int(asyncio.get_event_loop().time() * 1000),  # timestamp
                encrypted_message.encode()
            )
            
            # Create instruction to store message
            store_ix = TransactionInstruction(
                program_id=SYS_PROGRAM_ID,
                keys=[
                    {"pubkey": queue_pda, "is_signer": False, "is_writable": True},
                    {"pubkey": SYSVAR_RENT_PUBKEY, "is_signer": False, "is_writable": False}
                ],
                data=message_data
            )
            
            tx = Transaction().add(store_ix)
            await self._client.send_transaction(tx)
            return True
            
        except Exception as e:
            print(f"Error storing queued message: {str(e)}")
            return False
            
    async def get_queued_messages(self, wallet_address: str) -> List[dict]:
        """Get all queued messages for a wallet"""
        try:
            queue_pda = await self.create_message_queue_pda(wallet_address)
            account_info = await self._client.get_account_info(queue_pda)
            
            if not account_info.value:
                return []
                
            messages = []
            data = account_info.value.data
            
            # Parse message data
            offset = 0
            while offset < len(data):
                sender = data[offset:offset+32].hex()
                recipient = data[offset+32:offset+64].hex()
                timestamp = struct.unpack("<Q", data[offset+64:offset+72])[0]
                msg_len = struct.unpack("<H", data[offset+72:offset+74])[0]
                encrypted_content = data[offset+74:offset+74+msg_len].decode()
                
                messages.append({
                    "sender": sender,
                    "recipient": recipient,
                    "timestamp": timestamp,
                    "content": encrypted_content
                })
                
                offset += 74 + msg_len
                
            return messages
            
        except Exception as e:
            print(f"Error getting queued messages: {str(e)}")
            return []
            
    async def clear_message_queue(self, wallet_address: str) -> bool:
        """Clear all queued messages for a wallet after delivery"""
        try:
            queue_pda = await self.create_message_queue_pda(wallet_address)
            
            # Create instruction to clear queue
            clear_ix = TransactionInstruction(
                program_id=SYS_PROGRAM_ID,
                keys=[
                    {"pubkey": queue_pda, "is_signer": False, "is_writable": True}
                ],
                data=struct.pack("<B", 0)  # Clear operation code
            )
            
            tx = Transaction().add(clear_ix)
            await self._client.send_transaction(tx)
            return True
            
        except Exception as e:
            print(f"Error clearing message queue: {str(e)}")
            return False

    async def store_file_metadata(self, owner_address: str, cid: str, file_size: int, encryption_info: str) -> bool:
        """Store file metadata on Solana blockchain using PDA
        
        Args:
            owner_address: The public key of the file owner
            cid: IPFS Content Identifier of the encrypted file
            file_size: Size of the file in bytes
            encryption_info: JSON string containing encryption metadata
            
        Returns:
            bool: True if metadata was stored successfully
        """
        try:
            # Create PDA for file metadata
            seed = f"file_{owner_address}".encode()
            file_pda = PublicKey.find_program_address([seed], SYS_PROGRAM_ID)[0]
            
            # Pack metadata: size (4 bytes) + cid length (2 bytes) + cid + encryption info length (2 bytes) + encryption info
            metadata_struct = struct.pack("<IH", file_size, len(cid)) + \
                            cid.encode() + \
                            struct.pack("<H", len(encryption_info)) + \
                            encryption_info.encode()
            
            # Create instruction to store metadata
            store_ix = TransactionInstruction(
                program_id=SYS_PROGRAM_ID,
                keys=[
                    {"pubkey": file_pda, "is_signer": False, "is_writable": True},
                    {"pubkey": SYSVAR_RENT_PUBKEY, "is_signer": False, "is_writable": False}
                ],
                data=metadata_struct
            )
            
            # Create and send transaction
            tx = Transaction().add(store_ix)
            await self._client.send_transaction(tx)
            return True
            
        except Exception as e:
            print(f"Error storing file metadata: {str(e)}")
            return False

solana = SolanaManager()
