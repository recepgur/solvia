import unittest
import requests
from typing import Dict, Any

class TestSecurityAPI(unittest.TestCase):
    def setUp(self):
        self.base_url = "http://localhost:8000"
        self.headers = {"Content-Type": "application/json"}
        
    def test_health_check(self):
        """Test the health check endpoint."""
        response = requests.get(f"{self.base_url}/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "healthy"})
        
    def test_analyze_target_valid(self):
        """Test analyzing a valid target."""
        payload = {
            "target": "test.local",
            "context": {"scan_type": "basic"}
        }
        response = requests.post(
            f"{self.base_url}/analyze",
            json=payload,
            headers=self.headers
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("exploit", data)
        
    def test_analyze_target_invalid(self):
        """Test analyzing an invalid target."""
        payload = {
            "target": "malicious.com",
            "context": {"scan_type": "basic"}
        }
        response = requests.post(
            f"{self.base_url}/analyze",
            json=payload,
            headers=self.headers
        )
        self.assertEqual(response.status_code, 403)
        
    def test_analyze_target_missing_data(self):
        """Test analyzing with missing data."""
        payload = {}
        response = requests.post(
            f"{self.base_url}/analyze",
            json=payload,
            headers=self.headers
        )
        self.assertEqual(response.status_code, 422)

if __name__ == "__main__":
    unittest.main()
