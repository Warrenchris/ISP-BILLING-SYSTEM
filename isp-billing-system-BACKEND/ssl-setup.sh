#!/bin/bash

# SSL/TLS Setup Script for ISP Billing System
# This script sets up SSL certificates using Let's Encrypt (Certbot)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if domain is provided
if [ -z "$1" ]; then
    print_error "Usage: $0 <domain_name>"
    print_error "Example: $0 yourdomain.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@$DOMAIN"}

print_status "Setting up SSL/TLS certificates for domain: $DOMAIN"
print_status "Email for Let's Encrypt notifications: $EMAIL"

# Update system packages
print_status "Updating system packages..."
sudo apt update

# Install Certbot and Nginx plugin
print_status "Installing Certbot and Nginx plugin..."
sudo apt install -y certbot python3-certbot-nginx

# Check if Nginx is installed and running
if ! systemctl is-active --quiet nginx; then
    print_warning "Nginx is not running. Installing and starting Nginx..."
    sudo apt install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
fi

# Backup existing Nginx configuration
print_status "Backing up existing Nginx configuration..."
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# Create basic Nginx configuration for domain verification
print_status "Creating basic Nginx configuration for domain verification..."
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
print_status "Enabling Nginx site configuration..."
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

# Reload Nginx
print_status "Reloading Nginx..."
sudo systemctl reload nginx

# Check if domain resolves to this server
print_status "Checking domain resolution..."
DOMAIN_IP=$(dig +short $DOMAIN)
SERVER_IP=$(curl -s ifconfig.me)

if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    print_warning "Domain $DOMAIN does not resolve to this server IP ($SERVER_IP)"
    print_warning "Current domain IP: $DOMAIN_IP"
    print_warning "Please update your DNS records before proceeding"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Obtain SSL certificate
print_status "Obtaining SSL certificate from Let's Encrypt..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL

# Verify certificate installation
print_status "Verifying SSL certificate installation..."
if sudo certbot certificates | grep -q $DOMAIN; then
    print_status "SSL certificate successfully installed for $DOMAIN"
else
    print_error "SSL certificate installation failed"
    exit 1
fi

# Set up automatic renewal
print_status "Setting up automatic certificate renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test automatic renewal
print_status "Testing automatic renewal..."
sudo certbot renew --dry-run

# Update Nginx configuration with security headers
print_status "Updating Nginx configuration with security headers..."
sudo cp /home/ubuntu/isp-billing-system/nginx.conf /etc/nginx/sites-available/$DOMAIN

# Replace placeholder domain in configuration
sudo sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/$DOMAIN

# Test and reload Nginx
print_status "Testing updated Nginx configuration..."
sudo nginx -t

print_status "Reloading Nginx with new configuration..."
sudo systemctl reload nginx

# Create SSL renewal hook
print_status "Creating SSL renewal hook..."
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
sudo tee /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh > /dev/null <<EOF
#!/bin/bash
systemctl reload nginx
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh

# Display certificate information
print_status "SSL Certificate Information:"
sudo certbot certificates

# Security recommendations
print_status "SSL/TLS setup completed successfully!"
echo
print_status "Security Recommendations:"
echo "1. Regularly update your system: sudo apt update && sudo apt upgrade"
echo "2. Monitor certificate expiration: sudo certbot certificates"
echo "3. Check renewal status: sudo systemctl status certbot.timer"
echo "4. Test your SSL configuration: https://www.ssllabs.com/ssltest/"
echo "5. Monitor Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo
print_status "Your ISP Billing System is now accessible at:"
echo "https://$DOMAIN"
echo "https://www.$DOMAIN"
echo
print_status "API Documentation available at:"
echo "https://$DOMAIN/api/docs"

