# ISP Billing System - Deployment Guide

This guide provides instructions for deploying the ISP Billing System to a production environment.

## 1. Prerequisites

Before you begin, ensure you have the following installed on your server:

*   **Node.js** (LTS version recommended)
*   **npm** (Node Package Manager)
*   **MySQL Server**
*   **Git**
*   **Nginx** or **Apache** (for reverse proxy)
*   **PM2** (Node.js process manager)

## 2. Database Setup

1.  **Create MySQL Database and User:**

    ```bash
    sudo mysql -u root -p
    CREATE DATABASE isp_billing_system;
    CREATE USER 'ispuser'@'localhost' IDENTIFIED BY 'your_password';
    GRANT ALL PRIVILEGES ON isp_billing_system.* TO 'ispuser'@'localhost';
    FLUSH PRIVILEGES;
    EXIT;
    ```

2.  **Configure Database Connection:**

    Edit the `.env` file in the project root and update the database connection details:

    ```
    DB_DATABASE=isp_billing_system
    DB_USERNAME=ispuser
    DB_PASSWORD=your_password
    DB_HOST=localhost
    DB_DIALECT=mysql
    ```

3.  **Run Migrations and Seed Data:**

    Navigate to the project directory and run the following commands to create tables and seed initial data:

    ```bash
    npm install
    npx sequelize db:migrate
    npm run seed
    ```

## 3. Application Setup

1.  **Clone the Repository:**

    ```bash
    git clone <repository_url>
    cd isp-billing-system
    ```

2.  **Install Dependencies:**

    ```bash
    npm install
    ```

3.  **Environment Variables:**

    Create a `.env` file in the project root based on `.env.example` and fill in all necessary production environment variables, including:

    *   `NODE_ENV=production`
    *   `PORT=3000` (or your desired port)
    *   `JWT_SECRET=your_strong_jwt_secret`
    *   `MPESA_CONSUMER_KEY=your_mpesa_consumer_key`
    *   `MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret`
    *   `MPESA_SHORTCODE=your_mpesa_shortcode`
    *   `MPESA_PASSKEY=your_mpesa_passkey`
    *   `MPESA_CALLBACK_URL=your_mpesa_callback_url`

4.  **Start the Application with PM2:**

    PM2 is a process manager that keeps your Node.js applications alive forever, reloads them without downtime, and facilitates common system admin tasks.

    ```bash
    npm install -g pm2
    pm2 start src/server.js --name isp-billing-system
    pm2 save
    pm2 startup
    ```

    This will configure PM2 to start your application automatically on server reboot.

## 4. Reverse Proxy Configuration (Nginx Example)

To serve your application on a standard HTTP/HTTPS port and enable features like SSL, you should use a reverse proxy like Nginx.

1.  **Install Nginx:**

    ```bash
    sudo apt update
    sudo apt install nginx
    ```

2.  **Create Nginx Configuration File:**

    Create a new Nginx configuration file (e.g., `/etc/nginx/sites-available/isp-billing-system`) and add the following content:

    ```nginx
    server {
        listen 80;
        server_name your_domain.com www.your_domain.com;

        location / {
            proxy_pass http://localhost:3000; # Or your application's port
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```

3.  **Enable the Configuration:**

    ```bash
    sudo ln -s /etc/nginx/sites-available/isp-billing-system /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

## 5. SSL/TLS Configuration (Certbot Example)

It is highly recommended to secure your application with SSL/TLS using Let's Encrypt and Certbot.

1.  **Install Certbot:**

    ```bash
    sudo apt install certbot python3-certbot-nginx
    ```

2.  **Obtain and Install SSL Certificate:**

    ```bash
    sudo certbot --nginx -d your_domain.com -d www.your_domain.com
    ```

    Follow the prompts to complete the SSL setup. Certbot will automatically modify your Nginx configuration and set up automatic renewals.

## 6. Logging and Monitoring

*   **PM2 Logs:** You can view application logs using PM2:

    ```bash
    pm2 logs isp-billing-system
    ```

*   **Nginx Logs:** Nginx access and error logs are typically located in `/var/log/nginx/`.

## 7. Updates and Maintenance

To update your application:

1.  **Pull Latest Changes:**

    ```bash
    git pull origin main
    ```

2.  **Install New Dependencies (if any):**

    ```bash
    npm install
    ```

3.  **Restart Application:**

    ```bash
    pm2 restart isp-billing-system
    ```

## Troubleshooting

*   **Check PM2 Status:** `pm2 status` or `pm2 logs isp-billing-system`
*   **Check Nginx Status:** `sudo systemctl status nginx`
*   **Check MySQL Status:** `sudo systemctl status mysql`
*   **Firewall:** Ensure necessary ports (e.g., 80, 443, 3000) are open in your firewall.

This guide provides a basic deployment setup. For more complex deployments, consider containerization (Docker) and orchestration (Kubernetes).

