import json
import time
from datetime import datetime, timedelta

import pandas as pd
import requests


class SecurityDataCollector:
    def __init__(self):
        self.nvd_api_base = "https://services.nvd.nist.gov/rest/json/cves/2.0"
        self.headers = {
            "User-Agent": "SecurityResearchBot/1.0",
        }
        self.data = []

    def fetch_nvd_vulnerabilities(self, days_back=365):
        """Fetch vulnerabilities from NVD API with pagination"""
        start_date = (datetime.now() - timedelta(days=days_back)).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
        end_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")

        total_fetched = 0
        start_index = 0
        results_per_page = 100

        while (
            total_fetched < 1100
        ):  # Fetch slightly more than 1000 to account for filtering
            params = {
                "pubStartDate": start_date,
                "pubEndDate": end_date,
                "resultsPerPage": results_per_page,
                "startIndex": start_index,
            }
            print(
                f"\nFetching records {start_index} to {start_index + results_per_page}"
            )

            try:
                # Implement rate limiting
                time.sleep(6)  # Respect NVD API rate limit (10 requests per minute)

                response = requests.get(
                    self.nvd_api_base, params=params, headers=self.headers
                )
                print(f"Response status: {response.status_code}")

                if response.status_code == 200:
                    data = response.json()
                    vulnerabilities = data.get("vulnerabilities", [])
                    total_results = data.get("totalResults", 0)

                    if not vulnerabilities:
                        print("No more vulnerabilities to fetch")
                        break

                    for vuln in vulnerabilities:
                        cve = vuln.get("cve", {})

                        # Extract relevant information
                        vuln_data = {
                            "id": cve.get("id"),
                            "published": cve.get("published"),
                            "description": cve.get("descriptions", [{}])[0].get(
                                "value", ""
                            ),
                            "severity": self._get_severity(cve),
                            "attack_vector": self._get_attack_vector(cve),
                            "impact": self._get_impact_metrics(cve),
                        }

                        self.data.append(vuln_data)

                    fetched_count = len(vulnerabilities)
                    total_fetched += fetched_count
                    print(
                        f"Fetched {fetched_count} vulnerabilities (Total: {total_fetched})"
                    )

                    if start_index + results_per_page >= total_results:
                        print("Reached end of available vulnerabilities")
                        break

                    start_index += results_per_page

                elif response.status_code == 403:
                    print("API rate limit exceeded. Waiting 60 seconds...")
                    time.sleep(60)
                    continue
                else:
                    print(f"Error response: {response.text}")
                    time.sleep(30)  # Wait before retrying
                    continue

            except Exception as e:
                print(f"Error: {str(e)}")
                time.sleep(30)  # Wait before retrying
                continue

        return total_fetched

    def _get_severity(self, cve):
        """Extract severity information"""
        metrics = cve.get("metrics", {}).get("cvssMetricV31", [{}])[0]
        if metrics:
            return metrics.get("cvssData", {}).get("baseScore", 0)
        return 0

    def _get_attack_vector(self, cve):
        """Extract attack vector information"""
        metrics = cve.get("metrics", {}).get("cvssMetricV31", [{}])[0]
        if metrics:
            return metrics.get("cvssData", {}).get("attackVector", "UNKNOWN")
        return "UNKNOWN"

    def _get_impact_metrics(self, cve):
        """Extract impact metrics"""
        metrics = cve.get("metrics", {}).get("cvssMetricV31", [{}])[0]
        if metrics:
            cvss_data = metrics.get("cvssData", {})
            return {
                "confidentiality": cvss_data.get("confidentialityImpact", "NONE"),
                "integrity": cvss_data.get("integrityImpact", "NONE"),
                "availability": cvss_data.get("availabilityImpact", "NONE"),
            }
        return {"confidentiality": "NONE", "integrity": "NONE", "availability": "NONE"}

    def save_to_csv(self, filename="vulnerability_dataset.csv"):
        """Save collected data to CSV"""
        df = pd.DataFrame(self.data)
        df.to_csv(filename, index=False)
        print(f"Saved {len(df)} vulnerabilities to {filename}")

    def get_dataset(self):
        """Return the collected data as a pandas DataFrame"""
        return pd.DataFrame(self.data)


if __name__ == "__main__":
    collector = SecurityDataCollector()
    print("Fetching vulnerability data from NVD...")
    print("This may take several minutes due to API rate limiting...")
    count = collector.fetch_nvd_vulnerabilities(days_back=365)  # Fetch one year of data
    print(f"\nTotal vulnerabilities fetched: {count}")
    collector.save_to_csv()
