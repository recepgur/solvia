import requests
import pandas as pd
import json
from datetime import datetime
import time
import os

class MITRECollector:
    def __init__(self):
        self.base_url = "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json"
        self.max_retries = 3
        self.retry_delay = 5  # seconds
        self.headers = {
            'User-Agent': 'SecurityResearchBot/1.0'
        }
        self.data = []
        
    def fetch_tactics(self):
        """Fetch MITRE ATT&CK tactics and techniques"""
        print("Downloading MITRE ATT&CK framework data...")
        
        for attempt in range(self.max_retries):
            try:
                print(f"Attempt {attempt + 1}/{self.max_retries}...")
                response = requests.get(self.base_url, headers=self.headers, timeout=30)
                
                if response.status_code == 200:
                    attack_data = response.json()
                    objects = attack_data.get('objects', [])
                    
                    # Process tactics and techniques
                    for obj in objects:
                        if obj.get('type') in ['attack-pattern', 'x-mitre-tactic']:
                            tactic_data = {
                                'id': obj.get('external_references', [{}])[0].get('external_id', ''),
                                'name': obj.get('name', ''),
                                'type': obj.get('type', ''),
                                'description': obj.get('description', ''),
                                'platforms': obj.get('x_mitre_platforms', []),
                                'detection': obj.get('x_mitre_detection', ''),
                                'source': 'mitre-attack'
                            }
                            
                            # Add relationships if available
                            if 'kill_chain_phases' in obj:
                                tactic_data['tactics'] = [phase['phase_name'] for phase in obj['kill_chain_phases']]
                            
                            self.data.append(tactic_data)
                    
                    print(f"Successfully collected {len(self.data)} MITRE ATT&CK entries")
                    return len(self.data)
                    
                else:
                    print(f"Error downloading MITRE ATT&CK data: {response.status_code}")
                    if attempt < self.max_retries - 1:
                        print(f"Retrying in {self.retry_delay} seconds...")
                        time.sleep(self.retry_delay)
                        continue
                    return 0
                    
            except Exception as e:
                print(f"Error: {str(e)}")
                if attempt < self.max_retries - 1:
                    print(f"Retrying in {self.retry_delay} seconds...")
                    time.sleep(self.retry_delay)
                    continue
                return 0
        
        return 0  # If all retries failed
    
    def save_to_csv(self, filename='mitre_dataset.csv'):
        """Save collected data to CSV"""
        df = pd.DataFrame(self.data)
        df.to_csv(filename, index=False)
        print(f"Saved {len(df)} entries to {filename}")
    
    def get_dataset(self):
        """Return the collected data as a pandas DataFrame"""
        return pd.DataFrame(self.data)

if __name__ == "__main__":
    collector = MITRECollector()
    print("Fetching MITRE ATT&CK framework data...")
    count = collector.fetch_tactics()
    print(f"\nTotal entries fetched: {count}")
    collector.save_to_csv()
