import pandas as pd
import requests
import json
from datetime import datetime, timedelta

class CVECollector:
    """Collector for CVE (Common Vulnerabilities and Exposures) data from NVD."""
    
    def __init__(self):
        self.base_url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
        self.dataset = pd.DataFrame()
        
    def collect_cves(self, days_back=90):
        """Collect CVEs from the last specified number of days."""
        print(f"Collecting CVEs from the last {days_back} days...")
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # Format dates for API
        pub_start_date = start_date.strftime("%Y-%m-%dT00:00:00.000")
        pub_end_date = end_date.strftime("%Y-%m-%dT23:59:59.999")
        
        # Build query parameters
        params = {
            'pubStartDate': pub_start_date,
            'pubEndDate': pub_end_date,
            'resultsPerPage': 2000  # Maximum allowed
        }
        
        try:
            # Make API request
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Process vulnerabilities
            vulnerabilities = []
            for vuln in data.get('vulnerabilities', []):
                cve = vuln.get('cve', {})
                metrics = cve.get('metrics', {}).get('cvssMetricV31', [{}])[0].get('cvssData', {})
                
                entry = {
                    'id': cve.get('id', ''),
                    'description': cve.get('descriptions', [{}])[0].get('value', ''),
                    'published': cve.get('published', ''),
                    'lastModified': cve.get('lastModified', ''),
                    'baseScore': metrics.get('baseScore', 0.0),
                    'attackVector': metrics.get('attackVector', ''),
                    'attackComplexity': metrics.get('attackComplexity', ''),
                    'privilegesRequired': metrics.get('privilegesRequired', ''),
                    'references': [ref.get('url', '') for ref in cve.get('references', [])],
                    'autonomous_learning_features': self._extract_learning_features(cve)
                }
                vulnerabilities.append(entry)
            
            # Convert to DataFrame
            self.dataset = pd.DataFrame(vulnerabilities)
            print(f"Successfully collected {len(self.dataset)} CVE entries")
            
        except Exception as e:
            print(f"Error collecting CVE data: {str(e)}")
            self.dataset = pd.DataFrame()
    
    def _extract_learning_features(self, cve):
        """Extract features useful for autonomous learning from CVE data."""
        features = {
            'attack_patterns': [],
            'complexity_indicators': [],
            'potential_impacts': [],
            'mitigation_approaches': []
        }
        
        # Extract attack patterns from description
        desc = cve.get('descriptions', [{}])[0].get('value', '').lower()
        
        # Common attack pattern indicators
        if 'buffer overflow' in desc:
            features['attack_patterns'].append('buffer_overflow')
        if 'sql injection' in desc:
            features['attack_patterns'].append('sql_injection')
        if 'cross-site' in desc:
            features['attack_patterns'].append('xss')
        if 'remote code execution' in desc:
            features['attack_patterns'].append('rce')
            
        # Complexity indicators
        metrics = cve.get('metrics', {}).get('cvssMetricV31', [{}])[0].get('cvssData', {})
        features['complexity_indicators'].append(metrics.get('attackComplexity', 'UNKNOWN'))
        
        # Impact indicators
        if metrics.get('confidentialityImpact'):
            features['potential_impacts'].append(f"confidentiality_{metrics['confidentialityImpact']}")
        if metrics.get('integrityImpact'):
            features['potential_impacts'].append(f"integrity_{metrics['integrityImpact']}")
        if metrics.get('availabilityImpact'):
            features['potential_impacts'].append(f"availability_{metrics['availabilityImpact']}")
            
        return features
    
    def get_dataset(self):
        """Return the collected dataset."""
        return self.dataset
