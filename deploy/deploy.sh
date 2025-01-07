#!/bin/bash

# Exit on error
set -e

# Load environment variables
source .env.local

# Install PM2 globally if not installed
echo "Installing PM2..."
ssh root@91.151.88.205 'npm install -g pm2'

# Build the project
echo "Building the project..."
npm run build

# Create deployment directory
echo "Creating deployment directory..."
ssh root@91.151.88.205 'mkdir -p /var/www/solvio'

# Copy project files
echo "Copying project files..."
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' ./ root@91.151.88.205:/var/www/solvio/

# Install dependencies on server
echo "Installing dependencies..."
ssh root@91.151.88.205 'cd /var/www/solvio && npm install'

# Build on server
echo "Building on server..."
ssh root@91.151.88.205 'cd /var/www/solvio && npm run build'

# Copy NGINX configuration
echo "Copying NGINX configuration..."
scp deploy/nginx/default.conf root@91.151.88.205:/etc/nginx/conf.d/default.conf

# Set permissions
echo "Setting permissions..."
ssh root@91.151.88.205 'chown -R www-data:www-data /var/www/solvio'

# Start/Restart PM2 process
echo "Starting PM2 process..."
ssh root@91.151.88.205 'cd /var/www/solvio && pm2 delete solvio || true && pm2 start npm --name "solvio" -- start'

# Restart NGINX
echo "Restarting NGINX..."
ssh root@91.151.88.205 'systemctl restart nginx'

echo "Deployment complete!"
