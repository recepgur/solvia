# Security Analysis Platform

## Windows Setup Instructions

1. Extract the project.zip file to a directory of your choice
2. Open a command prompt in the extracted directory
3. Create and activate a Python virtual environment:
```bash
python -m venv .venv
.venv\Scripts\activate
```

4. Install required packages:
```bash
pip install -r requirements.txt
```

5. Start the Flask backend:
```bash
cd web_panel/backend
python app.py
```

6. In a new command prompt, run the test script:
```bash
python test_endpoints.py
```

### Troubleshooting
- If you see any path-related errors, ensure all files are in their correct locations relative to app.py
- The target_whitelist.json file should be in the root directory
- Check that all required Python packages are installed
- Verify that the Flask server is running on port 5000

## Testing
The test_endpoints.py script will verify:
- POST /api/analyze endpoint
- POST /api/generate_exploit endpoint

Both endpoints should return appropriate responses without any FileNotFoundError.
