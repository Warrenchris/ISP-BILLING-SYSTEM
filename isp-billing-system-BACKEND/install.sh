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
