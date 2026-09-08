# MedCore Document Operations Hub — Application Specification

## 1. Project Overview

MedCore Medical Technologies Ltd. is a fictional medical-device distributor.

The MedCore Document Operations Hub is an internal web application that provides a user-friendly interface for the Smart Office Document Assistant automation built in n8n.

The application is the user interface only.

n8n remains responsible for all business logic, including:

- reading document content
- AI extraction
- deciding urgency
- writing document records to Google Sheets
- sending Gmail notifications
- storing files in Google Drive
- updating human-review information

The application must never reimplement this logic.

---

## 2. Architecture

The system has three layers:

### Application Layer
Built in this project.

Responsibilities:

- file upload
- client-side validation
- processing state
- result display
- dashboard
- search
- filters
- document detail
- human review
- error and empty states

### Automation Layer
Built in n8n.

Responsibilities:

- document processing
- AI extraction
- urgency logic
- Google Sheets operations
- Google Drive operations
- Gmail notifications
- review updates

### Service Layer
Existing external services:

- Google Sheets
- Google Drive
- Gmail
- AI model

The Google Sheet remains the single source of truth for processed-document records.

The application must not create its own database.

---

## 3. Technology Stack

Use:

- React
- Vite
- JavaScript
- a small Express server
- n8n Cloud

The browser must call the Express server.

The Express server must call n8n.

The n8n shared secret must exist only in the server-side environment configuration and must never appear in browser code.

The application must run locally using one documented command:

npm run dev

---

## 4. API Endpoints

The application communicates with n8n through three endpoints.

### GET /documents

Returns the processed-document records from Google Sheets.

### POST /process-document

Sends one document to n8n for processing and returns the extracted business information.

### POST /review

Records a human review in Google Sheets.

The exact request and response formats are defined in CONTRACT.md.

---

## 5. Allowed Business Values

The application must never invent or change the values returned by n8n.

### document_type

Allowed values:

- invoice
- request
- report
- complaint
- contract
- quote
- other

### urgency

Allowed values:

- Low
- Medium
- High

### department

Allowed values:

- Sales
- Finance
- Support
- HR
- Management
- General

Missing information returned by n8n must remain visible.

Examples:

- Not found
- No action found

The application must not hide, replace, or guess missing information.

---

## 6. Required Features

Build the following features in this order.

### F1 — Upload Screen

Allow the user to choose or drag and drop one document.

Show:

- file name
- file size

Accept only:

- PDF
- DOCX
- TXT

Reject unsupported file types before sending anything to n8n.

Reject oversized files before sending.

---

### F2 — Processing State

When a document is being processed:

- show a clear Processing state
- disable the Send button
- prevent duplicate submissions
- support waits of up to 90 seconds without appearing frozen

Double-clicking Send must not create two spreadsheet rows.

---

### F3 — Result View

After processing, display:

- document type
- sender / company
- summary
- requested action
- deadline
- urgency
- department
- file link

Urgency must have both a text label and visual styling.

Values such as Not found and No action found must remain visible.

---

### F4 — Dashboard

Display all processed documents returned by GET /documents.

Requirements:

- newest documents first
- support at least 20 rows
- no horizontal scrolling on a normal laptop screen
- include a manual Refresh control

Documents processed through the original Google Drive Part 1 workflow must also appear.

---

### F5 — Search and Filters

Provide free-text search over:

- file name
- sender / company
- summary

Provide filters for:

- urgency
- document type
- department
- status

Filters must work together.

Provide a clear No Results state.

---

### F6 — Document Detail and Human Review

The user can open one document and view all document information.

Provide:

- Mark as Reviewed action
- optional review note
- maximum review-note length of 200 characters

The application sends the review to POST /review.

After success, the displayed status must update.

---

### F7 — Error and Empty States

The application must provide readable messages for:

- unsupported file type
- empty/unreadable document
- AI extraction failure
- timeout
- HTTP 4xx response
- HTTP 5xx response
- unavailable n8n workflow
- authentication/configuration problem
- empty document log

Never display a raw stack trace to the user.

---

### F8 — Configuration and Secrets

Webhook URLs and the shared secret must come from environment variables.

The real .env file must be git-ignored.

A committed .env.example file must contain placeholder values only.

No secret, API key, token, or credential may exist in the browser bundle or Git repository.

---

## 7. Mock-First Development

The first application version must NOT call n8n.

Create:

src/api/client.js

as the single place used by the UI for API calls.

Create:

src/api/mock.js

containing example responses based on CONTRACT.md.

The first working UI must use mock data.

After the mock version works, connect the real endpoints one at a time in this order:

1. GET /documents
2. POST /process-document
3. POST /review

---

## 8. Suggested Project Structure

src/
  api/
    client.js
    mock.js
  screens/
    Upload.jsx
    Dashboard.jsx
    DocumentDetail.jsx

server/
  server.js

.env
.env.example
.gitignore
SPEC.md
CONTRACT.md
PROMPTS.md
README.md

---

## 9. Design Direction

The product name is:

MedCore Document Operations Hub

The application should feel like a professional internal operations platform for a medical-device distributor.

Design qualities:

- clean
- professional
- modern
- trustworthy
- operational rather than promotional
- easy to scan
- suitable for office employees
- usable on a normal laptop

Do not make it look like a consumer medical website.

Do not invent medical or clinical information that n8n did not return.

---

## 10. Future Optional Extensions

Do not build these until all eight required features pass testing.

Possible extensions:

1. Export the currently filtered dashboard to CSV.
2. Analytics view using existing document data.
3. English / Hebrew language toggle with full RTL layout support.
4. Public deployment.
5. Login and roles, only if time permits.

Core functionality has priority over optional extensions.

---

## 11. Rules That Must Never Be Broken

- No AI calls from application code.
- No AI prompt inside application code.
- No urgency rules inside application code.
- No direct Google API calls from application code.
- No application database.
- No secret in browser code.
- No secret committed to Git.
- Do not invent missing document information.
- Preserve the exact values defined in CONTRACT.md.
- Keep all n8n-related HTTP calls centralized.