# MedCore Document Operations Hub — Claude Code Prompt Log

This file records the Claude Code prompts that materially affected the project.

Each entry will include:

- prompt
- result
- what worked
- what required correction

---

## 1 — Milestone 1: first working version on mock data

**Prompt**

Read SPEC.md and CONTRACT.md, then build the first working version: React + Vite,
a small Express server, the structure from SPEC.md, `src/api/client.js` as the single
API access layer, `src/api/mock.js` from the CONTRACT.md examples, and the three
screens (Upload, Dashboard, DocumentDetail). Mock data only, no n8n, no secrets,
no AI logic, no optional extensions. Runnable with `npm run dev`.

**Result**

The full interface for features F1–F8, running entirely on mock data. `npm run dev`
starts the Vite dev server (5173) and the Express server (5174) together. The Express
server holds the three route stubs where the n8n calls will go; it makes no outbound
calls yet.

**What worked**

- Routing every call through `client.js` kept the screens free of transport details:
  connecting the real endpoints later touches two files, not the screens.
- Keeping the allowed values in `lib/constants.js` and an error catalog in
  `lib/errors.js` made the contract rules and F7 messages easy to check in one place.
- Driving the mock scenarios from the uploaded file name made every error state
  reviewable in the browser without a live workflow.

**What required correction**

- npm 11 does not run install scripts by default, so esbuild had no binary and Vite
  could not start. Fixed with `npm approve-scripts esbuild`, which recorded the
  approval in `package.json`.

---

## 2 — Milestone 2: connect GET /documents

**Prompt**

Connect only the real `GET /documents` endpoint. Implement it in `server/server.js`
calling `${N8N_BASE_URL}${N8N_DOCUMENTS_PATH}` with the `x-api-key` header from
`N8N_SECRET`, respecting `REQUEST_TIMEOUT_MS`, handling connection errors, timeouts,
non-2xx responses and invalid JSON without stack traces. Normalize the raw Google
Sheet headers n8n returns (`Received At`, `Sender / Company`, …) into the
CONTRACT.md field names, dropping `row_number`. Update `src/api/client.js` so
`getDocuments()` uses the real endpoint while `processDocument()` and
`submitReview()` stay mocked and cannot be accidentally activated. Keep secrets
out of the repo.

**Result**

`server/normalizeDocument.js` maps the eleven Sheet headers to their contract
field names (values pass through unchanged, including `Not found` / `No action
found`). `GET /api/documents` calls n8n with the shared secret and an
`AbortController` timeout, mapping every failure mode to an existing error code:
abort → `TIMEOUT`, connection failure → `SERVICE_UNAVAILABLE`, 401/403 →
`UNAUTHORIZED`, 404 → `NOT_FOUND`, other 4xx → `BAD_REQUEST`, 5xx or invalid/
non-array JSON → `SERVER_ERROR`. Only `error.message` is logged server-side; the
client only ever receives `{status, error_code, message}`. `getDocuments()` in
`client.js` now always calls the real endpoint; `processDocument()` and
`submitReview()` call the mock functions unconditionally, independent of any env
flag, so they cannot be switched on early. `/api/health` now reports live/mock
status per endpoint instead of one blanket mode.

**What worked**

- Testing against a throwaway local HTTP server (outside the repo, in the OS temp
  directory) that mimicked the raw Sheet-header shape and required `x-api-key`
  made it possible to exercise the success path, `UNAUTHORIZED`, connection
  failure, and timeout without touching the real n8n production endpoint or its
  secret. The server and its test `.env` were deleted after verification.
- Hardcoding `processDocument`/`submitReview` to always call the mock functions
  (rather than gating them behind the same env flag as `getDocuments`) means
  there is no single toggle that could activate all three endpoints at once by
  accident.

**Known interim effect (not a defect)**

With only `GET /documents` connected, a document created through the still-mocked
Upload screen is written to `mock.js`'s own in-memory list, which the live
`GET /documents` response does not include — so "Open document detail" on a
freshly mock-processed file, or reviewing a live-sourced document, currently
shows "Document not found" for the review write until milestone 4 connects
`POST /review`. This resolves naturally as the remaining endpoints are connected
in their own milestones.
