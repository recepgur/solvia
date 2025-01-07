#!/bin/bash

# SSH connection details
SERVER="root@91.151.88.205"
PASSWORD="Sanane120"

# Environment variables
WEB3MODAL_API_KEY="92faf50249074d45ba00719bc8e7f0de"
ICE_SERVERS='[{"urls":["stun:fr-turn6.xirsys.com"]},{"username":"Cbwldc6YrWb9FeGEuBcHRsaAFyNhhzUTqvI7NrVM8lB-Zcx4qtWT5M8OC4GQHeUaAAAAAGd8izNyZWNlcA==","credential":"71d94a2a-cc9b-11ef-b153-0242ac120004","urls":["turn:fr-turn6.xirsys.com:80?transport=udp","turn:fr-turn6.xirsys.com:3478?transport=udp","turn:fr-turn6.xirsys.com:80?transport=tcp","turn:fr-turn6.xirsys.com:3478?transport=tcp","turns:fr-turn6.xirsys.com:443?transport=tcp","turns:fr-turn6.xirsys.com:5349?transport=tcp"]}]'

# Function to run SSH commands with timeout and retry
run_ssh_cmd() {
    local max_attempts=3
    local attempt=1
    local timeout=30

    while [ $attempt -le $max_attempts ]; do
        echo "Attempt $attempt of $max_attempts..."
        if timeout $timeout sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $SERVER "$1"; then
            return 0
        fi
        attempt=$((attempt + 1))
        [ $attempt -le $max_attempts ] && sleep 5
    done
    return 1
}

echo "Setting up server environment..."
run_ssh_cmd "apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs nginx && \
    npm install -g pm2 && \
    mkdir -p /var/www/solvio"

# Create environment file
echo "Creating environment file..."
cat > .env.local << EOL
NEXT_PUBLIC_WEB3MODAL_API_KEY=$WEB3MODAL_API_KEY
NEXT_PUBLIC_ICE_SERVERS='$ICE_SERVERS'
EOL

# Install dependencies and build
echo "Building project..."
npm install
npm run build

# Deploy to server
echo "Deploying to server..."
sshpass -p "$PASSWORD" rsync -avz --delete \
    --exclude "node_modules" \
    --exclude ".git" \
    --exclude ".next" \
    ./ $SERVER:/var/www/solvio/

# Setup on server
echo "Setting up application on server..."
run_ssh_cmd "cd /var/www/solvio && \
    npm install && \
    npm run build && \
    pm2 delete solvio 2>/dev/null || true && \
    pm2 start npm --name solvio -- start && \
    pm2 save"

# Configure NGINX with WebSocket and security headers
echo "Configuring NGINX..."
cat > nginx.conf << EOL
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: *.xirsys.com:* wss://*.xirsys.com:* https://*.xirsys.com:*; connect-src 'self' https://* wss://* blob:; img-src 'self' data: blob: https:; media-src 'self' blob:;";

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Static files caching
    location /_next/static {
        proxy_cache_bypass \$http_upgrade;
        proxy_pass http://localhost:3000;
        expires 30d;
        access_log off;
        add_header Cache-Control "public, no-transform";
    }

    # Large body size for file sharing
    client_max_body_size 100M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/x-javascript application/xml application/json;
    gzip_disable "MSIE [1-6]\.";
}
EOL

# Copy NGINX configuration and restart
echo "Applying NGINX configuration..."
sshpass -p "$PASSWORD" scp nginx.conf $SERVER:/etc/nginx/sites-available/default
run_ssh_cmd "systemctl restart nginx"

echo "Verifying deployment..."
if run_ssh_cmd "curl -s http://localhost:3000 > /dev/null"; then
    echo "✅ Deployment successful! Application is running at http://91.151.88.205"
    echo "Features deployed:"
    echo "- Wallet login integration"
    echo "- Voice and video calls"
    echo "- End-to-end encrypted messaging"
    echo "- Multi-language support (EN/TR)"
    echo "- WhatsApp-like UI design"
else
    echo "❌ Deployment verification failed. Please check the logs."
    exit 1
fi
