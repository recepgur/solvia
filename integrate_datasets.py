import pandas as pd
import json
from datetime import datetime
import numpy as np

def load_datasets():
    """Load all collected datasets"""
    print("Loading datasets...")
    
    try:
        # Load datasets with proper chunk size for memory efficiency
        print("Loading ExploitDB dataset...")
        exploitdb_chunks = pd.read_csv('exploitdb_dataset.csv', chunksize=1000)
        exploitdb_df = pd.concat(exploitdb_chunks)
        print(f"Loaded {len(exploitdb_df)} ExploitDB entries")
        
        print("Loading Metasploit dataset...")
        metasploit_df = pd.read_csv('metasploit_dataset.csv')
        print(f"Loaded {len(metasploit_df)} Metasploit entries")
        
        print("Loading MITRE ATT&CK dataset...")
        mitre_df = pd.read_csv('mitre_dataset.csv')
        print(f"Loaded {len(mitre_df)} MITRE ATT&CK entries")
        
        # Basic data validation
        required_columns = {
            'exploitdb': ['id', 'description', 'tags'],
            'metasploit': ['id', 'description'],
            'mitre': ['id', 'name', 'description']
        }
        
        for df, name, cols in [
            (exploitdb_df, 'exploitdb', required_columns['exploitdb']),
            (metasploit_df, 'metasploit', required_columns['metasploit']),
            (mitre_df, 'mitre', required_columns['mitre'])
        ]:
            missing = [col for col in cols if col not in df.columns]
            if missing:
                raise ValueError(f"Missing required columns in {name} dataset: {missing}")
        
        return exploitdb_df, metasploit_df, mitre_df
        
    except Exception as e:
        print(f"Error loading datasets: {str(e)}")
        raise

def prepare_tactic_patterns(mitre_df):
    """Prepare regex patterns for efficient matching"""
    import re
    patterns = {}
    for _, tactic in mitre_df.iterrows():
        # Create pattern from tactic name and key terms from description
        name_pattern = re.escape(str(tactic['name']).lower())
        desc_terms = set(str(tactic['description']).lower().split())
        # Filter out common words and create pattern
        key_terms = [term for term in desc_terms if len(term) > 4]
        pattern = f"({name_pattern}|{'|'.join(re.escape(term) for term in key_terms[:5])})"
        patterns[tactic['id']] = (re.compile(pattern), tactic['name'])
    return patterns

def map_tactics_to_exploits(exploitdb_df, mitre_df):
    """Map MITRE ATT&CK tactics to exploits based on descriptions and tags"""
    print("Preparing tactic patterns...")
    patterns = prepare_tactic_patterns(mitre_df)
    
    print("Mapping MITRE ATT&CK tactics to exploits...")
    tactic_mapping = {}
    total = len(exploitdb_df)
    
    # Process in chunks of 1000
    chunk_size = 1000
    for start in range(0, total, chunk_size):
        end = min(start + chunk_size, total)
        chunk = exploitdb_df.iloc[start:end]
        
        # Process chunk
        for idx, exploit in chunk.iterrows():
            if idx % 1000 == 0:
                print(f"Processing exploit {idx}/{total}...")
            
            matched_tactics = []
            text = f"{str(exploit['description']).lower()} {str(exploit['tags']).lower()}"
            
            # Use pre-compiled patterns for matching
            for tactic_id, (pattern, name) in patterns.items():
                if pattern.search(text):
                    matched_tactics.append(tactic_id)
            
            if matched_tactics:
                tactic_mapping[exploit['id']] = matched_tactics
    
    print(f"Mapped tactics to {len(tactic_mapping)} exploits")
    return tactic_mapping

def match_patterns(description, patterns_df, pattern_type='network'):
    """Match patterns to exploit description"""
    matched_patterns = []
    for _, pattern in patterns_df.iterrows():
        if pattern['pattern'].lower() in description.lower():
            pattern_data = {
                'type': pattern['type'],
                'pattern_category': pattern_type,
                'indicators': json.loads(pattern['indicators']),
                'mitre_tactics': json.loads(pattern['mitre_tactics']),
                'detection_rules': json.loads(pattern['detection_rules'])
            }
            if 'techniques' in pattern:
                pattern_data['techniques'] = json.loads(pattern['techniques'])
            matched_patterns.append(pattern_data)
    return matched_patterns

def create_integrated_dataset(exploitdb_df, metasploit_df, mitre_df, cve_df, tactic_mapping):
    """Create an integrated dataset combining all sources including CVE data"""
    print("Creating integrated dataset...")
    
    # Initialize pattern collectors
    from network_pattern_collector import NetworkPatternCollector
    from server_penetration_collector import ServerPenetrationCollector
    from agent_deployment_collector import AgentDeploymentCollector
    
    # Load network patterns
    net_collector = NetworkPatternCollector()
    net_collector.load_network_patterns()
    network_patterns_df = net_collector.get_patterns_dataset()
    
    # Load server penetration patterns
    server_collector = ServerPenetrationCollector()
    server_collector.load_server_patterns()
    server_patterns_df = server_collector.get_patterns_dataset()
    
    # Load agent deployment patterns
    agent_collector = AgentDeploymentCollector()
    agent_collector.load_agent_patterns()
    agent_patterns_df = agent_collector.get_patterns_dataset()
    
    # Create a list to store all entries
    integrated_data = []
    
    # Process ExploitDB entries
    for _, exploit in exploitdb_df.iterrows():
        # Match patterns
        matched_network_patterns = match_patterns(exploit['description'], network_patterns_df, 'network')
        matched_server_patterns = match_patterns(exploit['description'], server_patterns_df, 'server')
        matched_agent_patterns = match_patterns(exploit['description'], agent_patterns_df, 'agent')
        
        # Determine complexity and privileges
        complexity = 'high' if any('root' in p.get('techniques', []) for p in matched_server_patterns) else 'medium'
        privileges = 'root' if 'root' in exploit['description'].lower() else 'user'
        
        # Calculate detection probability based on number of patterns
        detection_prob = min(0.8, 0.3 + 0.1 * (len(matched_network_patterns) + len(matched_server_patterns)))
        
        # Extract agent capabilities and learning features
        agent_capabilities = []
        learning_features = []
        for pattern in matched_agent_patterns:
            if 'capabilities' in pattern:
                agent_capabilities.extend(json.loads(pattern['capabilities']))
            if 'learning_features' in pattern:
                learning_features.append(json.loads(pattern['learning_features']))
        
        entry = {
            'id': exploit['id'],
            'type': 'exploit',
            'source': 'exploit-db',
            'description': exploit['description'],
            'platform': exploit['platform'],
            'date': exploit['published'],
            'author': exploit['author'],
            'verified': exploit['verified'],
            'tactics': tactic_mapping.get(exploit['id'], []),
            'tags': exploit['tags'],
            'codes': exploit['codes'],
            'network_patterns': matched_network_patterns,
            'server_patterns': matched_server_patterns,
            'autonomous_learning_features': {
                'success_rate': 0.0,
                'complexity': complexity,
                'detection_probability': detection_prob,
                'required_privileges': privileges,
                'attack_vectors': list(set(
                    [t for p in matched_network_patterns + matched_server_patterns + matched_agent_patterns
                     for t in p.get('mitre_tactics', [])]
                )),
                'agent_capabilities': list(set(agent_capabilities)),
                'learning_features': learning_features,
                'self_improvement_metrics': {
                    'adaptation_rate': sum([f.get('adaptation_rate', 0.1) for f in learning_features]) / max(len(learning_features), 1),
                    'learning_capabilities': list(set([cap for f in learning_features for cap in f.get('learning_capabilities', [])])),
                    'improvement_metrics': list(set([metric for f in learning_features for metric in f.get('improvement_metrics', [])]))
                }
            }
        }
        integrated_data.append(entry)
    
    # Process CVE entries
    print("Processing CVE entries...")
    for _, cve in cve_df.iterrows():
        matched_network_patterns = match_patterns(cve['description'], network_patterns_df, 'network')
        matched_server_patterns = match_patterns(cve['description'], server_patterns_df, 'server')
        matched_agent_patterns = match_patterns(cve['description'], agent_patterns_df, 'agent')
        
        entry = {
            'id': cve['id'],
            'type': 'vulnerability',
            'source': 'nvd',
            'description': cve['description'],
            'date': cve['published'],
            'severity': cve['baseScore'],
            'attack_vector': cve['attackVector'],
            'attack_complexity': cve['attackComplexity'],
            'privileges_required': cve['privilegesRequired'],
            'references': cve['references'],
            'network_patterns': matched_network_patterns,
            'server_patterns': matched_server_patterns,
            'autonomous_learning_features': cve['autonomous_learning_features']
        }
        integrated_data.append(entry)
    
    # Process Metasploit entries
    print("Processing Metasploit entries...")
    for _, module in metasploit_df.iterrows():
        entry = {
            'id': module['id'],
            'type': 'module',
            'source': 'metasploit',
            'description': module['description'],
            'platform': module['platform'],
            'date': module.get('date', ''),
            'author': module['author'],
            'verified': True,  # Metasploit modules are typically verified
            'tactics': [],  # Will be populated in next phase
            'tags': module.get('references', ''),
            'codes': ''
        }
        integrated_data.append(entry)
    
    # Create DataFrame
    integrated_df = pd.DataFrame(integrated_data)
    
    # Save to CSV
    output_file = 'integrated_security_dataset.csv'
    integrated_df.to_csv(output_file, index=False)
    
    # Print summary statistics
    print("\nDataset Integration Summary:")
    print(f"ExploitDB entries: {len(exploitdb_df)}")
    print(f"Metasploit entries: {len(metasploit_df)}")
    print(f"MITRE ATT&CK entries: {len(mitre_df)}")
    print(f"CVE entries: {len(cve_df)}")
    print(f"Total integrated entries: {len(integrated_df)}")
    print(f"\nSaved all entries to {output_file}")
    
    return integrated_df

def main():
    print("\nStarting comprehensive security dataset integration...")
    
    # Load datasets
    exploitdb_df, metasploit_df, mitre_df = load_datasets()
    
    # Import pandas at the top level
    import pandas as pd
    
    # Collect CVE data
    try:
        import sys
        import os
        current_dir = os.path.dirname(os.path.abspath(__file__))
        if current_dir not in sys.path:
            sys.path.append(current_dir)
        from cve_collector import CVECollector
        cve_collector = CVECollector()
        cve_collector.collect_cves(days_back=90)  # Collect last 90 days of CVEs
        cve_df = cve_collector.get_dataset()
        print(f"\nCollected {len(cve_df)} CVE entries")
    except Exception as e:
        print(f"Warning: Could not load CVE data: {str(e)}")
        print("Continuing with empty CVE dataset...")
        cve_df = pd.DataFrame()
    
    # Map MITRE ATT&CK tactics to exploits
    print("\nMapping MITRE ATT&CK tactics to exploits...")
    tactic_mapping = map_tactics_to_exploits(exploitdb_df, mitre_df)
    
    # Create integrated dataset with CVE data
    integrated_df = create_integrated_dataset(exploitdb_df, metasploit_df, mitre_df, cve_df, tactic_mapping)
    
    print("\n=== Integration Summary ===")
    print(f"Total entries: {len(integrated_df)}")
    print(f"Entries with mapped tactics: {len([x for x in integrated_df['tactics'] if x])}")
    print("Integration complete!")

if __name__ == "__main__":
    main()
