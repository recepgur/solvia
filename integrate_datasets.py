import json
from datetime import datetime

import numpy as np
import pandas as pd


def load_datasets(chunk_size=1000):
    """Load all collected datasets with memory-efficient chunking

    Args:
        chunk_size (int): Size of chunks to process at a time

    Returns:
        tuple: Generator of (exploitdb_chunk, metasploit_chunk, mitre_df)
    """
    print("Loading datasets...")

    try:
        # Load MITRE dataset fully since it's reference data
        print("Loading MITRE ATT&CK dataset...")
        mitre_df = pd.read_csv("mitre_dataset.csv")
        print(f"Loaded {len(mitre_df)} MITRE ATT&CK entries")

        # Basic data validation for MITRE
        mitre_cols = ["id", "name", "description"]
        missing = [col for col in mitre_cols if col not in mitre_df.columns]
        if missing:
            raise ValueError(f"Missing required columns in MITRE dataset: {missing}")

        # Create iterators for large datasets
        print("Creating dataset iterators...")
        exploitdb_chunks = pd.read_csv("exploitdb_dataset.csv", chunksize=chunk_size)
        metasploit_chunks = pd.read_csv("metasploit_dataset.csv", chunksize=chunk_size)

        # Yield chunks for memory-efficient processing
        for exploitdb_chunk, metasploit_chunk in zip(
            exploitdb_chunks, metasploit_chunks
        ):
            # Validate chunk columns
            for df, name, cols in [
                (exploitdb_chunk, "exploitdb", ["id", "description", "tags"]),
                (metasploit_chunk, "metasploit", ["id", "description"]),
            ]:
                missing = [col for col in cols if col not in df.columns]
                if missing:
                    raise ValueError(
                        f"Missing required columns in {name} chunk: {missing}"
                    )

            yield exploitdb_chunk, metasploit_chunk, mitre_df

    except Exception as e:
        print(f"Error loading datasets: {str(e)}")
        raise


def prepare_tactic_patterns(mitre_df):
    """Prepare regex patterns for efficient matching"""
    import re

    patterns = {}
    for _, tactic in mitre_df.iterrows():
        # Create pattern from tactic name and key terms from description
        name_pattern = re.escape(str(tactic["name"]).lower())
        desc_terms = set(str(tactic["description"]).lower().split())
        # Filter out common words and create pattern
        key_terms = [term for term in desc_terms if len(term) > 4]
        pattern = (
            f"({name_pattern}|{'|'.join(re.escape(term) for term in key_terms[:5])})"
        )
        patterns[tactic["id"]] = (re.compile(pattern), tactic["name"])
    return patterns


def map_tactics_to_exploits(exploitdb_df, mitre_df):
    """Map MITRE ATT&CK tactics to exploits based on descriptions and tags"""
    print("Preparing tactic patterns...")
    patterns = prepare_tactic_patterns(mitre_df)

    print("Mapping MITRE ATT&CK tactics to exploits...")
    tactic_mapping = {}
    total = len(exploitdb_df)

    # Process in chunks of 1000
    chunk_size = 1000
    for start in range(0, total, chunk_size):
        end = min(start + chunk_size, total)
        chunk = exploitdb_df.iloc[start:end]

        # Process chunk
        for idx, exploit in chunk.iterrows():
            if idx % 1000 == 0:
                print(f"Processing exploit {idx}/{total}...")

            matched_tactics = []
            text = (
                f"{str(exploit['description']).lower()} {str(exploit['tags']).lower()}"
            )

            # Use pre-compiled patterns for matching
            for tactic_id, (pattern, name) in patterns.items():
                if pattern.search(text):
                    matched_tactics.append(tactic_id)

            if matched_tactics:
                tactic_mapping[exploit["id"]] = matched_tactics

    print(f"Mapped tactics to {len(tactic_mapping)} exploits")
    return tactic_mapping


def match_patterns(description, patterns_df, pattern_type="network"):
    """Match patterns to exploit description"""
    matched_patterns = []
    for _, pattern in patterns_df.iterrows():
        if pattern["pattern"].lower() in description.lower():
            pattern_data = {
                "type": pattern["type"],
                "pattern_category": pattern_type,
                "indicators": json.loads(pattern["indicators"]),
                "mitre_tactics": json.loads(pattern["mitre_tactics"]),
                "detection_rules": json.loads(pattern["detection_rules"]),
            }
            if "techniques" in pattern:
                pattern_data["techniques"] = json.loads(pattern["techniques"])
            matched_patterns.append(pattern_data)
    return matched_patterns


def create_integrated_dataset(chunk_size=1000):
    """Create an integrated dataset combining all sources with deduplication

    Args:
        chunk_size (int): Size of chunks to process at a time
    """
    print("Creating integrated dataset...")

    # Initialize pattern collectors
    import os

    from agent_deployment_collector import AgentDeploymentCollector
    from network_pattern_collector import NetworkPatternCollector
    from server_penetration_collector import ServerPenetrationCollector

    # Load pattern datasets
    print("Loading pattern datasets...")
    net_collector = NetworkPatternCollector()
    net_collector.load_network_patterns()
    network_patterns_df = net_collector.get_patterns_dataset()

    server_collector = ServerPenetrationCollector()
    server_collector.load_server_patterns()
    server_patterns_df = server_collector.get_patterns_dataset()

    agent_collector = AgentDeploymentCollector()
    agent_collector.load_agent_patterns()
    agent_patterns_df = agent_collector.get_patterns_dataset()

    # Initialize deduplication tracking
    processed_ids = set()
    integrated_chunks = []

    # Load CVE data in chunks
    print("Processing CVE data chunks...")
    cve_chunks = pd.read_csv("cve_dataset.csv", chunksize=chunk_size)

    # Create output directory for chunks
    os.makedirs("integrated_chunks", exist_ok=True)

    # Process datasets in chunks
    for exploitdb_chunk, metasploit_chunk, mitre_df in load_datasets(chunk_size):
        chunk_data = []

        # Process ExploitDB entries
        for _, exploit in exploitdb_chunk.iterrows():
            if exploit["id"] in processed_ids:
                continue

            processed_ids.add(exploit["id"])

            # Match patterns
            matched_network_patterns = match_patterns(
                exploit["description"], network_patterns_df, "network"
            )
            matched_server_patterns = match_patterns(
                exploit["description"], server_patterns_df, "server"
            )
            matched_agent_patterns = match_patterns(
                exploit["description"], agent_patterns_df, "agent"
            )

            # Determine complexity and privileges
            complexity = (
                "high"
                if any(
                    "root" in p.get("techniques", []) for p in matched_server_patterns
                )
                else "medium"
            )
            privileges = "root" if "root" in exploit["description"].lower() else "user"

            # Calculate detection probability based on number of patterns
            detection_prob = min(
                0.8,
                0.3
                + 0.1 * (len(matched_network_patterns) + len(matched_server_patterns)),
            )

            # Extract agent capabilities and learning features
            agent_capabilities = []
            learning_features = []
            for pattern in matched_agent_patterns:
                if "capabilities" in pattern:
                    agent_capabilities.extend(json.loads(pattern["capabilities"]))
                if "learning_features" in pattern:
                    learning_features.append(json.loads(pattern["learning_features"]))

            # Map tactics for this chunk
            tactics = map_tactics_to_exploits(pd.DataFrame([exploit]), mitre_df).get(
                exploit["id"], []
            )

            entry = {
                "id": exploit["id"],
                "type": "exploit",
                "source": "exploit-db",
                "description": exploit["description"],
                "platform": exploit["platform"],
                "date": exploit["published"],
                "author": exploit["author"],
                "verified": exploit["verified"],
                "tactics": tactics,
                "tags": exploit["tags"],
                "codes": exploit["codes"],
                "network_patterns": matched_network_patterns,
                "server_patterns": matched_server_patterns,
                "autonomous_learning_features": {
                    "success_rate": 0.0,
                    "complexity": complexity,
                    "detection_probability": detection_prob,
                    "required_privileges": privileges,
                    "attack_vectors": list(
                        set(
                            [
                                t
                                for p in matched_network_patterns
                                + matched_server_patterns
                                + matched_agent_patterns
                                for t in p.get("mitre_tactics", [])
                            ]
                        )
                    ),
                    "agent_capabilities": list(set(agent_capabilities)),
                    "learning_features": learning_features,
                    "self_improvement_metrics": {
                        "adaptation_rate": sum(
                            [f.get("adaptation_rate", 0.1) for f in learning_features]
                        )
                        / max(len(learning_features), 1),
                        "learning_capabilities": list(
                            set(
                                [
                                    cap
                                    for f in learning_features
                                    for cap in f.get("learning_capabilities", [])
                                ]
                            )
                        ),
                        "improvement_metrics": list(
                            set(
                                [
                                    metric
                                    for f in learning_features
                                    for metric in f.get("improvement_metrics", [])
                                ]
                            )
                        ),
                    },
                },
            }
            chunk_data.append(entry)

        # Process CVE chunk
        try:
            cve_chunk = next(cve_chunks)
            for _, cve in cve_chunk.iterrows():
                if cve["id"] in processed_ids:
                    continue

                processed_ids.add(cve["id"])

                matched_network_patterns = match_patterns(
                    cve["description"], network_patterns_df, "network"
                )
                matched_server_patterns = match_patterns(
                    cve["description"], server_patterns_df, "server"
                )
                matched_agent_patterns = match_patterns(
                    cve["description"], agent_patterns_df, "agent"
                )

                entry = {
                    "id": cve["id"],
                    "type": "vulnerability",
                    "source": "nvd",
                    "description": cve["description"],
                    "date": cve["published"],
                    "severity": cve["baseScore"],
                    "attack_vector": cve["attackVector"],
                    "attack_complexity": cve["attackComplexity"],
                    "privileges_required": cve["privilegesRequired"],
                    "references": cve["references"],
                    "network_patterns": matched_network_patterns,
                    "server_patterns": matched_server_patterns,
                    "autonomous_learning_features": {
                        "success_rate": 0.0,
                        "complexity": cve["attackComplexity"].lower(),
                        "detection_probability": 0.5,  # Default for CVEs
                        "required_privileges": cve["privilegesRequired"].lower(),
                        "attack_vectors": [cve["attackVector"]],
                        "learning_features": [],  # Initialize empty for CVEs
                    },
                }
                chunk_data.append(entry)
        except StopIteration:
            pass

        # Process Metasploit entries from chunk
        for _, module in metasploit_chunk.iterrows():
            if module["id"] in processed_ids:
                continue

            processed_ids.add(module["id"])

            matched_network_patterns = match_patterns(
                module["description"], network_patterns_df, "network"
            )
            matched_server_patterns = match_patterns(
                module["description"], server_patterns_df, "server"
            )
            matched_agent_patterns = match_patterns(
                module["description"], agent_patterns_df, "agent"
            )

            entry = {
                "id": module["id"],
                "type": "exploit",
                "source": "metasploit",
                "description": module["description"],
                "platform": module.get("platform", "unknown"),
                "date": module.get("disclosure_date", "unknown"),
                "rank": module.get("rank", "normal"),
                "network_patterns": matched_network_patterns,
                "server_patterns": matched_server_patterns,
                "agent_patterns": matched_agent_patterns,
                "autonomous_learning_features": {
                    "success_rate": 0.0,
                    "complexity": "medium",  # Default for Metasploit
                    "detection_probability": 0.6,  # Slightly higher for Metasploit
                    "required_privileges": "user",  # Default
                    "attack_vectors": [],  # Will be populated from patterns
                    "learning_features": [],  # Initialize empty
                },
            }
            chunk_data.append(entry)

        # Save chunk to disk to free memory
        if chunk_data:
            chunk_filename = f"integrated_chunks/chunk_{len(integrated_chunks)}.json"
            with open(chunk_filename, "w") as f:
                json.dump(chunk_data, f)
            integrated_chunks.append(chunk_filename)
            print(
                f"Saved chunk {len(integrated_chunks)} with {len(chunk_data)} entries"
            )

    # Combine all chunks and clean up
    print("Combining chunks...")
    final_data = []
    total_entries = 0

    for chunk_file in integrated_chunks:
        with open(chunk_file, "r") as f:
            chunk_data = json.load(f)
            final_data.extend(chunk_data)
            total_entries += len(chunk_data)
        os.remove(chunk_file)  # Clean up temporary files

    print("Integration complete!")
    print(f"Total unique entries processed: {len(processed_ids)}")
    print(f"Total integrated entries: {total_entries}")

    # Save final dataset
    output_file = "integrated_dataset.json"
    with open(output_file, "w") as f:
        json.dump(final_data, f)
    print(f"Saved integrated dataset to {output_file}")

    # Create DataFrame for return value
    return pd.DataFrame(final_data)


def main():
    """Main function to run the dataset integration process"""
    print("\nStarting comprehensive security dataset integration...")

    # Import required modules
    import os
    import sys

    # Set up paths
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.append(current_dir)

    # Create output directory for chunks
    os.makedirs("integrated_chunks", exist_ok=True)

    try:
        # Collect CVE data
        from cve_collector import CVECollector

        cve_collector = CVECollector()
        print("Collecting CVE data...")
        cve_collector.collect_cves(
            days_back=365
        )  # Collect last year of CVEs for comprehensive dataset
    except Exception as e:
        print(f"Warning: Could not initialize CVE collector: {str(e)}")

    # Create integrated dataset with chunked processing
    chunk_size = 1000  # Adjust based on available memory
    integrated_df = create_integrated_dataset(chunk_size=chunk_size)

    # Calculate and print statistics
    total_size = os.path.getsize("integrated_dataset.json") / (
        1024 * 1024 * 1024
    )  # Size in GB

    print("\n=== Integration Summary ===")
    print(f"Total dataset size: {total_size:.2f} GB")
    print(f"Total entries: {len(integrated_df)}")
    print("Integration complete!")


if __name__ == "__main__":
    main()
