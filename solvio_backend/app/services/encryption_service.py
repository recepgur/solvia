from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from base64 import b64encode, b64decode
import os

class EncryptionService:
    def __init__(self):
        self.group_keys = {}  # group_id -> encryption_key
    
    def generate_group_key(self) -> str:
        """Generate a new encryption key for a group."""
        key = Fernet.generate_key()
        return b64encode(key).decode('utf-8')
    
    def encrypt_group_message(self, message: str, group_id: str) -> str:
        """Encrypt a message using the group's encryption key."""
        if group_id not in self.group_keys:
            raise ValueError("Group key not found")
        
        key = b64decode(self.group_keys[group_id].encode('utf-8'))
        f = Fernet(key)
        encrypted_data = f.encrypt(message.encode('utf-8'))
        return b64encode(encrypted_data).decode('utf-8')
    
    def decrypt_group_message(self, encrypted_message: str, group_id: str) -> str: 
        """Decrypt a message using the group's encryption key."""
        if group_id not in self.group_keys:
            raise ValueError("Group key not found")
        
        key = b64decode(self.group_keys[group_id].encode('utf-8'))
        f = Fernet(key)
        decrypted_data = f.decrypt(b64decode(encrypted_message.encode('utf-8')))
        return decrypted_data.decode('utf-8')
    
    def add_group_key(self, group_id: str, key: str):
        """Add or update a group's encryption key."""
        self.group_keys[group_id] = key
    
    def remove_group_key(self, group_id: str):
        """Remove a group's encryption key."""
        self.group_keys.pop(group_id, None)

encryption_service = EncryptionService()
