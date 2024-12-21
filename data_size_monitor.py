import os
import json
import logging
from typing import Dict
from pathlib import Path
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataSizeMonitor:
    def __init__(self):
        self.output_file = "data_sizes.json"
        self.data_files = [
            "exploit_db_data.csv",
            "metasploit_data.json",
            "mitre_data.json",
            "cisa_advisories.json",
            "github_advisories.json",
            "snyk_vulnerabilities.json"
        ]
        
    def get_file_sizes(self) -> Dict[str, int]:
        """Get sizes of all data files."""
        sizes = {}
        for filename in self.data_files:
            try:
                if os.path.exists(filename):
                    sizes[filename] = os.path.getsize(filename)
                else:
                    sizes[filename] = 0
            except Exception as e:
                logger.error(f"Error getting size of {filename}: {e}")
                sizes[filename] = 0
        return sizes
        
    def save_sizes(self, sizes: Dict[str, int]) -> None:
        """Save file sizes to JSON file."""
        try:
            data = {
                "timestamp": datetime.now().isoformat(),
                "sizes": sizes
            }
            with open(self.output_file, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"Saved size data to {self.output_file}")
        except Exception as e:
            logger.error(f"Error saving size data: {e}")
            
    def run(self) -> None:
        """Run the size monitoring process."""
        sizes = self.get_file_sizes()
        self.save_sizes(sizes)

if __name__ == "__main__":
    monitor = DataSizeMonitor()
    monitor.run()
