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
