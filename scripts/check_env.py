import os

print("Environment Variables:")
print("FRONTEND_PATH:", os.getenv("FRONTEND_PATH"))
print("PORT:", os.getenv("PORT"))
print("PYTHONPATH:", os.getenv("PYTHONPATH"))
print("\nDirectory Contents:")
frontend_path = os.getenv("FRONTEND_PATH")
if frontend_path and os.path.exists(frontend_path):
    print(f"\nContents of {frontend_path}:")
    for root, dirs, files in os.walk(frontend_path):
        print(f"\nDirectory: {root}")
        print("Files:", files)
