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

**Follow-up finding**, from testing against the real workflow: `document_id`
comes back as a non-unique number (or empty string) for several rows in the live
Google Sheet. Left as an n8n-side fix per the user's call — see the next entry
for its effect on the Dashboard.

---

## 3 — Correction: Dashboard combined filters

**Prompt**

Fix the dashboard filtering behavior. Individual filters work, combined filters
do not — a row should stay visible only if it matches every selected filter
(e.g. Urgency=Medium AND Department=Finance). Keep search working alongside
filters, preserve the clear/no-results behavior, don't touch the API/n8n
integration or the layout. Also show Type filter options with normal
capitalization (Request, Report, …) without changing the stored/API values.

**Investigation**

Read `Dashboard.jsx` first: the filter predicate already combined every
condition with `&&` — genuine AND logic, not the bug. Reproducing the exact
combos against the real n8n data (Urgency=Medium + Department=Finance) showed
the footer correctly reporting "Showing 1 of 10" while 4 mismatched rows were
still rendered, including one with the wrong urgency. The browser console
explained it: `Warning: Encountered two children with the same key` for keys
`11` and `19` — the real Google Sheet's non-unique `document_id` values found
during milestone 2 (see previous entry). `key={doc.document_id}` on the table
rows let React reuse and misplace stale row DOM across renders once the
filtered set changed. The filtering logic was correct all along; the *rendered*
table was corrupted by the key collision, which is what read as "combined
filters don't work."

**Result**

- `Dashboard.jsx`: row key is now a composite of `document_id`, `received_at`,
  and the row's index in the filtered list — unique even when `document_id`
  repeats or is empty, with no change to the filter predicate itself (it was
  already correct AND logic).
- `Dashboard.jsx` / `lib/format.js`: added a display-only `capitalize()` helper
  and a `formatLabel` prop on `FilterSelect`, used only for the Type filter, so
  its `<option>` text reads "Request", "Report", etc. The `<option value>` — what
  filtering actually compares against — is untouched, still the raw lowercase
  contract value.

**Verification**

Re-tested against the same live n8n data used to find the bug:
- Urgency=Medium + Department=Finance → exactly 1 row (`04_Supplier_Quotation_Valid_7_Days.pdf`)
- Type=Request + Department=Support → exactly 1 row (`06_URGENT_Field_Service_Request.pdf`)
- Status=Needs Review → exactly 1 row (`09_Unclear_Document_Needs_Review.docx`)
- Free-text search combined with an active filter narrowed correctly; an
  unmatched search term produced the No Results state; Clear reset everything
- Browser console: zero "same key" warnings after the fix, across all of the above
- `npm run build` passes

No change to `src/api/client.js`, `server/server.js`, or the CONTRACT.md field
shapes — this was a rendering-layer fix only.

---

## 4 — Milestone 3: connect POST /process-document (backend only)

**Prompt**

Replace only the mock implementation of `POST /api/process-document` in the
Express backend with a real call to the n8n production webhook
(`${N8N_BASE_URL}${N8N_PROCESS_PATH}`). Forward the existing request body
(`file_name`, `mime_type`, `file_base64`, `submitted_by`) with headers
`Content-Type: application/json` and `x-api-key: <N8N_SECRET>`. Use the existing
timeout. Return n8n's JSON and preserve its HTTP status where appropriate.
Handle timeout / network / non-JSON errors without exposing secrets. Update
mock-status/logging text so process-document reads as live. Do not touch
`GET /api/documents`, `POST /api/review`, the frontend, `.env`, or any secret.
Add `N8N_PROCESS_PATH=/process-document` to `.env.example` only if missing.

**Result**

- `server/server.js`: the `POST /api/process-document` stub is replaced with a
  transparent proxy built on the existing `callN8n()` helper (same helper,
  headers, and `n8nConfig.timeoutMs` as `GET /api/documents`). It forwards
  `req.body` verbatim with `Content-Type: application/json`; `callN8n()` adds
  `x-api-key` and `Accept`. On success it returns n8n's JSON body unchanged with
  n8n's status. On failure it follows the `GET /api/documents` mapping —
  `AbortError` → 504 `TIMEOUT`, network throw → 502 `SERVICE_UNAVAILABLE`,
  unparseable body → 502 `SERVER_ERROR`, n8n 5xx → 502 `SERVER_ERROR`,
  401/403 → 401 `UNAUTHORIZED`, other 4xx → `BAD_REQUEST` — except that when n8n
  returns a structured body with `error_code` (CONTRACT.md section 4), that body
  and status pass straight through so the frontend keeps the specific code
  (`UNSUPPORTED_FILE_TYPE`, `EMPTY_DOCUMENT`, ...). When `N8N_BASE_URL` /
  `N8N_SECRET` are unset it still returns 503 `NOT_CONFIGURED`.
- `server/server.js`: `/api/health` now reports
  `process_document: "live" | "not-configured"` (was always `"mock"`); the
  startup log line and the header comment updated to milestone 3.
- `.env.example`: already contained `N8N_PROCESS_PATH=/process-document` — no
  change.
- No change to `.env`, `src/api/client.js`, the frontend, `GET /api/documents`,
  or `POST /api/review`.

**Checks run** (all safe, local, no production calls)

- `node --check` on `server/server.js` and `server/normalizeDocument.js`
- `npm run build` — passes
- A throwaway local fake n8n webhook + a second server instance started with
  inline env vars (so `.env` and production were never touched) verified:
  success passthrough (n8n JSON + 200 returned; fake webhook confirmed it
  received `POST`, `content-type: application/json`, `x-api-key` matching, and
  the exact 4-field body); structured 422 `UNSUPPORTED_FILE_TYPE` passed through
  with status; non-JSON → 502 `SERVER_ERROR`; n8n 5xx → 502 `SERVER_ERROR`;
  slow upstream vs a 2s timeout → 504 `TIMEOUT`; dead upstream → 502
  `SERVICE_UNAVAILABLE`; missing config → 503 `NOT_CONFIGURED`. No secret
  appeared in any response body or log line.

**Remaining**

The frontend still calls the mock: `src/api/client.js` `processDocument()`
returns `mockProcessDocument(body)` and never hits `/api/process-document`, and
`isWriteMocked()` still returns `true`. Wiring the Upload screen to the live
route is a deliberate separate step ("do not change the frontend yet"). A
running dev server must be restarted to load the new route. End-to-end
verification against the real n8n webhook is intentionally not done here — a real
POST triggers the full production workflow (Sheets write, Gmail, Drive).

---

## 5 — Milestone 4: point the Upload screen at the live process-document route

**Prompt**

Replace only the frontend mock `processDocument()` call in `src/api/client.js`
with a real `POST /api/process-document` to the Express backend, sending JSON
with `file_name`, `mime_type`, `file_base64`, `submitted_by`. Keep the function
signature and Upload screen behavior. Reuse the `getDocuments()` API/error
conventions. No secret in frontend code. Don't touch `GET /api/documents` or
any review code (`POST /api/review` stays mocked). Bypass `mockProcessDocument()`
for this path only; don't delete unrelated mock infrastructure. Keep the
browser-side file type/size validation. Don't redesign Upload. Update any status
text still calling process-document mocked.

**Result**

- `src/api/client.js`: `processDocument(body)` now returns
  `request('/process-document', { method: 'POST', body: JSON.stringify(body) })`
  — same helper as `getDocuments()`, so it inherits the `Accept` /
  `Content-Type: application/json` headers, the `REQUEST_TIMEOUT_MS` (90 s)
  `AbortController`, and the error handling that turns a structured n8n body
  (`error_code`) into an `AppError` (`UNSUPPORTED_FILE_TYPE`, `EMPTY_DOCUMENT`,
  `EXTRACTION_FAILED`, `UNAUTHORIZED`, …) and otherwise maps by HTTP status. On
  success it returns the n8n JSON unchanged (CONTRACT.md section 2), which is
  exactly the shape `Upload.jsx` already consumes (`file_name`, `document_id`,
  `fields`, `file_link`, `notification_sent`). The `mockProcessDocument` import
  is dropped; `mockReview` stays.
- `src/api/client.js` / `src/App.jsx`: `isWriteMocked()` renamed to
  `isReviewMocked()` (still returns `true` — only review is mocked now). The
  top-of-app status strip no longer says uploads use demo data; it now reads
  "The document log and document processing are connected to the document
  service. Marking documents as reviewed still uses demo data for now."
- Not touched: `Upload.jsx` (signature, `validateFile` type/size checks,
  `readFileAsBase64`, `resolveMimeType`, double-submit guard, processing state
  all unchanged), `getDocuments()`, `submitReview()` / `mockReview()`,
  `server/server.js`, `.env`, `mock.js` (`mockProcessDocument` is now unused but
  left in place as mock infrastructure).

**Checks run** (safe, local, no production submission)

- `npm run build` — passes; bundle no longer pulls the mock process path
- `grep` over `src/`: no `N8N_SECRET` / `x-api-key` / `N8N_BASE_URL` reference,
  no `isWriteMocked` leftover, `mockProcessDocument` only referenced by its own
  definition in `mock.js`
- `grep` over `dist/`: no secret strings in the built bundle
- `Upload.jsx` still imports and calls `validateFile`, `readFileAsBase64`,
  `resolveMimeType`
- `GET /api/process-document` on the Express server returns the catch-all
  `404 NOT_FOUND` (POST-only route wired, no n8n call triggered)

**Remaining**

A full browser click-through of Upload was not run: it would POST a real
document to the production n8n webhook (Sheets row + Gmail + Drive). The
Express→n8n leg is already proven end-to-end from milestone 3; this change only
swaps which function the frontend calls. The dev server must be restarted (and
Vite started) to load the new frontend code. `POST /api/review` remains mocked.
