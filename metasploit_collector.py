import requests
import pandas as pd
import json
from datetime import datetime
import time
import os
from git import Repo
import shutil

class MetasploitCollector:
    def __init__(self):
        self.repo_url = "https://github.com/rapid7/metasploit-framework.git"
        self.temp_dir = "temp_msf"
        self.data = []
        self.max_retries = 3
        self.retry_delay = 5  # seconds
        
        # Ensure temp directory doesn't exist
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
        
    def fetch_modules(self):
        """Fetch exploit modules from Metasploit GitHub repository"""
        print("Cloning Metasploit repository...")
        
        for attempt in range(self.max_retries):
            try:
                print(f"Attempt {attempt + 1}/{self.max_retries}...")
                # Clone the repository with depth=1 to speed up download
                Repo.clone_from(self.repo_url, self.temp_dir, depth=1)
                
                # Process modules directory
                modules_dir = os.path.join(self.temp_dir, 'modules', 'exploits')
                
                for root, dirs, files in os.walk(modules_dir):
                    for file in files:
                        if file.endswith('.rb'):
                            module_path = os.path.join(root, file)
                            relative_path = os.path.relpath(module_path, modules_dir)
                            
                            # Read module content
                            with open(module_path, 'r', encoding='utf-8', errors='ignore') as f:
                                content = f.read()
                                
                            # Extract basic info (simple parsing)
                            name = self._extract_info(content, 'Name')
                            description = self._extract_info(content, 'Description')
                            author = self._extract_info(content, 'Author')
                            platform = self._extract_info(content, 'Platform')
                            
                            module_data = {
                                'id': f"MSF-{relative_path}",
                                'name': name,
                                'description': description,
                                'author': author,
                                'platform': platform,
                                'path': relative_path,
                                'source': 'metasploit'
                            }
                            
                            self.data.append(module_data)
                
                # Cleanup
                shutil.rmtree(self.temp_dir)
                print(f"Successfully collected {len(self.data)} Metasploit modules")
                return len(self.data)
                
            except Exception as e:
                print(f"Error: {str(e)}")
                if os.path.exists(self.temp_dir):
                    shutil.rmtree(self.temp_dir)
                if attempt < self.max_retries - 1:
                    print(f"Retrying in {self.retry_delay} seconds...")
                    time.sleep(self.retry_delay)
                    continue
                return 0
        
        return 0  # If all retries failed
    
    def _extract_info(self, content, field):
        """Simple parser to extract information from module files"""
        try:
            if field in content:
                start = content.index(field) + len(field)
                end = content.index('\n', start)
                info = content[start:end].strip()
                info = info.strip("'").strip('"').strip("=>").strip()
                return info
        except:
            pass
        return ''
    
    def save_to_csv(self, filename='metasploit_dataset.csv'):
        """Save collected data to CSV"""
        df = pd.DataFrame(self.data)
        df.to_csv(filename, index=False)
        print(f"Saved {len(df)} modules to {filename}")
    
    def get_dataset(self):
        """Return the collected data as a pandas DataFrame"""
        return pd.DataFrame(self.data)

if __name__ == "__main__":
    collector = MetasploitCollector()
    print("Fetching modules from Metasploit Framework...")
    count = collector.fetch_modules()
    print(f"\nTotal modules fetched: {count}")
    collector.save_to_csv()
