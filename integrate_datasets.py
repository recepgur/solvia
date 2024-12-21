import pandas as pd
import json
import logging
from typing import Dict, List
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatasetIntegrator:
    def __init__(self):
        self.output_file = "integrated_security_data.json"
        
    def load_exploit_db_data(self) -> pd.DataFrame:
        """Load ExploitDB data."""
        try:
            return pd.read_csv("exploit_db_data.csv")
        except Exception as e:
            logger.error(f"Error loading ExploitDB data: {e}")
            return pd.DataFrame()
            
    def load_metasploit_data(self) -> List[Dict]:
        """Load Metasploit data."""
        try:
            with open("metasploit_data.json", 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading Metasploit data: {e}")
            return []
            
    def load_mitre_data(self) -> List[Dict]:
        """Load MITRE data."""
        try:
            with open("mitre_data.json", 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading MITRE data: {e}")
            return []
            
    def integrate_datasets(self) -> Dict:
        """Integrate all security datasets."""
        integrated_data = {
            "exploit_db": self.load_exploit_db_data().to_dict('records'),
            "metasploit": self.load_metasploit_data(),
            "mitre": self.load_mitre_data()
        }
        
        return integrated_data
        
    def save_integrated_data(self, data: Dict) -> None:
        """Save integrated data to JSON file."""
        try:
            with open(self.output_file, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"Saved integrated data to {self.output_file}")
        except Exception as e:
            logger.error(f"Error saving integrated data: {e}")
            
    def run(self) -> None:
        """Run the integration process."""
        integrated_data = self.integrate_datasets()
        self.save_integrated_data(integrated_data)

if __name__ == "__main__":
    integrator = DatasetIntegrator()
    integrator.run()
