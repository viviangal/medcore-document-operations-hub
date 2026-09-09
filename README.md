# MedCore Document Operations Hub

Internal operations interface for the MedCore Smart Office Document Assistant.

The application is the **user interface only**. All business logic — reading document
content, AI extraction, urgency decisions, Google Sheets, Google Drive and Gmail —
stays in the n8n workflows. See `SPEC.md` and `CONTRACT.md`.

---

## Current status: milestone 2 — GET /documents is live

- **`GET /documents` is connected.** The Express server calls the real n8n
  endpoint with the `x-api-key` header and normalizes the raw Google Sheet
  columns into the CONTRACT.md field names. If `N8N_BASE_URL` or `N8N_SECRET`
  is unset, it returns a graceful `NOT_CONFIGURED` error instead of failing.
- **`POST /process-document` and `POST /review` are still mocked.** They are
  hardcoded in `src/api/client.js` to call the mock functions regardless of any
  env flag, so they cannot be activated by accident. Upload and human review
  keep working against demo data.
- No real secret exists anywhere in the project.

---

## Running the application

```
npm install
npm run dev
```

Then open **http://localhost:5173**.

One command starts both processes:

| Process | Port | Role |
|---------|------|------|
| Vite dev server | 5173 | serves the React interface, proxies `/api` to the server |
| Express server  | 5174 | the only layer allowed to hold the n8n secret |

Stop both with `Ctrl+C`.

---

## Project structure

```
index.html
vite.config.js               dev server + /api proxy to Express
server/
  server.js                  Express server; GET /documents calls n8n, POST routes are stubs
  normalizeDocument.js        maps raw Google Sheet headers to CONTRACT.md field names
src/
  main.jsx                   React entry point
  App.jsx                    application shell and routes
  styles.css                 design system
  api/
    client.js                THE single API access layer
    mock.js                  example data and mock responses from CONTRACT.md
  screens/
    Upload.jsx               F1 upload, F2 processing, F3 result
    Dashboard.jsx            F4 document log, F5 search and filters
    DocumentDetail.jsx       F6 detail and human review
  components/                badges, field grid, banners, empty states
  lib/
    constants.js             the allowed values from SPEC.md section 5
    errors.js                error catalog, one readable message per failure
    fileValidation.js        type and size checks, base64 encoding
    format.js                date and file size formatting
    session.js               placeholder identity until login exists
  state/
    DocumentsContext.jsx     shared document cache across the screens
.env.example                 placeholders only — the real .env is git-ignored
```

---

## Screens

**Document log** (`/`) — every processed document, newest first, with free-text
search over file name, sender and summary, plus combinable filters for urgency,
type, department and status. Includes a manual Refresh, an empty-log state and a
No Results state.

**Upload document** (`/upload`) — drag and drop or browse for one PDF, DOCX or TXT
file. The file type and size are checked in the browser before anything is sent.
While processing, the Send button is disabled and a visible elapsed counter runs,
so a wait of up to 90 seconds never looks frozen. The result shows all eight
extracted fields.

**Document detail** (`/documents/:id`) — the full record, plus the human review
action with an optional note limited to 200 characters. The displayed status
updates once the review is accepted.

---

## Reviewing the upload/review states without a live workflow

`src/api/mock.js` picks a scenario from the uploaded **file name**, so every error
state in SPEC.md F7 for Upload can be seen:

| File name contains | Result |
|--------------------|--------|
| `empty`            | `EMPTY_DOCUMENT` |
| `fail` or `corrupt`| `EXTRACTION_FAILED`, with Retry and the file kept |
| `unauthorized`     | `UNAUTHORIZED`, shown as a configuration problem |
| `timeout`          | `TIMEOUT` |
| anything else      | a successful example response |

Selecting a file of another type, or one over the size limit, is rejected in the
browser before any request is prepared.

The mock write-side document log lives in memory for the browser session: uploads
and reviews made through the still-mocked endpoints are visible while the tab
stays open, and reloading the page restores the seed data. Because it is a
separate store from the live `GET /documents` data, opening the detail page for a
just-uploaded document, or reviewing a live-sourced one, currently shows
"Document not found" — expected until `POST /process-document` and `POST /review`
are connected in their own milestones. The application has no database of its own.

## Reviewing the document log without a live n8n endpoint

Point `N8N_BASE_URL` at any HTTP server that requires the `x-api-key` header and
returns a JSON array shaped like the Google Sheet export (`Received At`,
`Sender / Company`, …) to see `GET /documents` end to end, including the
normalization step and its error paths (`UNAUTHORIZED` on a bad key, `TIMEOUT` on
a slow response, `SERVICE_UNAVAILABLE` when unreachable).

---

## Configuration

Copy `.env.example` to `.env` and fill in real values there. `.env` is git-ignored.
With no `.env` present, `GET /documents` returns a graceful `NOT_CONFIGURED` error
rather than failing.

Server-side variables (`N8N_*`, `PORT`) never reach the browser. Variables
prefixed `VITE_` **are** bundled into the browser code, so no secret may ever be
given a `VITE_` name.

---

## Next milestones

The real endpoints are connected one at a time, in this order:

1. ~~`GET /documents`~~ — connected
2. `POST /process-document`
3. `POST /review`

Each step means writing the n8n call in `server/server.js` (which adds the
`x-api-key` header) and switching the matching branch in `src/api/client.js`. The
screens do not change: they only ever talk to `client.js`.
