# Temporary configuration without pydantic-settings dependency
class Settings:
    def __init__(self):
        # Solana Configuration
        self.SOLANA_NETWORK_URL = "https://api.devnet.solana.com"
        self.SOLVIO_TOKEN_ADDRESS = "7bsVvXbR3524sgms6zjCF2BN3vHxuLePfb5CrqrPt4MQ"  # Solvio token mint address
        
        # IPFS Configuration
        self.IPFS_HOST = "localhost"
        self.IPFS_PORT = 5001
        self.IPFS_API_URL = f"http://{self.IPFS_HOST}:{self.IPFS_PORT}/api/v0"
        
        # WebRTC Configuration
        self.STUN_SERVER = "stun:stun.l.google.com:19302"
        self.TURN_SERVER = ""  # Optional, for fallback
        
        # JWT Settings for temporary auth
        self.JWT_SECRET_KEY = "temporary-secret-key"  # Change in production
        self.JWT_ALGORITHM = "HS256"
        
        # Language Support
        self.SUPPORTED_LANGUAGES = ["en", "tr"]

        # Try to load from .env if exists
        self._load_env()
    
    def _load_env(self):
        """Attempt to load configuration from .env file"""
        try:
            with open(".env") as f:
                for line in f:
                    if line.strip() and not line.startswith('#'):
                        key, value = line.strip().split('=', 1)
                        if hasattr(self, key):
                            setattr(self, key, value)
        except FileNotFoundError:
            pass  # Use defaults if .env doesn't exist

settings = Settings()
