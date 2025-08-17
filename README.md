# 6ixWallet - Digital Wallet Service

A robust, scalable digital wallet API service built with TypeScript, Express, and MySQL.

![6ixWallet](https://example.com/6ixwallet-logo.png)

## Table of Contents

- [Introduction](#introduction)
- [Architecture Overview](#architecture-overview)
- [Database Design](#database-design)
- [Setup Instructions](#setup-instructions)
- [Code Structure](#code-structure)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Best Practices](#best-practices)

---

## Introduction

6ixWallet is a digital wallet service that allows users to:

- Register and authenticate
- Fund their wallet
- Transfer funds to other users
- Withdraw funds
- View transaction history

The application is built with modern TypeScript and follows industry best practices including clean architecture, transaction management, and comprehensive testing.

---

## Architecture Overview

The application follows a layered architecture pattern:

```
Client → API Routes → Controllers → Services → Data Access (Knex) → Database
```

### Key Components:

- **Express.js**: Web framework for handling HTTP requests
- **Knex.js**: SQL query builder for database interactions
- **Zod**: Schema validation for request data
- **JWT**: Authentication and session management
- **MySQL**: Primary database

---

## Database Design

### Entity-Relationship Diagram

```
┌──────────┐ ┌──────────┐ ┌──────────────┐
│  Users   │ │ Wallets  │ │ Transactions │
├──────────┤ ├──────────┤ ├──────────────┤
│ id (PK)  │─────┬─┤ id (PK) │───┐ │ id (PK) │
│ name     │     │ │ user_id │   │ │ wallet_id │
│ email    │     │ │ balance │   └──┐│ type │
│ phone    │     │ └──────────┘    ││ amount │
│ password │                       ││ reference │
└──────────┘                       ││ description │
                                   └──────────────┘
```

### Tables

#### `users`: Stores user account information

- `id`: UUID primary key
- `name`: User's full name
- `email`: User's email (unique)
- `phone`: Optional phone number
- `password_hash`: Bcrypt hashed password
- `created_at`, `updated_at`: Timestamps

#### `wallets`: Stores wallet information for each user

- `id`: UUID primary key
- `user_id`: Foreign key to `users` table
- `balance`: Current wallet balance (in cents)
- `created_at`, `updated_at`: Timestamps

#### `transactions`: Records all financial transactions

- `id`: UUID primary key
- `wallet_id`: Foreign key to `wallets` table
- `type`: Either 'credit' or 'debit'
- `amount`: Transaction amount (in cents)
- `reference`: Unique transaction reference
- `description`: Optional transaction description
- `created_at`, `updated_at`: Timestamps

#### `transfers`: Records transfers between users

- `id`: UUID primary key
- `from_transaction_id`: Foreign key to `transactions` table
- `to_transaction_id`: Foreign key to `transactions` table
- `status`: Either 'pending', 'completed', or 'failed'
- `created_at`, `updated_at`: Timestamps

#### `blacklist_logs`: Logs results of blacklist checks

- `id`: UUID primary key
- `identity_type`: Type of identity checked
- `identity_value`: Value checked
- `is_blacklisted`: Result of check
- `created_at`: Timestamp

---

## Setup Instructions

### Prerequisites

- Node.js v16+
- MySQL 8.0+
- Docker (optional)

### Environment Variables

Create a `.env` file with the following variables:

```env
NODE_ENV=development
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=6ixwallet
JWT_SECRET=your_jwt_secret
ADJUTOR_BASE_URL=https://adjutor.lendsqr.com/v2/verification/karma
ADJUTOR_API_KEY=your_adjutor_api_key
```

### Local Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/6ixwallet.git
   cd 6ixwallet
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up the database:

   ```bash
   npm run setup-test-db
   npm run migrate
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

### Docker Setup

1. Start the MySQL database:

   ```bash
   docker-compose up -d mysql
   ```

2. Wait for the database to be ready:

   ```bash
   npm run wait-db
   ```

3. Run migrations:

   ```bash
   npm run migrate
   ```

4. Run the application:

   ```bash
   npm run dev
   ```

---

## Code Structure

### Folder Organization

```
src/
├── config/        # Configuration settings
├── controllers/   # Route handlers
├── db/            # Database connection and utilities
├── middlewares/   # Express middlewares
├── migrations/    # Database schema migrations
├── routes/        # API route definitions
├── services/      # Business logic layer
├── tests/         # Test suites
├── utils/         # Helper functions
├── app.ts         # Express app configuration
└── index.ts       # Application entry point
```

---

## Services

Services contain the core business logic of the application. They are responsible for handling operations and ensuring proper transaction management.

### AuthService

Handles user authentication and registration.

- **`register()`**: Creates new user accounts.
- **`login()`**: Authenticates users and issues JWT tokens.
- **`checkAdjutorBlacklist()`**: Verifies if a user is blacklisted.

### WalletService

Manages financial operations.

- **`fundWallet()`**: Adds funds to a user's wallet.
- **`transferFunds()`**: Transfers funds between users.
- **`withdrawFunds()`**: Withdraws funds from a wallet.
- **`getTransactionHistory()`**: Retrieves transaction history.

Services implement transaction handling to ensure ACID properties during financial operations. For example, in `transferFunds()`, the service ensures atomicity by using database transactions to prevent inconsistencies.

---

## Controllers

Controllers handle HTTP requests and delegate the business logic to services. They are responsible for validating inputs, invoking the appropriate service methods, and returning responses.

### AuthController

Handles user authentication and registration endpoints.

- **`register()`**: Processes user registration requests.
- **`login()`**: Processes user login requests.
- **`checkBlacklist()`**: Development-only endpoint for checking if a user is blacklisted.

### WalletController

Manages wallet-related operations.

- **`getWallet()`**: Retrieves wallet information.
- **`fund()`**: Handles wallet funding requests.
- **`transfer()`**: Processes fund transfers between users.
- **`withdraw()`**: Handles withdrawal requests.
- **`getTransactions()`**: Retrieves transaction history.

Controllers follow a consistent pattern of input validation, service invocation, and response formatting to ensure a clean separation of concerns.

---

## API Documentation

The API documentation provides detailed information about each endpoint, including request and response formats, to help developers integrate with the 6ixWallet service effectively.

### Authentication

#### Register User

```http
POST /api/v1/auth/register
```

**Request:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "phone": "1234567890"
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "jwt-token"
}
```

#### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

```

**Request:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid-value",
    "email": "john@example.com"
  },
  "token": "jwt-token"
}
```

### Wallet Operations

#### Get wallet informaation

```http
GET /api/v1/wallet
Authorization: Bearer jwt-token

```

**Response:**

```json
{
  "wallet": {
    "id": "wallet-uuid",
    "balance": 500.0,
    "userId": "user-uuid"
  }
}
```

#### Fund wallet

```http
POST /api/v1/wallet/fund
Authorization: Bearer jwt-token
Content-Type: application/json

```

**Request:**

```json
{
  "amount": 100.0,
  "reference": "fund-123456",
  "description": "Adding funds"
}
```

**Response:**

```json
{
  "message": "Wallet funded successfully",
  "transactionId": "tx-uuid"
}
```

#### Transfer Funds

```http
POST /api/v1/wallet/transfer
Authorization: Bearer jwt-token
Content-Type: application/json

```

**Request:**

```json
{
  "toUserId": "recipient-user-uuid",
  "amount": 50.0,
  "reference": "transfer-123456"
}
```

**Response:**

```json
{
  "message": "Transfer successful",
  "transferId": "transfer-uuid"
}
```

#### Withdraw Funds

```http
POST /api/v1/wallet/withdraw
Authorization: Bearer jwt-token
Content-Type: application/json

```

**Request:**

```json
{
  "amount": 25.0,
  "reference": "withdraw-123456"
}
```

**Response:**

```json
{
  "message": "Withdrawal successful",
  "withdrawalId": "tx-uuid"
}
```

#### Transaction History

```http
GET /api/v1/wallet/transactions?page=1&limit=20
Authorization: Bearer jwt-token
```

**Response:**

```json
{
  "transactions": [
    {
      "id": "tx-uuid-1",
      "type": "credit",
      "amount": 100.0,
      "reference": "fund-123456",
      "description": "Adding funds",
      "created_at": "2023-10-01T12:00:00Z"
    },
    {
      "id": "tx-uuid-2",
      "type": "debit",
      "amount": 50.0,
      "reference": "transfer-123456-debit",
      "description": "Transfer to user",
      "created_at": "2023-10-01T12:05:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 2,
    "totalPages": 1
  }
}
```

### Dev-only

#### Blacklist check

```http
POST /api/v1/dev/check-blacklist
Content-Type: application/json
```

**Request:**

```json
{
  "type": "email",
  "value": "test@example.com"
}
```

**Response:**

```json
{
  "status": 200,
  "isBlacklisted": false
}
```

#### Create User Without Karma Check

```http
POST /api/v1/dev/create-user
Content-Type: application/json
```

**Request:**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword",
  "phone": "9876543210"
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "message": "User created successfully without Karma check"
}
```

---

## Testing

### Testing

Test files are organized to mirror the structure of the application:

- `auth.test.ts`: Tests for authentication endpoints.
- `wallet.test.ts`: Tests for wallet operations.

#### Test Coverage

The tests include:

- **Positive Test Cases**: Verifying expected behavior.
- **Negative Test Cases**: Ensuring proper error handling.
- **Edge Cases**: Handling scenarios like concurrent transfers.

#### Running Tests

Use Jest and Supertest to run the tests:

```bash
npm test
npm run test:watch
npm run test:coverage
```

---

## Deployment

### Render Deployment

1. Create a MySQL database service on a provider like PlanetScale.(Paid no free tier available)
2. Set up environment variables on Render.
3. Add SSL support to `knexfile.js`.

---

## Best Practices

- **Code Quality**: Follow DRY (Don't Repeat Yourself) and SOLID principles to ensure maintainable and scalable code.
- **Transaction Management**: Implement `SELECT FOR UPDATE` to handle row-level locking and prevent race conditions during concurrent transactions.
- **Error Handling**: Use a centralized error-handling middleware to manage and log errors consistently across the application.
- **Security**: Ensure robust security by hashing passwords with bcrypt, validating inputs with Zod, and securing endpoints with JWT-based authentication.
- **Idempotency**: Design APIs to be idempotent where applicable, such as using unique transaction references to prevent duplicate operations.

### Code Snippets

#### Middleware Example: Error Handling

The application uses a centralized error-handling middleware to ensure consistent error responses:

```typescript
import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
};
```

#### Service Example: Wallet Funding

The wallet funding service ensures atomicity using transactions:

```typescript
import { Knex } from "knex";

export const fundWallet = async (
  walletId: string,
  amount: number,
  trx: Knex.Transaction
) => {
  const wallet = await trx("wallets").where({ id: walletId }).first();
  if (!wallet) throw new Error("Wallet not found");

  await trx("wallets")
    .where({ id: walletId })
    .update({ balance: wallet.balance + amount });

  const transaction = await trx("transactions").insert({
    wallet_id: walletId,
    type: "credit",
    amount,
    reference: `fund-${Date.now()}`,
    description: "Wallet funding",
  });

  return transaction;
};
```

#### Controller Example: User Registration

The registration controller validates input and hashes passwords before saving:

```typescript
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password, phone } = registerSchema.parse(req.body);

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await db("users").insert({
    name,
    email,
    password_hash: hashedPassword,
    phone,
  });

  res.status(201).json({ user, message: "User registered successfully" });
};
```

#### Test Example: Wallet Transfer

A Jest test case for wallet transfer functionality:

```typescript
import request from "supertest";
import app from "../src/app";

describe("Wallet Transfer", () => {
  it("should transfer funds between wallets", async () => {
    const response = await request(app)
      .post("/api/v1/wallet/transfer")
      .set("Authorization", "Bearer valid-jwt-token")
      .send({
        toUserId: "recipient-user-uuid",
        amount: 50.0,
        reference: "transfer-123456",
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Transfer successful");
    expect(response.body.transferId).toBeDefined();
  });
});
```

---
