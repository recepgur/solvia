import json
from datetime import datetime

import pandas as pd


class ServerPenetrationCollector:
    def __init__(self):
        """Initialize server penetration pattern collector"""
        self.patterns = []
        self.attack_vectors = set()

    def load_server_patterns(self):
        """Load common server penetration patterns and techniques"""
        server_patterns = {
            "web_server": {
                "pattern": "web server vulnerability",
                "techniques": [
                    "directory traversal",
                    "file inclusion",
                    "command injection",
                    "sql injection",
                    "authentication bypass",
                ],
                "mitre_tactics": [
                    "initial-access",
                    "execution",
                    "privilege-escalation",
                ],
            },
            "database_server": {
                "pattern": "database server vulnerability",
                "techniques": [
                    "sql injection",
                    "nosql injection",
                    "privilege escalation",
                    "data exfiltration",
                ],
                "mitre_tactics": ["initial-access", "execution", "exfiltration"],
            },
            "application_server": {
                "pattern": "application server vulnerability",
                "techniques": [
                    "remote code execution",
                    "deserialization",
                    "memory corruption",
                    "buffer overflow",
                ],
                "mitre_tactics": ["execution", "privilege-escalation", "persistence"],
            },
            "file_server": {
                "pattern": "file server vulnerability",
                "techniques": [
                    "smb exploitation",
                    "nfs exploitation",
                    "authentication bypass",
                    "file permission abuse",
                ],
                "mitre_tactics": ["initial-access", "lateral-movement", "collection"],
            },
        }

        # Convert patterns to DataFrame format
        for server_type, details in server_patterns.items():
            pattern_entry = {
                "type": server_type,
                "pattern": details["pattern"],
                "techniques": json.dumps(details["techniques"]),
                "mitre_tactics": json.dumps(details["mitre_tactics"]),
                "indicators": json.dumps(self._generate_indicators(server_type)),
                "detection_rules": json.dumps(
                    self._generate_detection_rules(server_type)
                ),
            }
            self.patterns.append(pattern_entry)
            self.attack_vectors.update(details["mitre_tactics"])

    def _generate_indicators(self, server_type):
        """Generate indicators for different server types"""
        base_indicators = {
            "web_server": [
                "unusual http methods",
                "malformed requests",
                "path traversal attempts",
                "injection patterns",
            ],
            "database_server": [
                "unusual queries",
                "privilege escalation attempts",
                "data extraction patterns",
                "connection anomalies",
            ],
            "application_server": [
                "memory usage anomalies",
                "process creation patterns",
                "file system changes",
                "network connection patterns",
            ],
            "file_server": [
                "unusual file access patterns",
                "authentication attempts",
                "file transfer anomalies",
                "permission changes",
            ],
        }
        return base_indicators.get(server_type, [])

    def _generate_detection_rules(self, server_type):
        """Generate detection rules for different server types"""
        base_rules = {
            "web_server": [
                "monitor http request patterns",
                "validate input parameters",
                "check file access attempts",
                "analyze response codes",
            ],
            "database_server": [
                "monitor query patterns",
                "track privilege changes",
                "analyze data access",
                "monitor connections",
            ],
            "application_server": [
                "monitor process creation",
                "track memory usage",
                "analyze network connections",
                "monitor file operations",
            ],
            "file_server": [
                "monitor file access",
                "track authentication",
                "analyze transfers",
                "monitor permissions",
            ],
        }
        return base_rules.get(server_type, [])

    def get_patterns_dataset(self):
        """Return server patterns as DataFrame"""
        return pd.DataFrame(self.patterns)

    def get_attack_vectors(self):
        """Return set of MITRE ATT&CK tactics used in patterns"""
        return self.attack_vectors

    def save_patterns(self, filename="server_patterns.csv"):
        """Save patterns to CSV file"""
        df = self.get_patterns_dataset()
        df.to_csv(filename, index=False)
        print(f"Saved {len(df)} server patterns to {filename}")


if __name__ == "__main__":
    collector = ServerPenetrationCollector()
    collector.load_server_patterns()
    collector.save_patterns()
