import json
from datetime import datetime

import numpy as np
import pandas as pd


class NetworkPatternCollector:
    def __init__(self):
        """Initialize network pattern collector"""
        self.patterns = []
        self.attack_vectors = set()

    def load_network_patterns(self):
        """Load common network attack patterns and signatures"""
        # Common network attack patterns (for training purposes only)
        attack_patterns = {
            "port_scan": {
                "pattern": "rapid sequential port access",
                "indicators": ["multiple_ports", "sequential_access"],
                "mitre_tactics": ["reconnaissance", "discovery"],
            },
            "dos_pattern": {
                "pattern": "high frequency requests",
                "indicators": ["high_volume", "repeated_requests"],
                "mitre_tactics": ["impact"],
            },
            "injection_pattern": {
                "pattern": "malformed protocol requests",
                "indicators": ["invalid_format", "overflow_attempt"],
                "mitre_tactics": ["initial-access", "execution"],
            },
            "lateral_movement": {
                "pattern": "unusual internal network traversal",
                "indicators": ["network_sweep", "credential_use"],
                "mitre_tactics": ["lateral-movement", "discovery"],
            },
        }

        # Convert patterns to DataFrame format
        for attack_type, details in attack_patterns.items():
            pattern_entry = {
                "type": attack_type,
                "pattern": details["pattern"],
                "indicators": json.dumps(details["indicators"]),
                "mitre_tactics": json.dumps(details["mitre_tactics"]),
                "description": f"Network pattern for {attack_type}",
                "detection_rules": json.dumps(
                    self._generate_detection_rules(attack_type)
                ),
            }
            self.patterns.append(pattern_entry)
            self.attack_vectors.update(details["mitre_tactics"])

    def _generate_detection_rules(self, attack_type):
        """Generate detection rules for different attack types"""
        base_rules = {
            "port_scan": [
                "multiple connection attempts",
                "sequential port numbers",
                "rapid succession",
            ],
            "dos_pattern": [
                "request frequency threshold",
                "bandwidth consumption",
                "connection count",
            ],
            "injection_pattern": [
                "payload signature matching",
                "protocol violation",
                "input validation",
            ],
            "lateral_movement": [
                "unusual path traversal",
                "credential usage patterns",
                "network segment crossing",
            ],
        }
        return base_rules.get(attack_type, [])

    def get_patterns_dataset(self):
        """Return network patterns as DataFrame"""
        return pd.DataFrame(self.patterns)

    def get_attack_vectors(self):
        """Return set of MITRE ATT&CK tactics used in patterns"""
        return self.attack_vectors

    def save_patterns(self, filename="network_patterns.csv"):
        """Save patterns to CSV file"""
        df = self.get_patterns_dataset()
        df.to_csv(filename, index=False)
        print(f"Saved {len(df)} network patterns to {filename}")


if __name__ == "__main__":
    collector = NetworkPatternCollector()
    collector.load_network_patterns()
    collector.save_patterns()
