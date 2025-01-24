#!/bin/bash

# Exit on error
set -e

# Configuration
REMOTE_USER="root"
REMOTE_HOST="5.133.102.39"
REMOTE_DIR="/root/tchat-backend"
APP_NAME="tchat"

echo "Deploying $APP_NAME to $REMOTE_HOST..."

# Create archive of application files
echo "Creating application archive..."
tar czf /tmp/app.tar.gz --exclude='.venv' --exclude='__pycache__' --exclude='*.pyc' .

# Copy archive to server
echo "Copying files to server..."
scp /tmp/app.tar.gz $REMOTE_USER@$REMOTE_HOST:/tmp/

# Install dependencies and configure service
echo "Setting up application..."
ssh $REMOTE_USER@$REMOTE_HOST "
    # Create application directory
    mkdir -p $REMOTE_DIR
    cd $REMOTE_DIR
    
    # Extract application files
    tar xzf /tmp/app.tar.gz
    rm /tmp/app.tar.gz
    
    # Install system dependencies
    apt-get update
    apt-get install -y python3-pip python3-venv
    
    # Set up Python environment
    python3 -m venv .venv
    . .venv/bin/activate
    pip install poetry
    poetry install
    
    # Create systemd service
    cat > /etc/systemd/system/$APP_NAME.service << 'EOL'
[Unit]
Description=TChat Backend Service
After=network.target

[Service]
User=root
WorkingDirectory=$REMOTE_DIR
Environment=PATH=$REMOTE_DIR/.venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=$REMOTE_DIR/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOL

    # Enable and start service
    systemctl daemon-reload
    systemctl enable $APP_NAME
    systemctl start $APP_NAME
    
    # Clean up
    rm -f /tmp/app.tar.gz
"

echo "Deployment completed successfully!"
