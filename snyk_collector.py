import json
import time
from datetime import datetime
from pathlib import Path

import pandas as pd
import requests


class SnykCollector:
    """Collector for Snyk Vulnerability Database."""

    def __init__(self):
        self.base_url = "https://security.snyk.io/api/listing"
        self.data_dir = Path("snyk_data")
        self.data_dir.mkdir(exist_ok=True)

    def collect_vulnerabilities(self, page_size=100):
        """Collect all vulnerabilities from Snyk."""
        print("Collecting vulnerabilities from Snyk...")

        output_file = (
            self.data_dir / f"snyk_data_{datetime.now().strftime('%Y%m%d')}.json"
        )

        # Skip if already collected today
        if output_file.exists():
            print(f"Data already collected today, skipping...")
            return

        all_vulnerabilities = []
        page = 1
        total_collected = 0

        while True:
            try:
                # Rate limiting
                time.sleep(2)

                # Make API request
                params = {"page": page, "pageSize": page_size, "sortBy": "newest"}

                response = requests.get(self.base_url, params=params)
                response.raise_for_status()
                data = response.json()

                if not data.get("vulnerabilities"):
                    break

                # Process vulnerabilities
                vulnerabilities = []
                for vuln in data["vulnerabilities"]:
                    entry = {
                        "id": vuln.get("id"),
                        "title": vuln.get("title"),
                        "description": vuln.get("description"),
                        "severity": vuln.get("severity"),
                        "package": vuln.get("package"),
                        "version": vuln.get("version"),
                        "exploit": vuln.get("exploit"),
                        "type": vuln.get("type"),
                        "published": vuln.get("published"),
                        "references": vuln.get("references", []),
                        "cves": vuln.get("identifiers", {}).get("CVE", []),
                        "autonomous_learning_features": self._extract_learning_features(
                            vuln
                        ),
                    }
                    vulnerabilities.append(entry)

                all_vulnerabilities.extend(vulnerabilities)
                total_collected += len(vulnerabilities)
                print(f"Collected {total_collected} vulnerabilities (page {page})")

                page += 1

            except requests.exceptions.RequestException as e:
                print(f"Error collecting Snyk data: {str(e)}")
                if total_collected > 0:
                    print(f"Saving partial data ({total_collected} entries)")
                    break
                return

        # Save collected data
        if all_vulnerabilities:
            with open(output_file, "w") as f:
                json.dump(all_vulnerabilities, f)
            print(f"Saved {total_collected} vulnerabilities to {output_file}")

    def _extract_learning_features(self, vuln):
        """Extract features useful for autonomous learning."""
        features = {
            "attack_patterns": [],
            "complexity_indicators": [],
            "potential_impacts": [],
            "mitigation_approaches": [],
        }

        # Extract attack patterns from description and title
        desc = (vuln.get("description", "") + " " + vuln.get("title", "")).lower()

        # Common attack pattern indicators
        patterns = {
            "buffer_overflow": ["buffer overflow", "stack overflow", "heap overflow"],
            "sql_injection": ["sql injection", "sqli"],
            "xss": ["cross-site scripting", "xss"],
            "rce": ["remote code execution", "rce", "command execution"],
            "path_traversal": ["path traversal", "directory traversal"],
            "file_inclusion": ["file inclusion", "lfi", "rfi"],
            "deserialization": ["deserialization", "unsafe deserialization"],
            "xxe": ["xml external entity", "xxe"],
            "ssrf": ["server-side request forgery", "ssrf"],
        }

        for pattern, keywords in patterns.items():
            if any(keyword in desc for keyword in keywords):
                features["attack_patterns"].append(pattern)

        # Complexity indicators
        if vuln.get("exploit"):
            features["complexity_indicators"].append("exploit_available")

        severity = vuln.get("severity", "").lower()
        if severity:
            features["complexity_indicators"].append(f"severity_{severity}")

        # Impact indicators
        if "denial of service" in desc:
            features["potential_impacts"].append("availability_impact")
        if "information disclosure" in desc:
            features["potential_impacts"].append("confidentiality_impact")
        if "privilege escalation" in desc:
            features["potential_impacts"].append("integrity_impact")

        return features

    def get_collection_stats(self):
        """Get statistics about collected data."""
        stats = {"total_vulnerabilities": 0, "collection_dates": [], "total_size_mb": 0}

        for data_file in self.data_dir.glob("snyk_data_*.json"):
            date = data_file.stem.split("_")[-1]
            stats["collection_dates"].append(date)

            # Get file size in MB
            size_mb = data_file.stat().st_size / (1024 * 1024)
            stats["total_size_mb"] += size_mb

            # Count vulnerabilities
            with open(data_file) as f:
                data = json.load(f)
                stats["total_vulnerabilities"] += len(data)

        return stats
