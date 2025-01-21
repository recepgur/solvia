from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization
from base64 import b64encode, b64decode
from typing import Tuple, Optional
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
            return b64encode(encrypted_data).decode(), b64encode(key).decode()
        except Exception as e:
            print(f"Encryption error: {e}")
            raise
    
    @staticmethod
    def decrypt_message(encrypted_message: str, key: str) -> Optional[str]:
        """Decrypt a message using Fernet (AES)"""
        try:
            f = Fernet(b64decode(key))
            decrypted_data = f.decrypt(b64decode(encrypted_message))
            return decrypted_data.decode()
        except Exception as e:
            print(f"Decryption error: {e}")
            return None
    
    @staticmethod
    def derive_key(password: str, salt: Optional[bytes] = None) -> Tuple[bytes, bytes]:
        """Derive an encryption key from a password"""
        if salt is None:
            salt = os.urandom(16)
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        
        key = kdf.derive(password.encode())
        return key, salt
