# Solvio Deployment Guide

## Prerequisites
1. Domain Name
   - Purchase a domain name from a registrar (e.g., Namecheap, GoDaddy)
   - Configure DNS settings for your chosen hosting provider

2. Hosting Requirements
   - Node.js v16+ environment
   - SSL certificate (Let's Encrypt recommended)
   - Minimum 1GB RAM
   - 20GB SSD storage

## Production Environment Setup

### 1. Server Setup
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Install required global packages
npm install -g pm2
```

### 2. Application Deployment

#### Frontend Deployment
1. Clone the repository:
```bash
git clone https://github.com/your-username/solvia-chat
cd solvia-chat
```

2. Install dependencies:
```bash
npm install
```

3. Create production build:
```bash
npm run build
```

4. Configure Nginx (recommended):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/solvia-chat/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

5. Set up SSL with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. Environment Configuration

Create a `.env.production` file:
```env
VITE_SOLANA_NETWORK=mainnet-beta
VITE_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
```

### 4. Production Start

1. Using PM2 for process management:
```bash
pm2 start npm --name "solvia-chat" -- start
pm2 save
```

2. Enable PM2 startup script:
```bash
pm2 startup
```

## Monitoring and Maintenance

1. Monitor application:
```bash
pm2 monit
```

2. View logs:
```bash
pm2 logs solvia-chat
```

3. Update application:
```bash
git pull
npm install
npm run build
pm2 restart solvia-chat
```

## Security Considerations

1. Configure firewall:
```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

2. Set up regular security updates:
```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Troubleshooting

1. Check application status:
```bash
pm2 status
```

2. Verify nginx configuration:
```bash
sudo nginx -t
```

3. SSL certificate renewal:
```bash
sudo certbot renew --dry-run
```

## Additional Resources

- [Solana Documentation](https://docs.solana.com)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)

## Support

For technical support or questions about deployment, please contact the development team.
