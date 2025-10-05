# Inventory Management System

A full-stack web application designed to streamline inventory tracking, manage inbound and outbound stock, and provide robust user management capabilities for administrators. This system offers a user-friendly interface to monitor inventory levels, process transactions, and maintain an organized warehouse.
## Live Demo

You can test the live application here:

**Link:** [https://inventory-management-system-jhci.onrender.com/](https://inventory-management-system-jhci.onrender.com/)

**Admin Credentials:**
-   **Email:** `admin123@inventory.com`
-   **Password:** `12345678`

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup](#installation--setup)
    - [Backend Setup](#backend-setup)
    - [Frontend Setup](#frontend-setup)
- [Usage](#usage)

## Features

- **Inventory Dashboard:** Get a real-time overview of all stock, including total SKUs, total quantity, low stock alerts, and out-of-stock items.
- **Inbound Management:** Easily track and record incoming stock. Add new inbound items individually or import them in bulk using an Excel file.
- **Outbound Management:** Process outgoing items efficiently. Add products to a cart, manage outbound transactions, and view a complete history of shipped goods.
- **Admin Dashboard:** A dedicated control panel for administrators to manage users, approve new user registrations, and oversee system-wide settings.
- **User Authentication:** Secure login and registration system with role-based access control (Admin vs. User).
- **Search & Filtering:** Powerful search functionality to quickly find SKUs, items, or locations across the application.
- **Data Export:** Export inventory data to CSV or print directly from the dashboard.
- **Responsive UI:** A clean and modern user interface built to be accessible on various devices.

## Tech Stack

The project is a monorepo with a separate client and server.

-   **Client (Frontend):**
    -   React.js
    -   React Router
    -   Axios for API communication
    -   Tailwind CSS for styling
-   **Server (Backend):**
    -   Node.js
    -   Express.js framework
    -   MongoDB with Mongoose for database management
    -   JWT (JSON Web Tokens) for authentication
    -   Bcrypt.js for password hashing

## Project Structure

The repository is organized into two main directories: `client` and `server`.

```

InventorymgmtV1/
├── client/         \# Contains the React frontend application
│   ├── public/
│   └── src/
│       ├── components/ \# Reusable React components
│       ├── context/    \# Auth context for state management
│       ├── hooks/      \# Custom React hooks
│       ├── pages/      \# Main page components
│       └── utils/      \# Utility functions (e.g., axios instance)
└── server/         \# Contains the Node.js backend API
├── config/
├── controllers/  \# Logic for handling requests
├── middleware/   \# Custom middleware (e.g., auth)
├── models/       \# Mongoose schemas for MongoDB
├── routes/       \# API endpoint definitions
└── utils/        \# Utility services and functions

````

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   Node.js (v14 or later recommended)
-   npm or yarn
-   MongoDB (a local instance or a cloud service like MongoDB Atlas)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/TusharVaishnaw/inventory-management-system.git](https://github.com/TusharVaishnaw/inventory-management-system.git)
    cd inventory-management-system
    ```

#### Backend Setup

2.  **Navigate to the server directory:**
    ```bash
    cd server
    ```

3.  **Install server dependencies:**
    ```bash
    npm install
    ```

4.  **Create the environment file:**
    Create a `.env` file in the `server` directory and add the following variables. Replace the placeholder values with your actual configuration.
    ```env
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_super_secret_jwt_key
    ```

5.  **Start the backend server:**
    ```bash
    npm start
    ```
    -   **IMPORTANT:** On the very first run, the server will detect that no admin user exists and will prompt you to create one directly in the console.
    -   Enter the requested username, email, and password for the initial admin account.
    -   The server will then finish starting and will be running on `http://localhost:5000`.

#### Frontend Setup

6.  **Open a new terminal** and navigate to the client directory from the project root:
    ```bash
    cd client
    ```

7.  **Install client dependencies:**
    ```bash
    npm install
    ```

8.  **Create the environment file:**
    Create a `.env` file in the `client` directory and add the following variable to proxy API requests to your backend:
    ```env
    REACT_APP_API_URL=http://localhost:5000
    ```

9.  **Start the frontend application:**
    ```bash
    npm start
    ```
    The React application should now open in your browser at `http://localhost:3000`.

## Usage

-   Open your browser and navigate to `http://localhost:3000`.
-   Log in using the admin credentials you created in the server console on the first startup.
-   You can now register new users from the frontend. As an admin, you can approve or manage these new users from the Admin Dashboard.

## Contributions are welcome! If you have suggestions for improvements or encounter any issues, please feel free to open an issue or submit a pull request. 🙌


