import requests
import json
import time
from pathlib import Path
import pandas as pd
from datetime import datetime

class CISACollector:
    """Collector for CISA Known Exploited Vulnerabilities."""
    
    def __init__(self):
        self.base_url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
        self.data_dir = Path("cisa_data")
        self.data_dir.mkdir(exist_ok=True)
        
    def collect_vulnerabilities(self):
        """Collect all known exploited vulnerabilities from CISA."""
        print("Collecting vulnerabilities from CISA...")
        
        output_file = self.data_dir / f"cisa_data_{datetime.now().strftime('%Y%m%d')}.json"
        
        # Skip if already collected today
        if output_file.exists():
            print(f"Data already collected today, skipping...")
            return
            
        try:
            # Make API request
            response = requests.get(self.base_url)
            response.raise_for_status()
            data = response.json()
            
            vulnerabilities = []
            for vuln in data.get('vulnerabilities', []):
                entry = {
                    'cve_id': vuln.get('cveID'),
                    'vendor_project': vuln.get('vendorProject'),
                    'product': vuln.get('product'),
                    'vulnerability_name': vuln.get('vulnerabilityName'),
                    'description': vuln.get('shortDescription'),
                    'required_action': vuln.get('requiredAction'),
                    'due_date': vuln.get('dueDate'),
                    'known_ransomware_campaign_use': vuln.get('knownRansomwareCampaignUse', False),
                    'notes': vuln.get('notes'),
                    'autonomous_learning_features': self._extract_learning_features(vuln)
                }
                vulnerabilities.append(entry)
            
            # Save collected data
            if vulnerabilities:
                with open(output_file, 'w') as f:
                    json.dump(vulnerabilities, f)
                print(f"Saved {len(vulnerabilities)} vulnerabilities to {output_file}")
            
        except Exception as e:
            print(f"Error collecting CISA data: {str(e)}")
    
    def _extract_learning_features(self, vuln):
        """Extract features useful for autonomous learning."""
        features = {
            'attack_patterns': [],
            'complexity_indicators': [],
            'potential_impacts': [],
            'mitigation_approaches': []
        }
        
        # Extract attack patterns from description
        desc = (vuln.get('shortDescription', '') + ' ' + vuln.get('vulnerabilityName', '')).lower()
        
        # Common attack pattern indicators
        patterns = {
            'buffer_overflow': ['buffer overflow', 'stack overflow', 'heap overflow'],
            'sql_injection': ['sql injection', 'sqli'],
            'xss': ['cross-site scripting', 'xss'],
            'rce': ['remote code execution', 'rce', 'command execution'],
            'path_traversal': ['path traversal', 'directory traversal'],
            'file_inclusion': ['file inclusion', 'lfi', 'rfi'],
            'deserialization': ['deserialization', 'unsafe deserialization'],
            'xxe': ['xml external entity', 'xxe'],
            'ssrf': ['server-side request forgery', 'ssrf']
        }
        
        for pattern, keywords in patterns.items():
            if any(keyword in desc for keyword in keywords):
                features['attack_patterns'].append(pattern)
        
        # Complexity indicators
        if vuln.get('knownRansomwareCampaignUse'):
            features['complexity_indicators'].append('known_ransomware_use')
        
        # Extract required action as mitigation approach
        if vuln.get('requiredAction'):
            features['mitigation_approaches'].append(vuln['requiredAction'])
        
        return features
    
    def get_collection_stats(self):
        """Get statistics about collected data."""
        stats = {
            'total_vulnerabilities': 0,
            'collection_dates': [],
            'total_size_mb': 0
        }
        
        for data_file in self.data_dir.glob("cisa_data_*.json"):
            date = data_file.stem.split('_')[-1]
            stats['collection_dates'].append(date)
            
            # Get file size in MB
            size_mb = data_file.stat().st_size / (1024 * 1024)
            stats['total_size_mb'] += size_mb
            
            # Count vulnerabilities
            with open(data_file) as f:
                data = json.load(f)
                stats['total_vulnerabilities'] += len(data)
                
        return stats
