# MedCore Document Operations Hub — API Contract

This document defines the contract between the MedCore application and the n8n workflows.

If this contract changes, the change must also be reflected in:

1. the n8n workflow
2. the application
3. this CONTRACT.md file

---

# 1. POST /process-document

## Request

Content-Type:

application/json

Header:

x-api-key: <shared secret>

Body:

{
  "file_name": "invoice-4471.pdf",
  "mime_type": "application/pdf",
  "file_base64": "<base64 file content>",
  "submitted_by": "employee@medcore.example"
}

## Request Fields

### file_name
Type: string

Required: yes

Original file name including extension.

### mime_type
Type: string

Required: yes

Supported MIME types correspond to:

- PDF
- DOCX
- TXT

### file_base64
Type: string

Required: yes

The file encoded as base64.

The data URL prefix must not be included.

### submitted_by
Type: string

Required: no

Name or email of the person submitting the document.

---

# 2. POST /process-document — Successful Response

HTTP status:

200

Example:

{
  "status": "processed",
  "document_id": "exec-1043",
  "file_name": "invoice-4471.pdf",
  "file_link": "https://drive.google.com/file/d/example/view",
  "received_at": "2026-03-11T09:24:00Z",
  "fields": {
    "document_type": "invoice",
    "sender_or_company": "Nordic Supplies Ltd",
    "summary": "Invoice for office chairs delivered in February.",
    "requested_action": "Approve and pay invoice 4471",
    "deadline": "12 March 2026",
    "urgency": "High",
    "department": "Finance"
  },
  "notification_sent": true
}

---

# 3. Allowed Values

## document_type

Only:

- invoice
- request
- report
- complaint
- contract
- quote
- other

## urgency

Only:

- Low
- Medium
- High

## department

Only:

- Sales
- Finance
- Support
- HR
- Management
- General

Missing information may be returned as:

Not found

Requested action may be returned as:

No action found

The application must display these values exactly and must not invent replacements.

---

# 4. Error Response

Example:

{
  "status": "error",
  "error_code": "UNSUPPORTED_FILE_TYPE",
  "message": "Only PDF, DOCX and TXT files can be processed."
}

Supported error codes:

## UNSUPPORTED_FILE_TYPE

Meaning:

The MIME type is not PDF, DOCX, or TXT.

Application behaviour:

Show an inline message on the upload screen.

Do not automatically resend the file.

---

## EMPTY_DOCUMENT

Meaning:

Text extraction produced no readable text.

Application behaviour:

Explain that the document contains no readable text and suggest another file.

---

## EXTRACTION_FAILED

Meaning:

The AI extraction step failed or returned unusable output.

Application behaviour:

Offer Retry.

Keep the selected file.

---

## UNAUTHORIZED

Meaning:

The authentication header is missing or incorrect.

Application behaviour:

Show a configuration error.

Do not tell the normal end user to fix credentials.

---

# 5. GET /documents

## Request

Method:

GET

Header:

x-api-key: <shared secret>

---

## Successful Response

HTTP status:

200

Response is a JSON array.

Example:

[
  {
    "document_id": "exec-1043",
    "received_at": "2026-03-11T09:24:00Z",
    "file_name": "invoice-4471.pdf",
    "file_link": "https://drive.google.com/file/d/example/view",
    "document_type": "invoice",
    "sender_or_company": "Nordic Supplies Ltd",
    "summary": "Invoice for office chairs delivered in February.",
    "requested_action": "Approve and pay invoice 4471",
    "deadline": "12 March 2026",
    "urgency": "High",
    "department": "Finance",
    "status": "Processed"
  }
]

The Google Sheet is the source of truth for this endpoint.

---

# 6. POST /review

## Request

Content-Type:

application/json

Header:

x-api-key: <shared secret>

Example:

{
  "document_id": "exec-1043",
  "status": "Reviewed",
  "reviewed_by": "employee@medcore.example",
  "review_note": "Payment approved"
}

## Request Fields

### document_id
Type: string

Must match an existing Document ID in Google Sheets.

### status
Type: string

Allowed values:

- Reviewed
- Needs Review

### reviewed_by
Type: string

Name or email of the person performing the review.

### review_note
Type: string

Optional.

Maximum length:

200 characters.

---

# 7. POST /review — Successful Response

HTTP status:

200

Example:

{
  "status": "updated",
  "document_id": "exec-1043"
}

If no matching document exists, n8n should return HTTP 404.

---

# 8. Timeouts

Document processing can take significantly longer than ordinary web requests.

Application timeout:

90000 milliseconds

The interface must remain visibly in a Processing state while waiting.

There must never be an endless spinner.

---

# 9. Security

The shared n8n secret must never be included in browser-side JavaScript.

Architecture:

Browser
→ Express server
→ n8n Cloud

The Express server adds the x-api-key header.

The browser must never know the value.

---

# 10. Contract Discipline

Do not silently rename fields.

Do not move fields between levels without updating this file.

Do not invent new document categories.

Do not translate API values.

The interface may visually style or present values, but the underlying contract values must remain unchanged.