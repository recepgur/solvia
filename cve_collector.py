import pandas as pd
import requests
import json
import time
import os
from datetime import datetime, timedelta
from pathlib import Path

class CVECollector:
    """Collector for CVE (Common Vulnerabilities and Exposures) data from NVD."""
    
    def __init__(self):
        self.base_url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
        self.dataset = pd.DataFrame()
        self.data_dir = Path("cve_data")
        self.data_dir.mkdir(exist_ok=True)
        
    def collect_historical_cves(self, start_year=1999):
        """Collect all CVEs from start_year to present."""
        current_year = datetime.now().year
        
        for year in range(start_year, current_year + 1):
            print(f"Collecting CVEs for year {year}...")
            self._collect_year_data(year)
            
    def _collect_year_data(self, year):
        """Collect CVEs for a specific year with pagination."""
        output_file = self.data_dir / f"cve_data_{year}.json"
        
        # Skip if already collected
        if output_file.exists():
            print(f"Data for {year} already exists, skipping...")
            return
            
        # Format dates for API
        start_date = f"{year}-01-01T00:00:00.000"
        end_date = f"{year}-12-31T23:59:59.999"
        
        # Build initial query parameters
        params = {
            'pubStartDate': start_date,
            'pubEndDate': end_date,
            'resultsPerPage': 2000,  # Maximum allowed
            'startIndex': 0
        }
        
        all_vulnerabilities = []
        total_collected = 0
        
        while True:
            try:
                # Rate limiting
                time.sleep(6)  # Respect rate limit of 10 requests per minute
                
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
                
                all_vulnerabilities.extend(vulnerabilities)
                total_collected += len(vulnerabilities)
                print(f"Collected {total_collected} CVEs for year {year}")
                
                # Check if we need to paginate
                total_results = data.get('totalResults', 0)
                if total_collected >= total_results:
                    break
                    
                # Update start index for next page
                params['startIndex'] = total_collected
                
            except requests.exceptions.RequestException as e:
                print(f"Error collecting CVE data for {year}: {str(e)}")
                if total_collected > 0:
                    print(f"Saving partial data ({total_collected} entries)")
                    break
                return
            
        # Save collected data
        if all_vulnerabilities:
            with open(output_file, 'w') as f:
                json.dump(all_vulnerabilities, f)
            print(f"Saved {total_collected} CVEs for year {year} to {output_file}")
    
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
        all_data = []
        for data_file in self.data_dir.glob("cve_data_*.json"):
            with open(data_file) as f:
                year_data = json.load(f)
                all_data.extend(year_data)
        self.dataset = pd.DataFrame(all_data)
        return self.dataset
        
    def get_collection_stats(self):
        """Get statistics about collected data."""
        stats = {
            'total_cves': 0,
            'years_collected': [],
            'total_size_mb': 0
        }
        
        for data_file in self.data_dir.glob("cve_data_*.json"):
            year = int(data_file.stem.split('_')[-1])
            stats['years_collected'].append(year)
            
            # Get file size in MB
            size_mb = data_file.stat().st_size / (1024 * 1024)
            stats['total_size_mb'] += size_mb
            
            # Count CVEs
            with open(data_file) as f:
                year_data = json.load(f)
                stats['total_cves'] += len(year_data)
                
        return stats
