import time
from datetime import datetime

import pandas as pd

from cisa_collector import CISACollector
from cve_collector import CVECollector
from exploit_db_collector import ExploitDBCollector
from github_advisory_collector import GitHubAdvisoryCollector
from metasploit_collector import MetasploitCollector
from mitre_collector import MITRECollector
from snyk_collector import SnykCollector


def collect_all_datasets():
    """Collect data from all sources and combine them"""
    print("Starting data collection from all sources...")

    # Initialize collectors
    collectors = {
        "CVE": CVECollector(),
        "Exploit-DB": ExploitDBCollector(),
        "Metasploit": MetasploitCollector(),
        "MITRE": MITRECollector(),
        "Snyk": SnykCollector(),
        "GitHub": GitHubAdvisoryCollector(),
        "CISA": CISACollector(),
    }

    total_entries = 0
    total_size_mb = 0

    # Collect data from each source
    for name, collector in collectors.items():
        print(f"\n=== Collecting {name} data ===")

        try:
            if name == "CVE":
                collector.collect_historical_cves()
                stats = collector.get_collection_stats()
                count = stats["total_cves"]
                size_mb = stats.get("compressed_size_mb", 0) + stats.get(
                    "total_size_mb", 0
                )
            elif name == "Exploit-DB":
                count = collector.fetch_exploits()
                collector.save_to_csv()
                stats = collector.get_collection_stats()
                size_mb = stats.get("total_size_mb", 0)
            elif name == "Metasploit":
                count = collector.fetch_modules()
                collector.save_to_csv()
                stats = collector.get_collection_stats()
                size_mb = stats.get("total_size_mb", 0)
            elif name == "MITRE":
                count = collector.fetch_tactics()
                collector.save_to_csv()
                stats = collector.get_collection_stats()
                size_mb = stats.get("total_size_mb", 0)
            elif name == "Snyk":
                collector.collect_vulnerabilities()
                stats = collector.get_collection_stats()
                count = stats["total_vulnerabilities"]
                size_mb = stats.get("compressed_size_mb", 0) + stats.get(
                    "total_size_mb", 0
                )
            elif name == "GitHub":
                collector.collect_advisories()
                stats = collector.get_collection_stats()
                count = stats["total_advisories"]
                size_mb = stats.get("compressed_size_mb", 0) + stats.get(
                    "total_size_mb", 0
                )
            elif name == "CISA":
                collector.collect_vulnerabilities()
                stats = collector.get_collection_stats()
                count = stats["total_vulnerabilities"]
                size_mb = stats.get("compressed_size_mb", 0) + stats.get(
                    "total_size_mb", 0
                )

            total_entries += count
            total_size_mb += size_mb
            print(f"Collected {count} entries, Size: {size_mb:.2f} MB")

        except Exception as e:
            print(f"Error collecting {name} data: {str(e)}")
            continue

    # Print summary
    print("\n=== Collection Summary ===")
    print(f"Total entries collected: {total_entries}")
    print(f"Total data size: {total_size_mb:.2f} MB")

    # Save collection timestamp and stats
    with open("last_collection.txt", "w") as f:
        f.write(
            f"""Timestamp: {datetime.now().isoformat()}
Total Entries: {total_entries}
Total Size: {total_size_mb:.2f} MB"""
        )


if __name__ == "__main__":
    collect_all_datasets()
