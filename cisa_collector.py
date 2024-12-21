import requests
import json
import logging
from typing import List, Dict
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CISACollector:
    def __init__(self):
        self.output_file = "cisa_advisories.json"
        self.api_url = "https://www.cisa.gov/api/known-exploited-vulnerabilities"
        
    def collect_advisories(self) -> List[Dict]:
        """Collect vulnerability data from CISA."""
        try:
            logger.info("Collecting CISA vulnerability data")
            response = requests.get(self.api_url)
            if response.status_code == 200:
                return response.json()["vulnerabilities"]
            else:
                logger.error(f"Failed to collect data: {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error collecting advisories: {e}")
            return []
            
    def save_data(self, advisories: List[Dict]) -> None:
        """Save collected advisories to JSON file."""
        if not advisories:
            logger.warning("No advisories to save")
            return
            
        try:
            with open(self.output_file, 'w') as f:
                json.dump(advisories, f, indent=2)
            logger.info(f"Saved {len(advisories)} advisories to {self.output_file}")
        except Exception as e:
            logger.error(f"Error saving advisories: {e}")
            
    def run(self) -> None:
        """Run the collection process."""
        advisories = self.collect_advisories()
        self.save_data(advisories)

if __name__ == "__main__":
    collector = CISACollector()
    collector.run()
