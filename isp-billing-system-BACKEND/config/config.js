require('dotenv').config(); // Load variables from .env

const dbConfig = {
  username: process.env.DB_USER || process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || process.env.DB_DATABASE || 'isp_billing_db',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  dialect: process.env.DB_DIALECT || 'mysql',
  logging: process.env.NODE_ENV === 'production' ? false : console.log,
};

module.exports = {
  development: {
    ...dbConfig,
    logging: console.log,
  },
  test: {
    ...dbConfig,
    logging: false,
  },
  production: {
    ...dbConfig,
    logging: false,
  },
};
