import os
import sys

def check_environment():
    print("Environment Check:")
    print("=================")
    print("\nEnvironment Variables:")
    for key, value in os.environ.items():
        if 'PATH' in key or 'FRONTEND' in key:
            print(f"{key}: {value}")
    
    print("\nPython Path:")
    for path in sys.path:
        print(f"  {path}")
    
    print("\nDirectory Structure:")
    for root, dirs, files in os.walk('/app'):
        print(f"\nDirectory: {root}")
        print("Files:", files)
        print("Subdirectories:", dirs)

if __name__ == '__main__':
    check_environment()
