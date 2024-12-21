import pandas as pd
import json

# Read the vulnerability dataset
df = pd.read_csv('vulnerability_dataset.csv')

# Display basic information
print("=== Dataset Overview ===")
print(f"Total records: {len(df)}")
print("\nColumns:", df.columns.tolist())

print("\n=== Sample Data ===")
print(df.head(3).to_string())

print("\n=== Data Statistics ===")
print("\nSeverity Score Distribution:")
print(df['severity'].value_counts().sort_index())

print("\nAttack Vector Distribution:")
print(df['attack_vector'].value_counts())

# Analyze impact metrics (which are stored as dictionaries)
print("\n=== Impact Metrics Analysis ===")
impact_df = df['impact'].apply(eval)  # Convert string representation of dict to actual dict
impact_types = ['confidentiality', 'integrity', 'availability']

for impact_type in impact_types:
    print(f"\n{impact_type.title()} Impact Distribution:")
    print(impact_df.apply(lambda x: x[impact_type]).value_counts())
