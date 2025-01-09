import sqlite3
import asyncio
import uvloop
import nacl
import aiohttp
import grpc
from google.protobuf import __version__ as protobuf_version

def verify_dependencies():
    """Verify all core dependencies are working."""
    print("Verifying dependencies:")
    
    # Check SQLite
    print(f"SQLite version: {sqlite3.sqlite_version}")
    
    # Check asyncio and uvloop
    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
    loop = asyncio.new_event_loop()
    print("asyncio + uvloop: OK")
    
    # Check PyNaCl
    print(f"PyNaCl version: {nacl.__version__}")
    
    # Check Protocol Buffers
    print(f"Protocol Buffers version: {protobuf_version}")
    
    # Check gRPC
    print(f"gRPC version: {grpc.__version__}")
    
    print("\nAll core dependencies verified successfully!")

if __name__ == "__main__":
    verify_dependencies()
