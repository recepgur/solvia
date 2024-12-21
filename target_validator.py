import re
import json
import logging
from typing import List, Dict, Optional
from datetime import datetime

class TargetValidator:
    def __init__(self, whitelist_file: str = "/home/ubuntu/target_whitelist.json"):
        """Initialize target validator with whitelist file"""
        # Setup logging without basicConfig to avoid conflicts
        self.logger = logging.getLogger('SecurityValidator')
        if not self.logger.handlers:
            handler = logging.FileHandler('security_validation.log')
            handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
            
        self.whitelist_file = whitelist_file
        self.whitelist = self._load_whitelist()
        self.logger.info(f"Initialized TargetValidator with whitelist file: {self.whitelist_file}")
        self.logger.info(f"Current whitelist: {self.whitelist}")
    
    def _load_whitelist(self) -> Dict:
        """Load whitelist from JSON file"""
        try:
            with open(self.whitelist_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            # Create default whitelist if not exists
            default_whitelist = {
                "allowed_targets": [],
                "allowed_domains": [],
                "last_updated": datetime.now().isoformat()
            }
            self._save_whitelist(default_whitelist)
            return default_whitelist
    
    def _save_whitelist(self, whitelist: Dict) -> None:
        """Save whitelist to JSON file"""
        with open(self.whitelist_file, 'w') as f:
            json.dump(whitelist, f, indent=2)
    
    def add_target(self, target: str) -> None:
        """Add target to whitelist"""
        whitelist = self._load_whitelist()
        if target not in whitelist["allowed_targets"]:
            whitelist["allowed_targets"].append(target)
            whitelist["last_updated"] = datetime.now().isoformat()
            self._save_whitelist(whitelist)
            self.logger.info(f"Added target to whitelist: {target}")
    
    def remove_target(self, target: str) -> None:
        """Remove target from whitelist"""
        whitelist = self._load_whitelist()
        if target in whitelist["allowed_targets"]:
            whitelist["allowed_targets"].remove(target)
            whitelist["last_updated"] = datetime.now().isoformat()
            self._save_whitelist(whitelist)
            self.logger.info(f"Removed target from whitelist: {target}")
    
    def is_target_allowed(self, target: str) -> bool:
        """Check if target is in whitelist"""
        whitelist = self._load_whitelist()
        
        self.logger.info(f"Checking target: {target}")
        self.logger.info(f"Current whitelist targets: {whitelist['allowed_targets']}")
        self.logger.info(f"Current whitelist domains: {whitelist['allowed_domains']}")
        
        # Direct target match
        if target in whitelist["allowed_targets"]:
            self.logger.info(f"Target {target} found in whitelist (direct match)")
            return True
            
        # Domain match
        target_domain = self._extract_domain(target)
        self.logger.info(f"Extracted domain from target: {target_domain}")
        if target_domain and target_domain in whitelist["allowed_domains"]:
            self.logger.info(f"Target domain {target_domain} found in whitelist (domain match)")
            return True
            
        self.logger.warning(f"Target {target} not found in whitelist (no matches)")
        return False
    
    def _extract_domain(self, url: str) -> Optional[str]:
        """Extract domain from URL"""
        domain_pattern = r"(?:https?://)?(?:www\.)?([^/\s]+)"
        match = re.match(domain_pattern, url)
        return match.group(1) if match else None
    
    def validate_target(self, target: str, context: Dict = None) -> Dict:
        """Validate target and log attempt"""
        result = {
            "allowed": self.is_target_allowed(target),
            "timestamp": datetime.now().isoformat(),
            "target": target,
            "context": context or {}
        }
        
        # Log validation attempt
        log_msg = (
            f"Target validation: {target} - "
            f"Allowed: {result['allowed']} - "
            f"Context: {json.dumps(context or {})}"
        )
        if result["allowed"]:
            self.logger.info(log_msg)
        else:
            self.logger.warning(log_msg)
            
        return result
