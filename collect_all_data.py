import pandas as pd
from exploit_db_collector import ExploitDBCollector
from metasploit_collector import MetasploitCollector
from mitre_collector import MITRECollector
import time
from datetime import datetime

def collect_all_datasets():
    """Collect data from all sources and combine them"""
    print("Starting data collection from all sources...")
    
    # Initialize collectors
    exploit_collector = ExploitDBCollector()
    metasploit_collector = MetasploitCollector()
    mitre_collector = MITRECollector()
    
    # Collect data from each source
    print("\n=== Collecting Exploit-DB data ===")
    exploit_count = exploit_collector.fetch_exploits()
    exploit_collector.save_to_csv()
    
    print("\n=== Collecting Metasploit data ===")
    metasploit_count = metasploit_collector.fetch_modules()
    metasploit_collector.save_to_csv()
    
    print("\n=== Collecting MITRE ATT&CK data ===")
    mitre_count = mitre_collector.fetch_tactics()
    mitre_collector.save_to_csv()
    
    # Print summary
    print("\n=== Collection Summary ===")
    print(f"Exploit-DB entries: {exploit_count}")
    print(f"Metasploit modules: {metasploit_count}")
    print(f"MITRE ATT&CK entries: {mitre_count}")
    print(f"Total entries: {exploit_count + metasploit_count + mitre_count}")
    
    # Save collection timestamp
    with open('last_collection.txt', 'w') as f:
        f.write(datetime.now().isoformat())

if __name__ == "__main__":
    collect_all_datasets()
