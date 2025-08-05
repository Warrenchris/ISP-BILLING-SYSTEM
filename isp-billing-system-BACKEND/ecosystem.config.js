module.exports = {
  apps: [
    {
      name: "isp-billing-system",
      script: "./src/server.js",
      instances: "max", // Use all available CPU cores
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
        PORT: 3000
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000
      },
      // Logging
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      
      // Auto-restart configuration
      watch: false, // Set to true for development
      ignore_watch: ["node_modules", "logs", "docs"],
      max_memory_restart: "1G",
      
      // Advanced PM2 features
      min_uptime: "10s",
      max_restarts: 10,
      autorestart: true,
      
      // Environment variables
      env_file: ".env",
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Health monitoring
      health_check_grace_period: 3000,
      
      // Source map support
      source_map_support: true,
      
      // Merge logs from all instances
      merge_logs: true,
      
      // Time zone
      time: true
    }
  ],
  
  deploy: {
    production: {
      user: "ubuntu",
      host: ["your-server-ip"],
      ref: "origin/main",
      repo: "your-git-repository-url",
      path: "/var/www/isp-billing-system",
      "pre-deploy-local": "",
      "post-deploy": "npm install && npm run build && pm2 reload ecosystem.config.js --env production",
      "pre-setup": ""
    }
  }
};

