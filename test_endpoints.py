import json
import os
import sys

import requests


def test_endpoints():
    base_url = "http://localhost:5000"

    # Test /api/analyze endpoint
    print("\nTesting /api/analyze endpoint...")
    analyze_payload = {"target": "example.com"}
    try:
        response = requests.post(f"{base_url}/api/analyze", json=analyze_payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error testing /api/analyze: {str(e)}")

    # Test /api/generate_exploit endpoint
    print("\nTesting /api/generate_exploit endpoint...")
    exploit_payload = {
        "vulnerability_info": {
            "target": "example.com",
            "type": "test",
            "details": "test vulnerability",
        }
    }
    try:
        response = requests.post(
            f"{base_url}/api/generate_exploit", json=exploit_payload
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error testing /api/generate_exploit: {str(e)}")


if __name__ == "__main__":
    print("Starting endpoint tests...")
    test_endpoints()
