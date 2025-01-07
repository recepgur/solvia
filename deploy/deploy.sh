#!/bin/bash

# Exit on error
set -e

# Load environment variables
source .env.local

# Build the project
echo "Building the project..."
npm run build

# Create deployment directory
echo "Creating deployment directory..."
ssh root@91.151.88.205 'mkdir -p /var/www/html'

# Copy NGINX configuration
echo "Copying NGINX configuration..."
scp deploy/nginx/default.conf root@91.151.88.205:/etc/nginx/conf.d/default.conf

# Copy built files
echo "Copying built files..."
scp -r dist/* root@91.151.88.205:/var/www/html/

# Set permissions
echo "Setting permissions..."
ssh root@91.151.88.205 'chown -R www-data:www-data /var/www/html'

# Restart NGINX
echo "Restarting NGINX..."
ssh root@91.151.88.205 'systemctl restart nginx'

echo "Deployment complete!"
