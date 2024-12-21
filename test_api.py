import json
import os

import requests


def test_endpoints():
    base_url = "http://localhost:5000"

    # Test analyze endpoint
    print("\nTesting /api/analyze endpoint...")
    analyze_payload = {
        "target": "example.com",
        "scan_type": "vulnerability_scan",
        "options": {"depth": "full", "stealth_mode": True},
    }

    try:
        response = requests.post(f"{base_url}/api/analyze", json=analyze_payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error testing analyze endpoint: {str(e)}")

    # Test generate_exploit endpoint
    print("\nTesting /api/generate_exploit endpoint...")
    exploit_payload = {
        "target": "example.com",
        "type": "sql_injection",
        "description": "SQL injection vulnerability in login form",
        "severity": "high",
    }

    try:
        response = requests.post(
            f"{base_url}/api/generate_exploit", json=exploit_payload
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error testing generate_exploit endpoint: {str(e)}")


if __name__ == "__main__":
    test_endpoints()
