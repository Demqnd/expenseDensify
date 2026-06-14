# Document 2 – Software Requirements Specification (SRS)
# Modified June 12

# expenseKubex

## Introduction

### Purpose

The purpose of this system is to provide a centralized expense management platform for a company of approximately 50 employees.

The system will allow employees to upload receipts, automatically extract information from those receipts, create expense reports, route reports through approval workflows, and support payroll and accounting operations.

### Scope

The Expense Tracker System will allow users to:

- Upload receipt images and PDF files
- Automatically extract expense information using OCR and AI
- Create and manage expense reports
- Route reports through Manager and HR approval workflows
- Process approved expenses for payroll
- Export accounting information to CSV
- Manage users and permissions
- Maintain audit history and record retention

---

# User Roles

The system shall support five user roles.

## Employee

Employees shall be able to:

- Upload receipts
- Create expense reports
- Add expenses from wallet to reports
- View their own expense reports only
- Create, edit, and delete reports
- Edit reports until Manager approval
- Receive email notifications

Employees shall NOT:

- View other users' reports
- Approve reports

## Manager

Managers shall be able to:

- View all expense reports
- Approve reports
- Reject reports
- Add comments

## HR

HR shall be able to:

- View all reports
- Approve reports after Manager approval
- Process approved reports
- Add comments

HR shall NOT:

- Approve reports before Manager approval

## Accountant

Accountants shall be able to:

- Generate accounting reports
- Export approved reports
- View export history

## Administrator

Administrators shall be able to:

- Create users
- Delete users
- Disable users
- Reset passwords
- Assign roles
- Manage categories
- Edit reports
- View all reports
- Manage system settings

---

# User Authentication Requirements

The system shall use internal authentication.

## User Creation Workflow

Administrator creates user

↓

System sends invitation email

↓

User creates password

↓

Account becomes active

## Password Requirements

Passwords shall:

- Minimum length of 8 characters
- Include uppercase letter
- Include lowercase letter
- Include number
- Include special character

Additional requirements:

- Forgot password support
- Email password reset

---

# Employee Information

The system shall maintain:

- Employee ID
- Employee Name
- Email
- Department
- Position
- Assigned Manager
- Role

---

# Receipt Upload Requirements

## File Types

Supported uploads:

- JPG
- JPEG
- PNG
- PDF

## Upload Constraints

- Maximum file size: 5 MB
- Maximum attachments: 20 files

Uploaded receipts shall be stored in a wallet.

---

# Wallet Requirements

The wallet shall:

- Store uploaded receipts
- Organize receipts
- Allow receipts to later be assigned to expense reports

---

# Expense Report Requirements

Expense reports may contain multiple expenses and receipts.

Relationship:

User

↓

Expense Report

↓

Multiple Expenses

↓

Attachments

Expense reports shall include:

- Date
- Vendor
- Amount
- Currency
- Tax amount
- Description
- Category
- Reimbursable status
- Billable status
- Receipt attachment

---

# OCR / AI Requirements

The system shall:

- Accept image and PDF uploads
- Extract available expense information
- Attempt best estimates
- Allow employee edits

Fields to extract:

- Vendor
- Expense date
- Total amount
- Tax
- Category
- Currency
- Description
- Reimbursable status
- Billable status

---

# Expense Report Workflow

Employee Submission

↓

Manager Approval

↓

HR Approval

↓

Payroll Processing

↓

Paid

---

# Expense Report Statuses

Reports may exist in:

- Draft
- Submitted
- Pending Manager Approval
- Pending HR Approval
- Approved
- Rejected
- Paid
- Closed
- Archived

---

# Business Rules

## Editing Rules

- Reports editable until Manager approval
- Employees may delete Draft reports
- Administrators may edit all reports

## Approval Rules

- Managers approve reports
- HR approval requires Manager approval

## Deletion Rules

- Soft delete only
- Data retained
- Audit retained

## Expense Rules

- No spending limits
- Duplicate detection excluded
- Multiple currencies supported

---

# Notification Requirements

Notifications shall use email only.

Notifications include:

- Approval
- Rejection
- Status changes
- Payroll completion
- Approval reminders
- Password resets
- Invitations

---

# Dashboard Requirements

## Employee Dashboard

- Personal reports
- Status tracking

## Manager Dashboard

- Pending approvals

## HR Dashboard

- Payroll queue

## Accountant Dashboard

- Export queue

## Administrator Dashboard

- User management
- Category management
- System overview

---

# Audit Requirements

Track:

- User
- Action
- Previous value
- New value
- Timestamp
- Approvals
- Rejections

---

# Reporting Requirements

## Expense Summary Report

Generate summaries by date.

## Export Report

Generate CSV exports.

The system shall:

- Track exports
- Prevent duplicate exports

---

# Data Retention Requirements

The system shall:

- Retain records for 7 years
- Retain deleted records
- Retain audit history

---

# Non-Functional Requirements

## Performance

Support approximately 50 employees.

## Security

- Authentication required
- Password complexity
- Role-based access control

## Reliability

- Preserve audit history
- Prevent duplicate exports

## Usability

- User-friendly dashboards
- Simple uploads
- Easy OCR editing

---

# End of Requirements Specification

# Next Document

Document 3 – Architecture Document
