# Document 5 – API Design
# Modified June 12

# expenseDensify

## Purpose

The purpose of this document is to define the API design for expenseDensify.

This document explains how the frontend will communicate with the backend.

The goal is to create a clear API plan before backend development begins.

---

# API Overview

expenseDensify will use REST APIs.

The backend will be built using ASP.NET Core Web API.

The frontend will send HTTP requests to the backend to perform actions such as logging in, uploading receipts, creating expenses, and viewing expense history.

---

# Base URL

Development Base URL:

http://localhost:5000/api

Example:

http://localhost:5000/api/expenses

---

# Authentication

The API will use JWT authentication.

After login, the backend returns a token.

The frontend includes the token in future requests.

Example Header:

Authorization: Bearer {token}

---

# Main API Groups

The API will be organized into the following groups:

- Authentication
- Users
- Expenses
- Receipts

---

# Authentication Endpoints

## POST /auth/register

Purpose:

Create a new user account.

Request Body:

{
  "email": "user@example.com",
  "password": "Password123",
  "role": "Employee"
}

Response:

{
  "id": "user-id",
  "email": "user@example.com",
  "role": "Employee"
}

---

## POST /auth/login

Purpose:

Authenticate a user and return a JWT token.

Request Body:

{
  "email": "user@example.com",
  "password": "Password123"
}

Response:

{
  "token": "jwt-token",
  "email": "user@example.com",
  "role": "Employee"
}

---

# User Endpoints

## GET /users

Purpose:

Return all users.

Access:

Administrator only.

Response:

[
  {
    "id": "user-id",
    "email": "user@example.com",
    "role": "Employee"
  }
]

---

## POST /users

Purpose:

Create a user account.

Access:

Administrator only.

Request Body:

{
  "email": "newuser@example.com",
  "role": "Employee"
}

Response:

{
  "id": "user-id",
  "email": "newuser@example.com",
  "role": "Employee"
}

---

# Expense Endpoints

## GET /expenses

Purpose:

Return expenses for the logged-in user.

Response:

[
  {
    "id": "expense-id",
    "merchant": "Tim Hortons",
    "expenseDate": "2026-06-12",
    "amount": 12.50,
    "tax": 1.63,
    "currency": "CAD",
    "category": "Food",
    "status": "Draft"
  }
]

---

## GET /expenses/{id}

Purpose:

Return one expense by ID.

Response:

{
  "id": "expense-id",
  "merchant": "Tim Hortons",
  "expenseDate": "2026-06-12",
  "amount": 12.50,
  "tax": 1.63,
  "currency": "CAD",
  "category": "Food",
  "description": "Lunch",
  "status": "Draft"
}

---

## POST /expenses

Purpose:

Create a new expense.

Request Body:

{
  "merchant": "Tim Hortons",
  "expenseDate": "2026-06-12",
  "amount": 12.50,
  "tax": 1.63,
  "currency": "CAD",
  "category": "Food",
  "description": "Lunch"
}

Response:

{
  "id": "expense-id",
  "status": "Draft"
}

---

## PUT /expenses/{id}

Purpose:

Update an existing expense.

Request Body:

{
  "merchant": "Tim Hortons",
  "expenseDate": "2026-06-12",
  "amount": 15.25,
  "tax": 1.98,
  "currency": "CAD",
  "category": "Food",
  "description": "Updated lunch"
}

Response:

{
  "id": "expense-id",
  "status": "Draft"
}

---

## DELETE /expenses/{id}

Purpose:

Delete an expense.

Response:

{
  "message": "Expense deleted successfully"
}

---

# Receipt Endpoints

## POST /receipts/upload

Purpose:

Upload a receipt file.

Request Type:

multipart/form-data

Request Fields:

- file
- expenseId

Response:

{
  "receiptId": "receipt-id",
  "fileName": "receipt.jpg",
  "message": "Receipt uploaded successfully"
}

---

## POST /receipts/{id}/process

Purpose:

Run OCR and AI extraction on an uploaded receipt.

Response:

{
  "receiptId": "receipt-id",
  "ocrText": "Raw receipt text",
  "extractedData": {
    "merchant": "Tim Hortons",
    "expenseDate": "2026-06-12",
    "amount": 12.50,
    "tax": 1.63
  }
}

---

## GET /receipts/{id}

Purpose:

Return receipt information.

Response:

{
  "id": "receipt-id",
  "expenseId": "expense-id",
  "fileName": "receipt.jpg",
  "fileType": "image/jpeg",
  "fileSize": 245000,
  "ocrText": "Raw receipt text"
}

---

# Error Responses

The API should return clear error messages.

Example Error Response:

{
  "error": "Invalid login credentials"
}

Common HTTP status codes:

- 200 OK
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 500 Internal Server Error

---

# Authorization Rules

Employees:

- Can view their own expenses
- Can create expenses
- Can edit their own expenses
- Can upload receipts

Administrators:

- Can manage users
- Can view users
- Can access administrative functions

---

# Validation Rules

The API should validate:

- Required fields
- Valid email format
- Positive expense amount
- Valid date
- Supported file type
- Maximum file size

Example supported file types:

- JPG
- PNG
- PDF

---

# API Design Decisions

Decision:

Use REST APIs.

Reason:

REST is widely used, simple to understand, and suitable for this project.

---

Decision:

Use JWT authentication.

Reason:

JWT is commonly used for stateless authentication between frontend and backend applications.

---

Decision:

Use JSON for request and response bodies.

Reason:

JSON is standard for modern web APIs.

---

Decision:

Use multipart/form-data for receipt uploads.

Reason:

File uploads require multipart form data.

---

# Definition of API Success

The API design will be successful if:

- Frontend can authenticate users
- Frontend can create and retrieve expenses
- Receipts can be uploaded
- OCR processing can be triggered
- Errors are returned clearly
- Authorization rules are enforced

---

# Next Step

Begin backend development with ASP.NET Core Web API.
