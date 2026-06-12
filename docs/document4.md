# Document 4 – Database Design
# Modified June 12

# expenseDensify

## Purpose

The purpose of this document is to define the database design for expenseDensify.

This document explains what data will be stored, how tables relate to each other, and how the database supports the application requirements.

The goal is to create a simple relational database structure before backend development begins.

---

# Database Overview

expenseDensify will use a relational database.

The selected database is PostgreSQL.

PostgreSQL will store:

- User account information
- Expense records
- Receipt metadata
- OCR output
- AI extracted values

The database design should remain simple and support the core project scope.

---

# Database Technology

Database:

PostgreSQL

Reason:

- Open source
- Reliable
- Widely used in industry
- Works well with ASP.NET Core
- Supported by cloud providers

---

# Main Entities

The initial database will include the following entities:

- Users
- Expenses
- Receipts

These entities are enough to support the first version of the application.

Additional entities may be added later if the project expands.

---

# Entity Relationship Overview

User  
↓  
Expense  
↓  
Receipt

Relationship Summary:

- One user can have many expenses
- One expense can have one receipt
- One receipt belongs to one expense

---

# Users Table

The Users table stores application user accounts.

Fields:

- Id
- Email
- PasswordHash
- Role
- CreatedAt
- UpdatedAt

Purpose:

The Users table supports authentication, authorization, and ownership of expenses.

Example roles:

- Employee
- Administrator

---

# Expenses Table

The Expenses table stores expense records created by users.

Fields:

- Id
- UserId
- Merchant
- ExpenseDate
- Amount
- Tax
- Currency
- Category
- Description
- Status
- CreatedAt
- UpdatedAt

Purpose:

The Expenses table stores the main financial record submitted by the user.

Example statuses:

- Draft
- Submitted

---

# Receipts Table

The Receipts table stores information about uploaded receipt files.

Fields:

- Id
- ExpenseId
- FileName
- FilePath
- FileType
- FileSize
- OcrText
- ExtractedMerchant
- ExtractedDate
- ExtractedAmount
- ExtractedTax
- CreatedAt

Purpose:

The Receipts table stores receipt metadata, OCR text, and AI-extracted values.

The actual receipt file may be stored in local storage during development and cloud storage later.

---

# Relationships

## Users to Expenses

One user can create many expenses.

One expense belongs to one user.

Relationship:

Users.Id  
↓  
Expenses.UserId

Type:

One-to-Many

---

## Expenses to Receipts

One expense can have one receipt.

One receipt belongs to one expense.

Relationship:

Expenses.Id  
↓  
Receipts.ExpenseId

Type:

One-to-One

---

# Initial ERD

Users  
1  
↓  
Many  
Expenses  
1  
↓  
1  
Receipts

---

# Data Types

Recommended data types:

## Users

Id:

UUID or integer primary key

Email:

Text

PasswordHash:

Text

Role:

Text or enum

CreatedAt:

Timestamp

UpdatedAt:

Timestamp

---

## Expenses

Id:

UUID or integer primary key

UserId:

Foreign key

Merchant:

Text

ExpenseDate:

Date

Amount:

Decimal

Tax:

Decimal

Currency:

Text

Category:

Text

Description:

Text

Status:

Text or enum

CreatedAt:

Timestamp

UpdatedAt:

Timestamp

---

## Receipts

Id:

UUID or integer primary key

ExpenseId:

Foreign key

FileName:

Text

FilePath:

Text

FileType:

Text

FileSize:

Integer

OcrText:

Text

ExtractedMerchant:

Text

ExtractedDate:

Date

ExtractedAmount:

Decimal

ExtractedTax:

Decimal

CreatedAt:

Timestamp

---

# Status Values

Expense status should begin simple.

Initial status values:

- Draft
- Submitted

Future status values may include:

- Approved
- Rejected
- Paid

For the first version, complex approval workflows are out of scope.

---

# File Storage Approach

Receipt files will not be stored directly inside the database.

The database will store the file path or storage reference.

During development:

- Files may be stored locally

During cloud deployment:

- Files may be stored in AWS S3

This keeps the database smaller and easier to manage.

---

# Security Considerations

Passwords should never be stored as plain text.

The database will store password hashes only.

Sensitive information should be protected through backend validation and authorization.

Users should only access their own expenses unless they have an administrator role.

---

# Database Design Decisions

Decision:

Use PostgreSQL.

Reason:

PostgreSQL is open source, reliable, and widely used in industry.

---

Decision:

Store receipt files outside the database.

Reason:

File storage is better handled by the file system or cloud storage.

---

Decision:

Start with a small number of tables.

Reason:

The project prioritizes learning and completion over unnecessary complexity.

---

# Future Database Improvements

Possible future additions:

- Expense categories table
- Audit logs
- Approval records
- Organizations table
- Comments table
- Payment records
- Soft delete fields

These are not required for the first version.

---

# Definition of Database Success

The database design will be successful if:

- Users can be stored securely
- Expenses can be linked to users
- Receipts can be linked to expenses
- OCR text can be stored
- AI extracted values can be stored
- The structure supports backend API development

---

# Next Document

Document 5 – API Design
