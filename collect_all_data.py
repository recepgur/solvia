import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List, Callable

from exploit_db_collector import ExploitDBCollector
from metasploit_collector import MetasploitCollector
from cve_collector import CVECollector
from mitre_collector import MITRECollector
from github_advisory_collector import GitHubAdvisoryCollector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataCollector:
    def __init__(self):
        self.collectors = [
            ExploitDBCollector(),
            MetasploitCollector(),
            CVECollector(),
            MITRECollector(),
            GitHubAdvisoryCollector()
        ]
        
    def run_collector(self, collector: object) -> None:
        """Run a single collector."""
        try:
            logger.info(f"Starting {collector.__class__.__name__}")
            collector.run()
            logger.info(f"Completed {collector.__class__.__name__}")
        except Exception as e:
            logger.error(f"Error in {collector.__class__.__name__}: {e}")
            
            
    def run_all(self) -> None:
        """Run all collectors in parallel."""
        with ThreadPoolExecutor() as executor:
            executor.map(self.run_collector, self.collectors)
            
            
if __name__ == "__main__":
    collector = DataCollector()
    collector.run_all()
