import aiohttp
import json
from .config import settings

class SolanaManager:
    def __init__(self):
        self.endpoint = settings.SOLANA_NETWORK_URL
        self.token_address = settings.SOLVIO_TOKEN_ADDRESS
        
    async def _make_rpc_call(self, method: str, params: list) -> dict:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.endpoint,
                json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
            ) as response:
                return await response.json()
    
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
    
    async def verify_token_balance(self, wallet_address: str, required_amount: float) -> bool:
        try:
            # Get token account by owner
            result = await self._make_rpc_call(
                "getTokenAccountsByOwner",
                [
                    wallet_address,
                    {"mint": self.token_address},
                    {"encoding": "jsonParsed"}
                ]
            )
            
            accounts = result.get("result", {}).get("value", [])
            total_balance = 0
            
            for account in accounts:
                info = account.get("account", {}).get("data", {}).get("parsed", {}).get("info", {})
                total_balance += float(info.get("tokenAmount", {}).get("amount", 0))
            
            return total_balance >= required_amount
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

solana = SolanaManager()
