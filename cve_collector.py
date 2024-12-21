import gzip
import json
import os
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import requests
from tqdm import tqdm


class CVECollector:
    """Collector for CVE (Common Vulnerabilities and Exposures) data from NVD."""

    def __init__(self):
        self.base_url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
        self.dataset = pd.DataFrame()
        self.data_dir = Path("cve_data")
        self.data_dir.mkdir(exist_ok=True)
        # Add headers with User-Agent for better API interaction
        self.headers = {
            "User-Agent": "SecurityResearchBot/1.0",
            "Accept": "application/json",
        }

    def collect_historical_cves(self, start_year=1999):
        """Collect all CVEs from start_year to present."""
        print("Starting with recent CVEs (last 120 days)...")
        self._collect_recent_data()

        current_year = datetime.now().year
        print(
            f"\nCollecting historical CVE data from {start_year} to {current_year}..."
        )

        for year in tqdm(
            range(start_year, current_year + 1), desc="Collecting historical CVEs"
        ):
            try:
                print(f"\nCollecting CVEs for year {year}...")
                self._collect_year_data(year)
                time.sleep(6)  # Respect rate limit
            except Exception as e:
                print(f"Error collecting data for year {year}: {e}")
                continue

    def _collect_recent_data(self):
        """Collect CVE data from the last 120 days (no API key required)."""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=120)

        params = {
            "pubStartDate": start_date.strftime("%Y-%m-%dT%H:%M:%S.000"),
            "pubEndDate": end_date.strftime("%Y-%m-%dT%H:%M:%S.000"),
            "resultsPerPage": 2000,
            "startIndex": 0,
        }

        print(f"Collecting CVEs from {start_date.date()} to {end_date.date()}...")
        self._collect_with_params(params, "recent_cves")

    def _collect_with_params(self, params, output_prefix):
        """Collect CVEs with given parameters and handle pagination."""
        output_file = self.data_dir / f"{output_prefix}.json"

        # Skip if already collected
        if output_file.exists():
            print(f"Data for {output_prefix} already exists, skipping...")
            return

        all_vulnerabilities = []
        total_collected = 0

        while True:
            try:
                # Rate limiting
                time.sleep(6)  # Respect rate limit of 10 requests per minute

                # Make API request with headers
                response = requests.get(
                    self.base_url, params=params, headers=self.headers
                )
                response.raise_for_status()
                data = response.json()

                # Process vulnerabilities
                vulnerabilities = []
                for vuln in data.get("vulnerabilities", []):
                    cve = vuln.get("cve", {})
                    metrics = (
                        cve.get("metrics", {})
                        .get("cvssMetricV31", [{}])[0]
                        .get("cvssData", {})
                    )

                    entry = {
                        "id": cve.get("id", ""),
                        "description": cve.get("descriptions", [{}])[0].get(
                            "value", ""
                        ),
                        "published": cve.get("published", ""),
                        "lastModified": cve.get("lastModified", ""),
                        "baseScore": metrics.get("baseScore", 0.0),
                        "attackVector": metrics.get("attackVector", ""),
                        "attackComplexity": metrics.get("attackComplexity", ""),
                        "privilegesRequired": metrics.get("privilegesRequired", ""),
                        "references": [
                            ref.get("url", "") for ref in cve.get("references", [])
                        ],
                        "autonomous_learning_features": self._extract_learning_features(
                            cve
                        ),
                    }
                    vulnerabilities.append(entry)

                all_vulnerabilities.extend(vulnerabilities)
                total_collected += len(vulnerabilities)
                print(f"Collected {total_collected} CVEs")

                # Check if we need to paginate
                total_results = data.get("totalResults", 0)
                if total_collected >= total_results:
                    break

                # Update start index for next page
                params["startIndex"] = total_collected

            except requests.exceptions.RequestException as e:
                print(f"Error collecting CVE data: {str(e)}")
                if total_collected > 0:
                    print(f"Saving partial data ({total_collected} entries)")
                    break
                return

        # Save collected data
        if all_vulnerabilities:
            with open(output_file, "w") as f:
                json.dump(all_vulnerabilities, f)
            print(f"Saved {total_collected} CVEs to {output_file}")

    def _extract_learning_features(self, cve):
        """Extract features useful for autonomous learning from CVE data."""
        features = {
            "attack_patterns": [],
            "complexity_indicators": [],
            "potential_impacts": [],
            "mitigation_approaches": [],
        }

        # Extract attack patterns from description
        desc = cve.get("descriptions", [{}])[0].get("value", "").lower()

        # Common attack pattern indicators
        if "buffer overflow" in desc:
            features["attack_patterns"].append("buffer_overflow")
        if "sql injection" in desc:
            features["attack_patterns"].append("sql_injection")
        if "cross-site" in desc:
            features["attack_patterns"].append("xss")
        if "remote code execution" in desc:
            features["attack_patterns"].append("rce")

        # Complexity indicators
        metrics = (
            cve.get("metrics", {}).get("cvssMetricV31", [{}])[0].get("cvssData", {})
        )
        features["complexity_indicators"].append(
            metrics.get("attackComplexity", "UNKNOWN")
        )

        # Impact indicators
        if metrics.get("confidentialityImpact"):
            features["potential_impacts"].append(
                f"confidentiality_{metrics['confidentialityImpact']}"
            )
        if metrics.get("integrityImpact"):
            features["potential_impacts"].append(
                f"integrity_{metrics['integrityImpact']}"
            )
        if metrics.get("availabilityImpact"):
            features["potential_impacts"].append(
                f"availability_{metrics['availabilityImpact']}"
            )

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

    def _collect_year_data(self, year):
        """Collect CVE data for a specific year."""
        start_date = f"{year}-01-01T00:00:00.000"
        end_date = f"{year}-12-31T23:59:59.999"

        params = {
            "pubStartDate": start_date,
            "pubEndDate": end_date,
            "resultsPerPage": 2000,
            "startIndex": 0,
        }

        output_prefix = f"cve_data_{year}"
        self._collect_with_params(params, output_prefix)

    def get_collection_stats(self):
        """Get statistics about collected data."""
        stats = {
            "total_cves": 0,
            "years_collected": [],
            "total_size_mb": 0,
            "compressed_size_mb": 0,
        }

        for data_file in self.data_dir.glob("*.json*"):
            # Extract year from filename
            try:
                year = int("".join(filter(str.isdigit, data_file.stem)))
                if 1999 <= year <= datetime.now().year:
                    stats["years_collected"].append(year)
            except ValueError:
                continue

            # Get file size in MB
            size_mb = data_file.stat().st_size / (1024 * 1024)
            stats[
                "compressed_size_mb" if data_file.suffix == ".gz" else "total_size_mb"
            ] += size_mb

            # Count CVEs
            try:
                if data_file.suffix == ".gz":
                    with gzip.open(data_file, "rt") as f:
                        year_data = json.load(f)
                else:
                    with open(data_file) as f:
                        year_data = json.load(f)
                stats["total_cves"] += len(year_data)
            except Exception as e:
                print(f"Error reading {data_file}: {e}")

        return stats
