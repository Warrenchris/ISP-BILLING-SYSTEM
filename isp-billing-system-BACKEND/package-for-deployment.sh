#!/bin/bash

# ISP Billing System - Deployment Package Script
# This script packages the application for deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}[PACKAGE]${NC} $1"
}

# Configuration
PROJECT_NAME="isp-billing-system"
VERSION="1.0.0"
PACKAGE_DIR="deployment-package"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="${PROJECT_NAME}-${VERSION}-${TIMESTAMP}"

print_header "Starting deployment package creation for ${PROJECT_NAME} v${VERSION}"

# Clean up previous packages
if [ -d "$PACKAGE_DIR" ]; then
    print_status "Cleaning up previous package directory..."
    rm -rf "$PACKAGE_DIR"
fi

# Create package directory
print_status "Creating package directory: $PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR/$PACKAGE_NAME"

# Copy application files
print_status "Copying application files..."
cp -r src "$PACKAGE_DIR/$PACKAGE_NAME/"
cp -r docs "$PACKAGE_DIR/$PACKAGE_NAME/"
cp package.json "$PACKAGE_DIR/$PACKAGE_NAME/"
cp package-lock.json "$PACKAGE_DIR/$PACKAGE_NAME/"
cp .env.example "$PACKAGE_DIR/$PACKAGE_NAME/"
cp .env.production "$PACKAGE_DIR/$PACKAGE_NAME/"
cp ecosystem.config.js "$PACKAGE_DIR/$PACKAGE_NAME/"
cp nginx.conf "$PACKAGE_DIR/$PACKAGE_NAME/"
cp ssl-setup.sh "$PACKAGE_DIR/$PACKAGE_NAME/"
cp README.md "$PACKAGE_DIR/$PACKAGE_NAME/"
cp .gitignore "$PACKAGE_DIR/$PACKAGE_NAME/"

# Create logs directory
print_status "Creating logs directory..."
mkdir -p "$PACKAGE_DIR/$PACKAGE_NAME/logs"

# Copy deployment scripts
print_status "Copying deployment scripts..."
cp package-for-deployment.sh "$PACKAGE_DIR/$PACKAGE_NAME/"

# Create deployment instructions
print_status "Creating deployment instructions..."
cat > "$PACKAGE_DIR/$PACKAGE_NAME/DEPLOYMENT_INSTRUCTIONS.md" << 'EOF'
# ISP Billing System - Deployment Instructions

## Quick Start

1. **Extract the package:**
   ```bash
   tar -xzf isp-billing-system-*.tar.gz
   cd isp-billing-system-*
   ```

2. **Install dependencies:**
   ```bash
   npm install --production
   ```

3. **Configure environment:**
   ```bash
   cp .env.production .env
   # Edit .env with your production values
   nano .env
   ```

4. **Set up database:**
   ```bash
   # Create MySQL database and user
   mysql -u root -p
   CREATE DATABASE isp_billing_system;
   CREATE USER 'ispuser'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON isp_billing_system.* TO 'ispuser'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

5. **Run database migrations:**
   ```bash
   npm run migrate
   npm run seed
   ```

6. **Start with PM2:**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

7. **Set up Nginx (optional):**
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/isp-billing-system
   sudo ln -s /etc/nginx/sites-available/isp-billing-system /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

8. **Set up SSL (optional):**
   ```bash
   chmod +x ssl-setup.sh
   ./ssl-setup.sh yourdomain.com
   ```

## Documentation

- **API Documentation:** Available at `/api/docs` when server is running
- **User Guide:** See `docs/USER_GUIDE.md`
- **Admin Guide:** See `docs/ADMIN_GUIDE.md`
- **Deployment Guide:** See `docs/DEPLOYMENT_GUIDE.md`

## Support

For technical support, refer to the documentation or contact the development team.
EOF

# Create package info file
print_status "Creating package information file..."
cat > "$PACKAGE_DIR/$PACKAGE_NAME/PACKAGE_INFO.txt" << EOF
ISP Billing System - Deployment Package
========================================

Package Name: $PACKAGE_NAME
Version: $VERSION
Created: $(date)
Node.js Version Required: >= 16.0.0
Database: MySQL 8.0+

Contents:
- Application source code (src/)
- Documentation (docs/)
- Configuration files
- Deployment scripts
- SSL setup script
- Nginx configuration template
- PM2 ecosystem configuration

System Requirements:
- Ubuntu 20.04+ or CentOS 8+
- Node.js 16+ and npm
- MySQL 8.0+
- PM2 (for process management)
- Nginx (recommended for reverse proxy)

Security Features:
- JWT authentication
- Input validation
- SQL injection protection
- Rate limiting
- CORS configuration
- Security headers
- Password hashing with bcrypt

Features:
- User registration and authentication
- Data plan management
- Subscription management
- M-Pesa payment integration
- Invoice generation and billing
- Real-time data usage tracking
- Comprehensive API documentation
- Admin dashboard capabilities
- Logging and monitoring

For detailed deployment instructions, see DEPLOYMENT_INSTRUCTIONS.md
EOF

# Create a simple installation script
print_status "Creating installation script..."
cat > "$PACKAGE_DIR/$PACKAGE_NAME/install.sh" << 'EOF'
#!/bin/bash

# ISP Billing System - Quick Installation Script

set -e

echo "🚀 ISP Billing System - Quick Installation"
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating environment configuration..."
    cp .env.production .env
    echo "📝 Please edit .env file with your production values before starting the application"
fi

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 process manager..."
    npm install -g pm2
fi

echo ""
echo "✅ Installation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your production configuration"
echo "2. Set up your MySQL database"
echo "3. Run: npm run migrate && npm run seed"
echo "4. Start the application: pm2 start ecosystem.config.js --env production"
echo ""
echo "For detailed instructions, see DEPLOYMENT_INSTRUCTIONS.md"
EOF

chmod +x "$PACKAGE_DIR/$PACKAGE_NAME/install.sh"

# Create archive
print_status "Creating deployment archive..."
cd "$PACKAGE_DIR"
tar -czf "${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"
cd ..

# Calculate file sizes
ARCHIVE_SIZE=$(du -h "$PACKAGE_DIR/${PACKAGE_NAME}.tar.gz" | cut -f1)
FOLDER_SIZE=$(du -sh "$PACKAGE_DIR/$PACKAGE_NAME" | cut -f1)

print_status "Package created successfully!"
echo ""
print_header "Package Summary"
echo "Package Name: $PACKAGE_NAME"
echo "Archive: $PACKAGE_DIR/${PACKAGE_NAME}.tar.gz ($ARCHIVE_SIZE)"
echo "Folder: $PACKAGE_DIR/$PACKAGE_NAME ($FOLDER_SIZE)"
echo ""
print_status "Package contents:"
echo "- Application source code and dependencies"
echo "- Complete documentation"
echo "- Deployment and configuration scripts"
echo "- SSL setup automation"
echo "- Nginx configuration template"
echo "- PM2 process management configuration"
echo ""
print_status "To deploy:"
echo "1. Transfer ${PACKAGE_NAME}.tar.gz to your production server"
echo "2. Extract: tar -xzf ${PACKAGE_NAME}.tar.gz"
echo "3. Follow instructions in DEPLOYMENT_INSTRUCTIONS.md"
echo ""
print_warning "Remember to:"
echo "- Configure your .env file with production values"
echo "- Set up your MySQL database"
echo "- Configure your domain and SSL certificates"
echo "- Test the deployment in a staging environment first"

