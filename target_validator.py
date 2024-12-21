import os
import json
from typing import List, Dict

class TargetValidator:
    def __init__(self, whitelist_file: str = "/home/ubuntu/target_whitelist.json"):
        # Normalize path for cross-platform compatibility
        self.whitelist_file = os.path.normpath(whitelist_file)
            
        self.whitelist = self._load_whitelist()

    def _load_whitelist(self) -> Dict[str, List[str]]:
        """Load the whitelist from JSON file."""
        try:
            with open(self.whitelist_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            # Create default whitelist if file doesn't exist
            default_whitelist = {
                "allowed_targets": ["localhost", "127.0.0.1", "test.local"],
                "allowed_domains": [".test.local", ".example.com"]
            }
            self._save_whitelist(default_whitelist)
            return default_whitelist

    def _save_whitelist(self, whitelist: Dict[str, List[str]]) -> None:
        """Save the whitelist to JSON file."""
        directory = os.path.dirname(os.path.normpath(self.whitelist_file))
        os.makedirs(directory, exist_ok=True)
        with open(self.whitelist_file, 'w') as f:
            json.dump(whitelist, f, indent=4)

    def is_target_allowed(self, target: str) -> bool:
        """Check if a target is in the whitelist."""
        # Convert target to lowercase for case-insensitive comparison
        target = target.lower()
        
        # Check exact matches
        if target in self.whitelist["allowed_targets"]:
            return True
            
        # Check domain patterns
        return any(
            target.endswith(domain.lower())
            for domain in self.whitelist["allowed_domains"]
        )

    def add_target(self, target: str) -> None:
        """Add a target to the whitelist."""
        if target not in self.whitelist["allowed_targets"]:
            self.whitelist["allowed_targets"].append(target)
            self._save_whitelist(self.whitelist)

    def add_domain(self, domain: str) -> None:
        """Add a domain pattern to the whitelist."""
        if not domain.startswith('.'):
            domain = '.' + domain
        if domain not in self.whitelist["allowed_domains"]:
            self.whitelist["allowed_domains"].append(domain)
            self._save_whitelist(self.whitelist)
