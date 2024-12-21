import gzip
import json
import subprocess
import time
from datetime import datetime
from pathlib import Path

import pandas as pd
from tqdm import tqdm


class GitHubAdvisoryCollector:
    """Collector for GitHub Security Advisory Database."""

    def __init__(self):
        self.data_dir = Path(
            "github_data"
        )  # Match directory structure with other collectors
        self.data_dir.mkdir(exist_ok=True)
        self.batch_size = 100
        self.max_retries = 3
        self.delay_between_requests = 2  # seconds

    def collect_advisories(self, batch_size=100):
        """Collect all security advisories from GitHub."""
        print("Collecting security advisories from GitHub...")

        output_file = (
            self.data_dir
            / f"github_advisory_data_{datetime.now().strftime('%Y%m%d')}.json"
        )

        # Skip if already collected today
        if output_file.exists():
            print(f"Data already collected today, skipping...")
            return

        all_advisories = []
        has_next_page = True
        cursor = None
        total_collected = 0

        while has_next_page:
            try:
                # Rate limiting
                time.sleep(1)

                # GraphQL query
                query = """
                query($cursor: String, $batchSize: Int!) {
                    securityVulnerabilities(first: $batchSize, after: $cursor) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        nodes {
                            advisory {
                                id
                                ghsaId
                                summary
                                description
                                severity
                                references {
                                    url
                                }
                                publishedAt
                                updatedAt
                                vulnerabilities {
                                    package {
                                        name
                                        ecosystem
                                    }
                                    firstPatchedVersion {
                                        identifier
                                    }
                                    vulnerableVersionRange
                                }
                            }
                            vulnerableVersionRange
                            package {
                                name
                                ecosystem
                            }
                        }
                    }
                }
                """

                variables = {"cursor": cursor, "batchSize": batch_size}

                # Use gh CLI for authenticated API access
                cmd = [
                    "gh",
                    "api",
                    "graphql",
                    "-f",
                    f"query={query}",
                    "-f",
                    f"variables={json.dumps(variables)}",
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)

                if result.returncode != 0:
                    raise Exception(f"GitHub API call failed: {result.stderr}")

                data = json.loads(result.stdout)

                if "errors" in data:
                    print(f"GraphQL errors: {data['errors']}")
                    break

                result = data["data"]["securityVulnerabilities"]
                advisories = []

                for node in result["nodes"]:
                    advisory = node["advisory"]
                    entry = {
                        "id": advisory["id"],
                        "ghsa_id": advisory["ghsaId"],
                        "summary": advisory["summary"],
                        "description": advisory["description"],
                        "severity": advisory["severity"],
                        "references": [ref["url"] for ref in advisory["references"]],
                        "published_at": advisory["publishedAt"],
                        "updated_at": advisory["updatedAt"],
                        "package": {
                            "name": node["package"]["name"],
                            "ecosystem": node["package"]["ecosystem"],
                        },
                        "vulnerable_version_range": node["vulnerableVersionRange"],
                        "autonomous_learning_features": self._extract_learning_features(
                            advisory
                        ),
                    }
                    advisories.append(entry)

                all_advisories.extend(advisories)
                total_collected += len(advisories)
                print(f"Collected {total_collected} advisories")

                # Update pagination
                page_info = result["pageInfo"]
                has_next_page = page_info["hasNextPage"]
                cursor = page_info["endCursor"]

            except Exception as e:
                print(f"Error collecting GitHub Advisory data: {str(e)}")
                if total_collected > 0:
                    print(f"Saving partial data ({total_collected} entries)")
                    break
                return

        # Save collected data with compression
        if all_advisories:
            output_file = output_file.with_suffix(".json.gz")
            with gzip.open(output_file, "wt", encoding="utf-8") as f:
                json.dump(all_advisories, f, indent=2)

            # Calculate and print size
            size_mb = output_file.stat().st_size / (1024 * 1024)
            print(
                f"Saved {total_collected} advisories to {output_file} (Size: {size_mb:.2f} MB)"
            )

    def _extract_learning_features(self, advisory):
        """Extract features useful for autonomous learning."""
        features = {
            "attack_patterns": [],
            "complexity_indicators": [],
            "potential_impacts": [],
            "mitigation_approaches": [],
        }

        # Extract attack patterns from description and summary
        desc = (
            advisory.get("description", "") + " " + advisory.get("summary", "")
        ).lower()

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
        severity = advisory.get("severity", "").lower()
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
        stats = {"total_advisories": 0, "collection_dates": [], "total_size_mb": 0}

        for data_file in self.data_dir.glob("github_advisory_data_*.json"):
            date = data_file.stem.split("_")[-1]
            stats["collection_dates"].append(date)

            # Get file size in MB
            size_mb = data_file.stat().st_size / (1024 * 1024)
            stats["total_size_mb"] += size_mb

            # Count advisories
            with open(data_file) as f:
                data = json.load(f)
                stats["total_advisories"] += len(data)

        return stats
