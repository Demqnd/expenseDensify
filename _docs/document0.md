# Document 0 – Project Roadmap & Learning Guide
# Modified June 10 9:48

# AI-Assisted Expense Tracker

## Purpose

The purpose of this project is not to build a production-grade expense tracking application.

The primary purpose is to gain hands-on experience with the complete Software Development Life Cycle (SDLC) and modern software engineering practices used by professional software development teams.

This project is intended to simulate a real-world software project from initial concept through deployment and operations.

The final application should be functional but does not need to be feature-rich. Learning and understanding are more important than the finished product.

---

# Learning Objectives

Upon completion of this project, the developer should have exposure to:

## Software Engineering

- Requirements gathering
- Scope definition
- Architecture design
- Database design
- API design
- Security design
- Documentation

## Development

- Frontend development
- Backend development
- Relational databases
- REST APIs
- Authentication and authorization (look into Google Authorization (Oauth))

## AI Integration

- OCR processing
- Large Language Models (LLMs)
- Structured data extraction
- Prompt engineering

## DevOps

- Git and GitHub
- Branching strategies
- Pull Requests
- Code reviews
- CI/CD pipelines
- Automated testing
- IAC (infrastrcture as code)

## Cloud & Infrastructure

- Docker containers
- Container orchestration
- AWS deployment
- Infrastructure as Code
- Monitoring and logging

## Professional Skills

- Technical decision making
- Design tradeoffs
- Presenting technical solutions
- Defending architectural decisions

---

# Project Philosophy

The objective is not to write thousands of lines of code.

The objective is to understand how modern software systems are built, tested, deployed, and maintained.

Whenever possible:

- Prefer simplicity over complexity
- Prefer understanding over speed
- Prefer completing a feature end-to-end over partially implementing many features

A small working system deployed to the cloud is more valuable than a large unfinished system.

---

# Big Picture

Most academic projects look like this:

Idea
↓
Code

This project will look like this:

Idea
↓
Requirements
↓
Architecture
↓
Database Design
↓
Backend APIs
↓
Frontend UI
↓
AI Integration
↓
Testing
↓
Docker
↓
CI/CD
↓
Cloud Deployment
↓
Operations

The goal is to understand the complete lifecycle of modern software development.

---

# Why We Are Only Creating Three Documents Initially

The first phase of the project focuses on three documents only:

## Project Charter

Answers:

- Why are we building this?
- What are the goals?
- What does success look like?

## Software Requirements Specification (SRS)

Answers:

- What are we building?
- What features are required?
- What is out of scope?

## Architecture Document

Answers:

- How will the system be built?
- What technologies will be used?
- How will the components interact?

Everything else can be derived from these three documents.

---

# Project Scope

The application will allow users to:

- Log in
- Upload receipts
- Extract receipt information using OCR and AI
- Create expenses
- Edit expenses
- View expense history
- Manage users (administrator)

The application will not include:

- Payroll processing
- QuickBooks integration
- Multi-company support
- Mobile applications
- Advanced approval workflows
- Complex reporting

The objective is learning, not feature completeness.

---

# Project Phases

## Phase 1 – Planning

Deliverables:

- Project Charter
- SRS
- Architecture Document

Goal:

Understand what is being built and why.

---

## Phase 2 – Design

Deliverables:

- Database Design
- API Design

Goal:

Understand how the application will work internally.

---

## Phase 3 – Backend Development

Deliverables:

- Authentication
- User Management
- Expense APIs
- Receipt APIs

Goal:

Build the business logic and data layer.

---

## Phase 4 – Frontend Development

Deliverables:

- Login Screen
- Dashboard
- Expense Management
- Receipt Upload

Goal:

Build the user interface.

---

## Phase 5 – AI Integration

Deliverables:

- OCR Service
- Receipt Information Extraction

Goal:

Automate expense entry using AI.

---

## Phase 6 – Testing

Deliverables:

- Unit Tests
- Integration Tests
- End-to-End Tests

Goal:

Verify software quality.

---

## Phase 7 – Containers

Deliverables:

- Dockerfiles
- Docker Compose Environment

Goal:

Run the complete system locally.

---

## Phase 8 – CI/CD

Deliverables:

- GitHub Actions Pipelines

Goal:

Automate building and testing.

---

## Phase 9 – Cloud Deployment

Deliverables:

- AWS Environment
- Automated Deployment

Goal:

Run the application in the cloud.

---

## Phase 10 – Kubernetes

Deliverables:

- Local Kubernetes Deployment

Goal:

Understand container orchestration concepts.

---

## Phase 11 – Final Presentation

Deliverables:

- Architecture Presentation
- Demonstration

Goal:

Communicate technical decisions effectively.

---

# Architecture Decision Records (ADRs)

One of the most important learning objectives is understanding why technologies are selected.

The correct answer is not always the technology itself.

The correct answer is often the reasoning behind the choice.

For each major decision, a short Architecture Decision Record (ADR) should be created.

---

# Decision Point 1 – Frontend Framework

Options:

- React
- Angular
- Vue

Evaluation Criteria:

- Market demand
- Learning resources
- Community support
- Ease of development

Recommended Choice:

React with TypeScript

Reason:

Strong market adoption and excellent learning value.

Deliverable:

Document why React was selected over alternatives.

---

# Decision Point 2 – Backend Framework

Options:

- ASP.NET Core
- Java Spring Boot
- Node.js / NestJS

Evaluation Criteria:

- Industry demand
- Performance
- Documentation
- Developer experience

Recommended Choice:

ASP.NET Core

Reason:

Widely used in enterprise environments and strongly typed.

Deliverable:

Document why ASP.NET Core was selected.

---

# Decision Point 3 – Database

Options:

- PostgreSQL
- MySQL
- SQL Server

Evaluation Criteria:

- Cost
- Popularity
- Features
- Cloud support

Recommended Choice:

PostgreSQL

Reason:

Open source and highly respected in industry.

Deliverable:

Document why PostgreSQL was selected.

---

# Decision Point 4 – OCR Solution

Options:

- Tesseract OCR
- AWS Textract

Evaluation Criteria:

- Cost
- Accuracy
- Learning value

Recommended Choice:

Tesseract OCR

Reason:

Free and deployable locally.

Deliverable:

Document why Tesseract was selected.

---

# Decision Point 5 – AI Platform

Options:

- Ollama
- OpenAI API

Evaluation Criteria:

- Cost
- Ease of use
- Deployment requirements

Recommended Choice:

Ollama

Reason:

Free and runs locally.

Deliverable:

Document why Ollama was selected.

---

# Decision Point 6 – Cloud Provider

Options:

- AWS
- Azure
- Google Cloud

Evaluation Criteria:

- Market demand
- Documentation
- Learning value

Recommended Choice:

AWS

Reason:

Largest market share and strongest resume value.

Deliverable:

Document why AWS was selected.

---

# Decision Point 7 – Containerization

Options:

- No Containers
- Docker

Recommended Choice:

Docker

Reason:

Industry standard.

Deliverable:

Build and run the application using Docker containers.

---

# Decision Point 8 – Container Orchestration

Options:

- Docker Compose
- Kubernetes

Recommended Approach:

Learn both.

Start with Docker Compose.

Move to Kubernetes after the application is functioning.

Deliverable:

Deploy application using both technologies.

---

# Definition of Success

The project will be considered successful if:

- The application runs locally
- The application is deployed to AWS
- Users can upload receipts
- OCR extracts receipt information
- Data is stored in PostgreSQL
- Automated tests run successfully
- CI/CD deploys the application automatically
- Technical decisions can be explained and defended

---

# Interview Readiness Goal

By the end of this project, the developer should be able to confidently explain:

- System architecture
- Database design
- API design
- Authentication
- Testing strategy
- CI/CD pipelines
- Docker
- Kubernetes concepts
- Cloud deployment
- AI integration

The ultimate goal is not merely to build software.

The ultimate goal is to become capable of discussing and defending the design, implementation, deployment, and operation of a modern software system during a technical interview.
