# ISP Billing System API Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [API Endpoints](#api-endpoints)
   - [Authentication Endpoints](#authentication-endpoints)
   - [Data Plan Endpoints](#data-plan-endpoints)
   - [Subscription Endpoints](#subscription-endpoints)
   - [Payment Endpoints](#payment-endpoints)
   - [Invoice Endpoints](#invoice-endpoints)
   - [Data Usage Endpoints](#data-usage-endpoints)
6. [Data Models](#data-models)
7. [Response Formats](#response-formats)
8. [Status Codes](#status-codes)
9. [Examples](#examples)

## Introduction

The ISP Billing System API is a comprehensive RESTful API designed specifically for Internet Service Providers operating in Kenya. It provides complete functionality for user management, subscription handling, M-Pesa payment integration, invoice generation, and real-time data usage tracking.

### Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

### API Version
Current version: **v1.0.0**

### Content Type
All requests and responses use `application/json` content type unless otherwise specified.

## Authentication

The API uses JWT (JSON Web Token) based authentication. After successful login, you'll receive an access token that must be included in the Authorization header for protected endpoints.

### Authentication Header
```
Authorization: Bearer <your_jwt_token>
```

### Token Expiration
- Access tokens expire after 24 hours
- Refresh tokens expire after 7 days

## Error Handling

The API uses standard HTTP status codes and returns detailed error information in a consistent format.

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **General endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **Payment endpoints**: 10 requests per 15 minutes per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## API Endpoints

### Authentication Endpoints

#### Register User
Creates a new user account with comprehensive validation for Kenyan users.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+254712345678",
  "nationalId": "12345678",
  "county": "Nairobi",
  "city": "Nairobi",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phoneNumber": "+254712345678",
      "role": "customer"
    },
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token"
    }
  }
}
```

#### Login User
Authenticates a user and returns access tokens.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "customer"
    },
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token"
    }
  }
}
```

#### Get User Profile
Retrieves the authenticated user's profile information.

**Endpoint:** `GET /api/auth/profile`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phoneNumber": "+254712345678",
      "nationalId": "12345678",
      "county": "Nairobi",
      "city": "Nairobi",
      "role": "customer",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Data Plan Endpoints

#### Get All Data Plans
Retrieves all available data plans with optional filtering.

**Endpoint:** `GET /api/plans`

**Query Parameters:**
- `category` (optional): Filter by category (basic, standard, premium, enterprise)
- `type` (optional): Filter by type (prepaid, postpaid)
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter
- `popular` (optional): Filter popular plans (true/false)

**Response:**
```json
{
  "success": true,
  "message": "Data plans retrieved successfully",
  "data": {
    "dataPlans": [
      {
        "id": "uuid",
        "name": "Basic Daily",
        "description": "Perfect for light browsing and social media",
        "category": "basic",
        "planType": "prepaid",
        "dataLimit": 1073741824,
        "formattedDataLimit": "1.00 GB",
        "price": 10.00,
        "formattedPrice": "KES 10",
        "validityDays": 1,
        "speed": "5 Mbps",
        "features": ["Social media access", "Basic browsing"],
        "isActive": true,
        "isPopular": false
      }
    ],
    "totalPlans": 11,
    "categories": ["basic", "standard", "premium", "enterprise"]
  }
}
```

#### Get Popular Data Plans
Retrieves plans marked as popular.

**Endpoint:** `GET /api/plans/popular`

**Response:**
```json
{
  "success": true,
  "message": "Popular plans retrieved successfully",
  "data": {
    "dataPlans": [
      {
        "id": "uuid",
        "name": "Standard Monthly",
        "category": "standard",
        "price": 500.00,
        "formattedPrice": "KES 500",
        "dataLimit": 10737418240,
        "formattedDataLimit": "10.00 GB",
        "isPopular": true
      }
    ]
  }
}
```

### Subscription Endpoints

#### Create Subscription
Creates a new subscription for a data plan.

**Endpoint:** `POST /api/subscriptions`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "planId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription created successfully",
  "data": {
    "subscription": {
      "id": "uuid",
      "subscriptionNumber": "SUB123456789",
      "planId": "uuid",
      "status": "pending",
      "dataRemaining": 10737418240,
      "formattedDataRemaining": "10.00 GB",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-31T23:59:59.999Z",
      "autoRenewal": false,
      "plan": {
        "name": "Standard Monthly",
        "price": 500.00,
        "formattedPrice": "KES 500"
      }
    }
  }
}
```

#### Get User Subscriptions
Retrieves all subscriptions for the authenticated user.

**Endpoint:** `GET /api/subscriptions`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Filter by status (active, expired, suspended, cancelled)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Subscriptions retrieved successfully",
  "data": {
    "subscriptions": [
      {
        "id": "uuid",
        "subscriptionNumber": "SUB123456789",
        "status": "active",
        "dataRemaining": 5368709120,
        "formattedDataRemaining": "5.00 GB",
        "usagePercentage": 50,
        "daysRemaining": 15,
        "plan": {
          "name": "Standard Monthly",
          "dataLimit": 10737418240,
          "formattedDataLimit": "10.00 GB"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

### Payment Endpoints

#### Initiate Subscription Payment
Initiates M-Pesa STK Push payment for a subscription.

**Endpoint:** `POST /api/payments/subscription`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "subscriptionId": "uuid",
  "phoneNumber": "+254712345678",
  "amount": 500.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "payment": {
      "id": "uuid",
      "paymentReference": "PAY123456789",
      "amount": 500.00,
      "phoneNumber": "+254712345678",
      "status": "pending",
      "mpesaCheckoutRequestId": "ws_CO_123456789"
    }
  }
}
```

#### Get Payment History
Retrieves payment history for the authenticated user.

**Endpoint:** `GET /api/payments/history`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status
- `startDate` (optional): Start date filter (ISO 8601)
- `endDate` (optional): End date filter (ISO 8601)

**Response:**
```json
{
  "success": true,
  "message": "Payment history retrieved successfully",
  "data": {
    "payments": [
      {
        "id": "uuid",
        "paymentReference": "PAY123456789",
        "amount": 500.00,
        "formattedAmount": "KES 500",
        "status": "completed",
        "paymentMethod": "mpesa",
        "mpesaReceiptNumber": "ABC123DEF456",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "subscription": {
          "subscriptionNumber": "SUB123456789",
          "plan": {
            "name": "Standard Monthly"
          }
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1
    }
  }
}
```

### Invoice Endpoints

#### Generate Invoice
Generates an invoice for a subscription.

**Endpoint:** `POST /api/invoices/generate/:subscriptionId`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Invoice generated successfully",
  "data": {
    "invoice": {
      "id": "uuid",
      "invoiceNumber": "INV-2024-001",
      "totalAmount": 590.00,
      "formattedTotal": "KES 590",
      "taxAmount": 90.00,
      "subtotal": 500.00,
      "status": "pending",
      "dueDate": "2024-01-15T00:00:00.000Z",
      "items": [
        {
          "description": "Standard Monthly Data Plan",
          "quantity": 1,
          "unitPrice": 500.00,
          "totalPrice": 500.00
        },
        {
          "description": "VAT (18%)",
          "quantity": 1,
          "unitPrice": 90.00,
          "totalPrice": 90.00
        }
      ]
    }
  }
}
```

#### Get User Invoices
Retrieves invoices for the authenticated user.

**Endpoint:** `GET /api/invoices`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Filter by status (pending, paid, overdue, cancelled)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Invoices retrieved successfully",
  "data": {
    "invoices": [
      {
        "id": "uuid",
        "invoiceNumber": "INV-2024-001",
        "totalAmount": 590.00,
        "formattedTotal": "KES 590",
        "status": "pending",
        "issueDate": "2024-01-01T00:00:00.000Z",
        "dueDate": "2024-01-15T00:00:00.000Z",
        "subscription": {
          "subscriptionNumber": "SUB123456789"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1
    }
  }
}
```

### Data Usage Endpoints

#### Start Usage Session
Starts a new data usage tracking session.

**Endpoint:** `POST /api/usage/sessions`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "subscriptionId": "uuid",
  "connectionType": "4g",
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "deviceType": "mobile",
    "os": "Android 12"
  },
  "location": {
    "country": "Kenya",
    "city": "Nairobi",
    "coordinates": {
      "lat": -1.2921,
      "lng": 36.8219
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data usage session started successfully",
  "data": {
    "session": {
      "sessionId": "SESSION_123456789_abc",
      "startTime": "2024-01-01T12:00:00.000Z",
      "connectionType": "4g",
      "status": "active"
    }
  }
}
```

#### Update Usage
Updates data usage for an active session.

**Endpoint:** `PUT /api/usage/sessions/:sessionId`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "bytesDownloaded": 52428800,
  "bytesUploaded": 10485760,
  "quality": {
    "signalStrength": 85,
    "latency": 45,
    "speed": 25.5
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data usage updated successfully",
  "data": {
    "session": {
      "sessionId": "SESSION_123456789_abc",
      "totalBytes": 62914560,
      "bytesDownloaded": 52428800,
      "bytesUploaded": 10485760,
      "formattedUsage": "60.00 MB",
      "duration": 15
    }
  }
}
```

#### Get Current Usage
Retrieves current usage summary for the user.

**Endpoint:** `GET /api/usage/current`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `subscriptionId` (optional): Filter by specific subscription

**Response:**
```json
{
  "success": true,
  "message": "Current usage retrieved successfully",
  "data": {
    "usage": {
      "today": {
        "totalBytes": 1073741824,
        "formattedTotal": "1.00 GB",
        "sessionsCount": 5
      },
      "thisMonth": {
        "totalBytes": 5368709120,
        "formattedTotal": "5.00 GB",
        "sessionsCount": 25
      },
      "activeSessions": [
        {
          "sessionId": "SESSION_123456789_abc",
          "startTime": "2024-01-01T12:00:00.000Z",
          "duration": 15,
          "formattedUsage": "60.00 MB"
        }
      ]
    }
  }
}
```

## Data Models

### User Model
```json
{
  "id": "uuid",
  "firstName": "string",
  "lastName": "string",
  "email": "string (unique)",
  "phoneNumber": "string (unique, Kenyan format)",
  "nationalId": "string (unique)",
  "county": "string",
  "city": "string",
  "role": "enum (customer, admin, support)",
  "isActive": "boolean",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### DataPlan Model
```json
{
  "id": "uuid",
  "name": "string",
  "description": "text",
  "category": "enum (basic, standard, premium, enterprise)",
  "planType": "enum (prepaid, postpaid)",
  "dataLimit": "bigint (bytes)",
  "price": "decimal",
  "validityDays": "integer",
  "speed": "string",
  "features": "json array",
  "isActive": "boolean",
  "isPopular": "boolean",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Subscription Model
```json
{
  "id": "uuid",
  "subscriptionNumber": "string (unique)",
  "userId": "uuid (foreign key)",
  "planId": "uuid (foreign key)",
  "status": "enum (pending, active, expired, suspended, cancelled)",
  "dataRemaining": "bigint (bytes)",
  "startDate": "datetime",
  "endDate": "datetime",
  "autoRenewal": "boolean",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

## Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ]
}
```

### Pagination Response
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "items": [],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

## Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## Examples

### Complete User Registration Flow
```javascript
// 1. Register user
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+254712345678',
    nationalId: '12345678',
    county: 'Nairobi',
    city: 'Nairobi',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!'
  })
});

const { data: { tokens } } = await registerResponse.json();
const accessToken = tokens.accessToken;

// 2. Get available plans
const plansResponse = await fetch('/api/plans', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

const { data: { dataPlans } } = await plansResponse.json();
const selectedPlan = dataPlans[0];

// 3. Create subscription
const subscriptionResponse = await fetch('/api/subscriptions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    planId: selectedPlan.id
  })
});

const { data: { subscription } } = await subscriptionResponse.json();

// 4. Initiate payment
const paymentResponse = await fetch('/api/payments/subscription', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    subscriptionId: subscription.id,
    phoneNumber: '+254712345678',
    amount: selectedPlan.price
  })
});

const { data: { payment } } = await paymentResponse.json();
console.log('Payment initiated:', payment.paymentReference);
```

### Data Usage Tracking Flow
```javascript
// 1. Start usage session
const sessionResponse = await fetch('/api/usage/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    subscriptionId: subscription.id,
    connectionType: '4g',
    deviceInfo: {
      userAgent: navigator.userAgent,
      deviceType: 'mobile',
      os: 'Android 12'
    }
  })
});

const { data: { session } } = await sessionResponse.json();
const sessionId = session.sessionId;

// 2. Update usage periodically
setInterval(async () => {
  await fetch(`/api/usage/sessions/${sessionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      bytesDownloaded: 1048576, // 1MB
      bytesUploaded: 262144     // 256KB
    })
  });
}, 60000); // Update every minute

// 3. End session
await fetch(`/api/usage/sessions/${sessionId}/end`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    reason: 'user_disconnected'
  })
});
```

---

**API Version:** 1.0.0  
**Last Updated:** January 2024  
**Contact:** support@ispbilling.com

