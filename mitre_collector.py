import requests
import json
import logging
from typing import List, Dict
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MITRECollector:
    def __init__(self):
        self.output_file = "mitre_data.json"
        self.base_url = "https://attack.mitre.org/api/"
        
    def collect_techniques(self) -> List[Dict]:
        """Collect MITRE ATT&CK techniques."""
        try:
            logger.info("Collecting MITRE ATT&CK techniques")
            response = requests.get(f"{self.base_url}techniques/enterprise/")
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to collect techniques: {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error collecting techniques: {e}")
            return []
            
    def save_data(self, techniques: List[Dict]) -> None:
        """Save collected techniques to JSON file."""
        if not techniques:
            logger.warning("No techniques to save")
            return
            
        try:
            with open(self.output_file, 'w') as f:
                json.dump(techniques, f, indent=2)
            logger.info(f"Saved {len(techniques)} techniques to {self.output_file}")
        except Exception as e:
            logger.error(f"Error saving techniques: {e}")
            
    def run(self) -> None:
        """Run the collection process."""
        techniques = self.collect_techniques()
        self.save_data(techniques)

if __name__ == "__main__":
    collector = MITRECollector()
    collector.run()
