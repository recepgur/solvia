import requests
import json
import logging
from typing import List, Dict
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MetasploitCollector:
    def __init__(self):
        self.output_file = "metasploit_data.json"
        self.api_url = "https://raw.githubusercontent.com/rapid7/metasploit-framework/master/db/modules_metadata_base.json"
        
    def collect_modules(self) -> List[Dict]:
        """Collect Metasploit module data."""
        try:
            logger.info("Collecting Metasploit module data")
            response = requests.get(self.api_url)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to collect data: {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error collecting module data: {e}")
            return []
            
    def save_data(self, modules: List[Dict]) -> None:
        """Save collected module data to JSON file."""
        if not modules:
            logger.warning("No modules to save")
            return
            
        try:
            with open(self.output_file, 'w') as f:
                json.dump(modules, f, indent=2)
            logger.info(f"Saved {len(modules)} modules to {self.output_file}")
        except Exception as e:
            logger.error(f"Error saving modules: {e}")
            
    def run(self) -> None:
        """Run the collection process."""
        modules = self.collect_modules()
        self.save_data(modules)

if __name__ == "__main__":
    collector = MetasploitCollector()
    collector.run()
