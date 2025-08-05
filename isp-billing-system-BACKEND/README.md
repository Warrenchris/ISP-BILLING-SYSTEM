# ISP Billing System Backend

A comprehensive Node.js + Express backend for an Internet Service Provider (ISP) billing system tailored for Kenya, featuring M-Pesa payment integration, subscription management, and real-time data usage tracking.

## 🚀 Features

### ✅ Completed Features (Phase 1)
- **User Authentication System**
  - User registration with comprehensive validation
  - Secure password hashing using bcrypt
  - JWT-based authentication and authorization
  - User profile management
  - Password change functionality
  - Role-based access control (customer, admin, support)

### 🔄 Upcoming Features
- **Data Plans & Subscriptions** (Phase 2)
- **M-Pesa STK Push Integration** (Phase 3)
- **Invoice Generation & Billing Cycles** (Phase 4)
- **Real-time Data Usage Tracking** (Phase 5)
- **Testing & Documentation** (Phase 6)

## 🏗️ Architecture

The project follows a clean **MVC (Model-View-Controller)** architecture:

```
src/
├── controllers/     # Business logic and request handling
├── models/         # Database models and relationships
├── routes/         # API route definitions
├── middleware/     # Custom middleware (auth, validation, etc.)
├── config/         # Database and application configuration
├── utils/          # Utility functions (JWT, helpers)
├── services/       # Business services (future: M-Pesa, billing)
├── app.js          # Express application setup
└── server.js       # Server startup and database connection
```

## 🛠️ Technology Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Database**: MySQL 8.0
- **ORM**: Sequelize
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: helmet, cors, express-rate-limit
- **Development**: nodemon, jest, supertest

## 📋 Prerequisites

- Node.js 18+ and npm
- MySQL 8.0+
- Git

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd isp-billing-system
npm install
```

### 2. Database Setup
```bash
# Install and start MySQL
sudo apt update && sudo apt install -y mysql-server
sudo systemctl start mysql && sudo systemctl enable mysql

# Create database and user
sudo mysql -e "
CREATE DATABASE IF NOT EXISTS isp_billing_db;
CREATE USER IF NOT EXISTS 'ispuser'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON isp_billing_db.* TO 'ispuser'@'localhost';
FLUSH PRIVILEGES;
"
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Update .env with your configuration
# The default values should work for local development
```

### 4. Start the Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+254712345678",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "nationalId": "12345678",
  "address": "123 Main Street",
  "city": "Nairobi",
  "county": "Nairobi",
  "postalCode": "00100"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

#### Get User Profile
```http
GET /api/auth/profile
Authorization: Bearer <jwt_token>
```

#### Update User Profile
```http
PUT /api/auth/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+254712345679",
  "city": "Mombasa",
  "county": "Mombasa"
}
```

#### Change Password
```http
PUT /api/auth/change-password
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass456!",
  "confirmNewPassword": "NewSecurePass456!"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <jwt_token>
```

### Health Check
```http
GET /health
```

## 🔒 Security Features

- **Password Security**: bcrypt hashing with configurable salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive validation using express-validator
- **Rate Limiting**: Protection against brute force attacks
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers for Express apps
- **SQL Injection Protection**: Sequelize ORM with parameterized queries

## 📱 Kenyan-Specific Features

- **Phone Number Validation**: Supports Kenyan phone number formats (+254 and 0)
- **National ID Support**: Optional national ID field with validation
- **County/City Fields**: Location fields relevant to Kenya
- **M-Pesa Integration**: (Coming in Phase 3)

## 🧪 Testing

### Run API Tests
```bash
# Run the comprehensive test suite
node test_api.js
```

### Run Unit Tests (Future)
```bash
npm test
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 3306 |
| `DB_NAME` | Database name | isp_billing_db |
| `DB_USER` | Database user | ispuser |
| `DB_PASSWORD` | Database password | password |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_EXPIRES_IN` | Token expiration | 7d |
| `BCRYPT_ROUNDS` | Password hashing rounds | 12 |

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone_number VARCHAR(15) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  national_id VARCHAR(20) UNIQUE,
  address TEXT,
  city VARCHAR(50),
  county VARCHAR(50),
  postal_code VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  role ENUM('customer', 'admin', 'support') DEFAULT 'customer',
  last_login DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

## 🚧 Development Roadmap

### Phase 2: Data Plans & Subscriptions
- Create DataPlan model (name, price, data_limit, validity_period)
- Create Subscription model (user_id, plan_id, start_date, end_date, status)
- Implement CRUD operations for data plans
- Implement subscription management endpoints

### Phase 3: M-Pesa Integration
- Safaricom Daraja API integration
- STK Push payment initiation
- Payment callback handling
- Transaction verification and logging

### Phase 4: Invoice Generation
- Automatic invoice generation per billing cycle
- PDF invoice generation
- Email notifications
- Payment tracking and reconciliation

### Phase 5: Data Usage Tracking
- Real-time data usage monitoring
- Usage analytics and reporting
- Data limit enforcement
- Usage alerts and notifications

### Phase 6: Testing & Deployment
- Comprehensive unit and integration tests
- API documentation with Swagger
- Docker containerization
- Production deployment guides

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team

## 🙏 Acknowledgments

- Safaricom for the Daraja API
- The Node.js and Express.js communities
- All contributors to the open-source packages used in this project

