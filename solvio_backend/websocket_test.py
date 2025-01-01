import asyncio
import websockets
import json

async def test_websocket():
    # Connect first client (test_wallet_123)
    async with websockets.connect('ws://localhost:8000/messages/real-time?wallet_address=test_wallet_123') as websocket1:
        print("Client 1 connected")
        
        # Connect second client (test_wallet_456)
        async with websockets.connect('ws://localhost:8000/messages/real-time?wallet_address=test_wallet_456') as websocket2:
            print("Client 2 connected")
            
            # Send a test message via HTTP endpoint
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.post('http://localhost:8000/messages/send', 
                    params={
                        'content': 'WebSocket Test Message',
                        'recipient_address': 'test_wallet_456',
                        'wallet_address': 'test_wallet_123'
                    }
                ) as response:
                    print("Message sent via HTTP:", await response.json())
            
            # Wait for the message on client 2
            try:
                message = await asyncio.wait_for(websocket2.recv(), timeout=5.0)
                print("Client 2 received:", message)
                return True
            except asyncio.TimeoutError:
                print("Timeout waiting for message")
                return False

if __name__ == "__main__":
    asyncio.get_event_loop().run_until_complete(test_websocket())
