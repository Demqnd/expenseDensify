# Document 3 – Architecture Document
# Modified June 12

# expenseDensify

## Purpose

The purpose of this document is to define the technical architecture of expenseDensify.

This document explains how the system will be structured, how components interact, and why technologies were selected.

The goal is to establish a blueprint before implementation begins.

---

# Architecture Overview

expenseDensify follows a multi-layer architecture.

The application consists of:

- Frontend Application
- Backend API
- Database
- AI Processing Layer
- Deployment Infrastructure

Each component has separate responsibilities and communicates through defined interfaces.

---

# System Architecture

Application Flow:

Browser  
↓  
Frontend (Next.js + React)  
↓  
Backend API (ASP.NET Core)  
↓  
PostgreSQL Database

Receipt Processing Flow:

Receipt Upload  
↓  
OCR Processing (Tesseract)  
↓  
AI Extraction (Ollama)  
↓  
Structured Expense Data  
↓  
Database Storage

---

# Frontend Architecture

Technology:

- Next.js
- React
- TypeScript

Responsibilities:

- Render user interface
- Handle user interaction
- Validate input
- Communicate with backend APIs
- Manage authentication state

Primary Screens:

- Login
- Dashboard
- Upload Receipt
- Expense History
- User Management

---

# Backend Architecture

Technology:

- ASP.NET Core Web API
- C#

Responsibilities:

- Authentication
- Authorization
- Business logic
- Database access
- Receipt processing
- API management

Core Modules:

- Authentication Service
- User Service
- Expense Service
- Receipt Service
- OCR Service

---

# Database Architecture

Technology:

- PostgreSQL

Responsibilities:

- Store users
- Store expenses
- Store receipt information
- Store OCR output

Initial Entities:

- Users
- Expenses
- Receipts

Detailed schema will be defined in Document 4.

---

# AI Architecture

OCR Technology:

- Tesseract OCR

AI Platform:

- Ollama

Workflow:

Receipt Image

↓

OCR extracts raw text

↓

LLM converts text into structured fields

↓

Backend validates extracted values

↓

Expense created

Expected extracted values:

- Merchant
- Date
- Amount
- Tax

Users may edit extracted values before submission.

---

# Authentication Architecture

Authentication Method:

JWT Authentication

Flow:

User Login

↓

Backend validates credentials

↓

JWT generated

↓

Frontend stores token

↓

Future requests include token

Roles:

- Employee
- Administrator

---

# Infrastructure Architecture

Local Environment:

- Docker
- Docker Compose

Cloud Environment:

- AWS

CI/CD:

- GitHub Actions

Deployment Pipeline:

Git Push

↓

Build

↓

Test

↓

Deploy

↓

Application Update

---

# Architecture Decisions

Frontend:

React + Next.js

Reason:

Strong market adoption and learning value.

Backend:

ASP.NET Core

Reason:

Enterprise usage and strong typing.

Database:

PostgreSQL

Reason:

Open source and cloud-friendly.

AI:

Ollama

Reason:

Runs locally and minimizes cost.

Deployment:

AWS

Reason:

Strong industry relevance.

---

# Non-Functional Requirements

Performance:

- API response under 2 seconds

Availability:

- Application should run locally

Security:

- Password hashing
- JWT authentication

Maintainability:

- Modular architecture

Scalability:

- Containerized deployment

---

# Definition of Architectural Success

Architecture will be successful if:

- Frontend communicates with backend
- Data persists correctly
- OCR extracts usable data
- Application runs locally
- Deployment succeeds
- Architecture decisions can be explained

---

# Next Document

Document 4 – Database Design
