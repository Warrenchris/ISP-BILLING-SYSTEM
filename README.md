# ISP Billing System

A full-stack web application for an Internet Service Provider (ISP) billing system. This project includes a React-based frontend for the user interface and a Node.js/Express backend to handle business logic, database interactions, and payment integrations. This system is tailored for the Kenyan market, with features like M-Pesa integration.
YOUTUBE link: https://youtu.be/frAzeNYZ4ZE
## Features

This project is being developed in phases. Here is a summary of the completed and planned features:

*   **User Authentication:** Secure user registration, login, and profile management using JWT.
*   **Role-Based Access Control:** Different roles for customers, administrators, and support staff.
*   **Data Plan Management:** (Upcoming) Administrators can create, update, and delete data plans.
*   **Subscription Management:** (Upcoming) Users can subscribe to data plans.
*   **M-Pesa Integration:** (Upcoming) Support for STK push notifications for payments.
*   **Invoice Generation:** (Upcoming) Automatic generation of PDF invoices.
*   **Data Usage Tracking:** (Upcoming) Real-time monitoring of data usage.

## Technology Stack

### Frontend

*   **Framework:** React
*   **Styling:** CSS, Material-UI (or other component library - to be confirmed)

### Backend

*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** MySQL
*   **ORM:** Sequelize
*   **Authentication:** JWT (JSON Web Tokens)
*   **Payment Integration:** M-Pesa Daraja API

## Architecture

The project follows a client-server architecture:

*   **`isp-billing-frontend/`**: A React single-page application that serves as the user interface.
*   **`isp-billing-system-BACKEND/`**: A Node.js/Express server that provides a RESTful API for the frontend. It handles all business logic, database operations, and interactions with external services like M-Pesa.

## Getting Started

To get the application running locally, you will need to set up both the frontend and the backend.

### Prerequisites

*   Node.js (v18 or higher)
*   npm (or yarn)
*   MySQL (v8.0 or higher)
*   Git

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd isp-billing-system-BACKEND
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up the database:**
    *   Make sure you have MySQL installed and running.
    *   Create a database and a user for the application. You can use the following SQL commands:
        ```sql
        CREATE DATABASE IF NOT EXISTS isp_billing_db;
        CREATE USER IF NOT EXISTS 'ispuser'@'localhost' IDENTIFIED BY 'password';
        GRANT ALL PRIVILEGES ON isp_billing_db.* TO 'ispuser'@'localhost';
        FLUSH PRIVILEGES;
        ```

4.  **Configure environment variables:**
    *   Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    *   Open the `.env` file and update the database credentials and JWT secret.

5.  **Run database migrations:**
    ```bash
    npx sequelize-cli db:migrate
    ```

6.  **Start the backend server:**
    ```bash
    npm run dev
    ```
    The backend will be running on `http://localhost:3000`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../isp-billing-frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the frontend server:**
    ```bash
    npm start
    ```
    The frontend will be running on `http://localhost:3001` (or another available port) and will connect to the backend API.

## Directory Structure

```
.
├── isp-billing-frontend/      # React frontend application
└── isp-billing-system-BACKEND/  # Node.js backend application
```

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature`).
6.  Open a pull request.

## License

This project is licensed under the ISC License.
