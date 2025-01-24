from cryptography.fernet import Fernet
from typing import Optional, Tuple
import base64
import os

class EncryptionManager:
    @staticmethod
    def generate_key() -> bytes:
        """Generate a new encryption key"""
        return Fernet.generate_key()
    
    @staticmethod
    def encrypt_message(message: str, key: bytes) -> Tuple[str, str]:
        """Encrypt a message using Fernet (AES)"""
        try:
            f = Fernet(key)
            encrypted_data = f.encrypt(message.encode())
            return base64.b64encode(encrypted_data).decode(), base64.b64encode(key).decode()
        except Exception as e:
            print(f"Encryption error: {e}")
            raise
    
    @staticmethod
    def decrypt_message(encrypted_message: str, key: str) -> Optional[str]:
        """Decrypt a message using Fernet (AES)"""
        try:
            f = Fernet(base64.b64decode(key))
            decrypted_data = f.decrypt(base64.b64decode(encrypted_message))
            return decrypted_data.decode()
        except Exception as e:
            print(f"Decryption error: {e}")
            return None
