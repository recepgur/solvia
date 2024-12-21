import unittest
from fastapi.testclient import TestClient
from web_panel.backend.app import app

class TestEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        
    def test_health_check(self):
        """Test the health check endpoint."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "healthy"})
        
    def test_analyze_target_valid(self):
        """Test analyzing a valid target."""
        payload = {
            "target": "test.local",
            "context": {"scan_type": "basic"}
        }
        response = self.client.post("/analyze", json=payload)
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
        response = self.client.post("/analyze", json=payload)
        self.assertEqual(response.status_code, 403)
        
    def test_analyze_target_missing_data(self):
        """Test analyzing with missing data."""
        payload = {}
        response = self.client.post("/analyze", json=payload)
        self.assertEqual(response.status_code, 422)

if __name__ == "__main__":
    unittest.main()
