const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ISP Billing System API",
      version: "1.0.0",
      description: "API documentation for the ISP Billing System tailored for Kenya.",
    },
    servers: [
      {
        url: "http://localhost:3000/api",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            firstName: {
              type: "string",
              example: "John",
            },
            lastName: {
              type: "string",
              example: "Doe",
            },
            email: {
              type: "string",
              format: "email",
              example: "john.doe@example.com",
            },
            phoneNumber: {
              type: "string",
              example: "+254712345678",
            },
            nationalId: {
              type: "string",
              example: "12345678",
            },
            county: {
              type: "string",
              example: "Nairobi",
            },
            city: {
              type: "string",
              example: "Nairobi",
            },
            role: {
              type: "string",
              enum: ["customer", "admin", "support"],
              example: "customer",
            },
            isVerified: {
              type: "boolean",
              example: false,
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        DataPlan: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174001",
            },
            name: {
              type: "string",
              example: "Basic 10GB",
            },
            description: {
              type: "string",
              example: "10 GB data for 30 days",
            },
            category: {
              type: "string",
              example: "home",
            },
            planType: {
              type: "string",
              example: "prepaid",
            },
            dataLimit: {
              type: "integer",
              example: 10737418240, // 10 GB in bytes
            },
            price: {
              type: "number",
              format: "float",
              example: 1000.00,
            },
            validityDays: {
              type: "integer",
              example: 30,
            },
            validityPeriod: {
              type: "integer",
              example: 30,
            },
            speed: {
              type: "string",
              example: "10 Mbps",
            },
            features: {
              type: "array",
              items: {
                type: "string",
              },
              example: ["Unlimited social media"],
            },
            isActive: {
              type: "boolean",
              example: true,
            },
            isPopular: {
              type: "boolean",
              example: false,
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Subscription: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174002",
            },
            userId: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            planId: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174001",
            },
            subscriptionNumber: {
              type: "string",
              example: "SUB123456789",
            },
            status: {
              type: "string",
              enum: ["active", "expired", "suspended", "cancelled"],
              example: "active",
            },
            startDate: {
              type: "string",
              format: "date-time",
            },
            endDate: {
              type: "string",
              format: "date-time",
            },
            dataUsed: {
              type: "integer",
              example: 1073741824, // 1 GB in bytes
            },
            dataRemaining: {
              type: "integer",
              example: 9663676416, // 9 GB in bytes
            },
            autoRenew: {
              type: "boolean",
              example: true,
            },
            renewalDate: {
              type: "string",
              format: "date-time",
            },
            activatedAt: {
              type: "string",
              format: "date-time",
            },
            suspendedAt: {
              type: "string",
              format: "date-time",
            },
            cancelledAt: {
              type: "string",
              format: "date-time",
            },
            suspensionReason: {
              type: "string",
              example: "Payment overdue",
            },
            cancellationReason: {
              type: "string",
              example: "Customer request",
            },
            notes: {
              type: "string",
              example: "Special discount applied",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Payment: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174003",
            },
            userId: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            subscriptionId: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174002",
            },
            invoiceId: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174004",
            },
            amount: {
              type: "number",
              format: "float",
              example: 1000.00,
            },
            currency: {
              type: "string",
              example: "KES",
            },
            paymentMethod: {
              type: "string",
              example: "M-Pesa",
            },
            transactionId: {
              type: "string",
              example: "MPESA123456789",
            },
            status: {
              type: "string",
              enum: ["pending", "completed", "failed"],
              example: "completed",
            },
            paymentDate: {
              type: "string",
              format: "date-time",
            },
            notes: {
              type: "string",
              example: "Payment for monthly subscription",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Invoice: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174004",
            },
            userId: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            subscriptionId: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174002",
            },
            invoiceNumber: {
              type: "string",
              example: "INV-2023-0001",
            },
            issueDate: {
              type: "string",
              format: "date-time",
            },
            dueDate: {
              type: "string",
              format: "date-time",
            },
            totalAmount: {
              type: "number",
              format: "float",
              example: 1000.00,
            },
            status: {
              type: "string",
              enum: ["pending", "paid", "overdue", "cancelled"],
              example: "pending",
            },
            paymentId: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174003",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        InvoiceItem: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174005",
            },
            invoiceId: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174004",
            },
            description: {
              type: "string",
              example: "Monthly subscription fee",
            },
            amount: {
              type: "number",
              format: "float",
              example: 1000.00,
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        DataUsage: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174006",
            },
            userId: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            subscriptionId: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174002",
            },
            startTime: {
              type: "string",
              format: "date-time",
            },
            endTime: {
              type: "string",
              format: "date-time",
            },
            bytesDownloaded: {
              type: "integer",
              example: 5368709120, // 5 GB in bytes
            },
            bytesUploaded: {
              type: "integer",
              example: 1073741824, // 1 GB in bytes
            },
            ipAddress: {
              type: "string",
              format: "ipv4",
              example: "192.168.1.1",
            },
            deviceInfo: {
              type: "string",
              example: "Chrome on Windows",
            },
            status: {
              type: "string",
              enum: ["active", "completed", "terminated"],
              example: "active",
            },
            location: {
              type: "string",
              example: "Nairobi, Kenya",
            },
            signalStrength: {
              type: "number",
              format: "float",
              example: -60.5,
            },
            latency: {
              type: "integer",
              example: 25,
            },
            speed: {
              type: "number",
              format: "float",
              example: 50.2,
            },
            notes: {
              type: "string",
              example: "High usage session",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Authentication token is missing or invalid",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Unauthorized: Access token is missing or invalid",
                  },
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: "User does not have the necessary permissions",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Forbidden: Admin access required",
                  },
                },
              },
            },
          },
        },
        BadRequest: {
          description: "Invalid request payload or parameters",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Bad Request: Invalid input data",
                  },
                },
              },
            },
          },
        },
        ValidationError: {
          description: "Validation error due to invalid input",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Validation Error",
                  },
                  errors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field: {
                          type: "string",
                          example: "email",
                        },
                        message: {
                          type: "string",
                          example: "Invalid email format",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Resource not found",
                  },
                },
              },
            },
          },
        },
        InternalServerError: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Internal Server Error",
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/models/*.js"], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

