# Security Analysis System

An advanced security research platform for vulnerability analysis and exploit generation.

## Components

### Data Collection
- ExploitDB integration
- Metasploit framework integration
- MITRE ATT&CK framework integration
- CVE database integration
- GitHub Security Advisory integration
- CISA vulnerability feed integration
- Snyk vulnerability database integration

### AI Model
- Based on GPT-Neo 125M
- Fine-tuned on security datasets
- Exploit generation capabilities
- Target validation system
- Anti-analysis protection
- Kernel memory protection

### Web Panel
- React frontend
- FastAPI backend
- Real-time analysis
- Security controls and validation

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Start the backend:
```bash
cd web_panel/backend
uvicorn app:app --reload
```

3. Start the frontend:
```bash
cd web_panel/frontend
npm install
npm start
```

## Security Features

- Target whitelisting
- Input validation
- Rate limiting
- Secure API endpoints
- Anti-analysis protection
- Kernel memory protection

## Testing

Run the tests:
```bash
python -m pytest test_*.py
```

## Data Collection

Collect security data:
```bash
python collect_all_data.py
```

## License

This project is proprietary and confidential.
