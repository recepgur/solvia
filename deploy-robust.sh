#!/bin/bash

# Configuration
MAX_RETRIES=5
RETRY_DELAY=2
SERVER="91.151.88.205"
USER="root"
PASS="Sanane120"
DEPLOY_DIR="/root/solvia"

# Helper function for SSH commands with retry
ssh_with_retry() {
    local cmd="$1"
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        echo "Attempt $attempt of $MAX_RETRIES: $cmd"
        sshpass -p "$PASS" ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no $USER@$SERVER "$cmd" && return 0
        attempt=$((attempt + 1))
        sleep $RETRY_DELAY
    done
    return 1
}

# Helper function for SCP with retry
scp_with_retry() {
    local src="$1"
    local dest="$2"
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        echo "Attempt $attempt of $MAX_RETRIES: Copying $src to $dest"
        sshpass -p "$PASS" scp -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$src" $USER@$SERVER:"$dest" && return 0
        attempt=$((attempt + 1))
        sleep $RETRY_DELAY
    done
    return 1
}

echo "=== Starting Robust Deployment ==="

# Step 1: Create deployment directory
echo "Creating deployment directory..."
ssh_with_retry "mkdir -p $DEPLOY_DIR"

# Step 2: Clean existing installation
echo "Cleaning existing installation..."
ssh_with_retry "cd $DEPLOY_DIR && rm -rf node_modules package-lock.json"

# Step 3: Transfer package.json
echo "Transferring package.json..."
scp_with_retry "package.json" "$DEPLOY_DIR/"

# Step 4: Transfer node_modules
echo "Transferring node_modules..."
scp_with_retry "node_modules.tar.gz" "$DEPLOY_DIR/"

# Step 5: Extract node_modules
echo "Extracting node_modules..."
ssh_with_retry "cd $DEPLOY_DIR && tar xzf node_modules.tar.gz && rm node_modules.tar.gz"

# Step 6: Transfer source files
echo "Transferring source files..."
tar czf src.tar.gz src/
scp_with_retry "src.tar.gz" "$DEPLOY_DIR/"
ssh_with_retry "cd $DEPLOY_DIR && tar xzf src.tar.gz && rm src.tar.gz"

# Step 7: Update package.json type to commonjs
echo "Updating package.json..."
ssh_with_retry "cd $DEPLOY_DIR && sed -i 's/\"type\": \"module\"/\"type\": \"commonjs\"/' package.json"

# Step 8: Start the application
echo "Starting application..."
ssh_with_retry "cd $DEPLOY_DIR && node src/index.js > app.log 2>&1 & sleep 2 && cat app.log"

echo "=== Deployment Complete ==="
