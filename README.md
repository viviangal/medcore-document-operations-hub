# MedCore Document Operations Hub

## 1. Project purpose

**MedCore Document Operations Hub** is the internal web application for MedCore Medical Technologies Ltd.'s Smart Office Document Assistant.

This repository is **the application layer only** — a React/Vite frontend and a small Express server that:

- collect input from a human user (an uploaded document, a search/filter, a review action),
- call the existing **n8n** automation, and
- display the data n8n returns.

All business logic — reading document content, AI extraction, deciding urgency, writing to Google Sheets, storing files in Google Drive, and sending Gmail notifications — is implemented in the n8n workflows, not here. This application must never reimplement that logic; it only submits requests and renders results. See [SPEC.md](SPEC.md) and [CONTRACT.md](CONTRACT.md) for the full rules this project was built against.

---

## 2. Architecture

The application runs in one of two modes, chosen entirely at build time.

**Local mode** (development, and any normal production deployment with a backend):

```
Browser
  |
  v
React / Vite frontend (localhost:5173)
  |  same-origin /api/* calls
  v
Express proxy (localhost:5174)      <- the only place the n8n credential exists
  |  x-api-key header added here
  v
n8n Cloud
  |
  v
Google Drive - Google Sheets - Gmail - CloudConvert - AI extraction workflow
```

**GitHub Pages classroom demo mode** (static hosting only, no backend available):

```
GitHub Pages (static React build)
  |  browser calls n8n directly
  |  x-api-key = classroom API key entered at runtime
  v
n8n Cloud
```

**Why the two modes differ:** GitHub Pages only serves static files — it cannot run the Express server, so there is nowhere on that deployment to keep a credential server-side. In local mode, the n8n credential currently configured for this project is stored server-side in `.env` (`N8N_SECRET`) and attached to every outbound request by Express; the browser never sees it. GitHub Pages has no backend to hold a credential that way, so an authorized tester instead enters a credential at runtime into the running page, and the browser then calls n8n directly with it. The important distinction is **where and how the credential is stored and exposed**, not that the local and GitHub Pages deployments necessarily use two different underlying credential values — the two modes share the same UI code and the same n8n contract; only the transport and the credential's storage location differ (`src/api/client.js`).

---

## 3. Main application features

- **Upload** a single PDF, DOCX or TXT document by browsing or drag-and-drop, with file type and size validated in the browser before anything is sent (`src/screens/Upload.jsx`, `src/lib/fileValidation.js`).
- **Processing state** — the Send button is disabled while a submission is in flight (preventing duplicate spreadsheet rows from a double click), with a visible elapsed-time counter for waits of up to 90 seconds.
- **Processing result view** — the extracted fields (document type, sender/company, summary, requested action, deadline, urgency, department, file link) are shown immediately after a successful upload.
- **Document log / dashboard** (`/`) listing every processed document, **newest first**.
- **Free-text search** over file name, sender/company and summary.
- **Combined filters** for urgency, document type, department and status, all applied together.
- **Document detail view** (`/documents/:id`) showing the full record.
- **Human review** — a "Mark as reviewed" action with an optional review note (200-character limit), which updates the displayed status once accepted.
- **Analytics page** (`/analytics`) — read-only KPIs and breakdowns by urgency, department, document type and status.
- **Filtered CSV export** — exports exactly the rows currently visible on the dashboard (after search, filters and deadline sort), not the entire log.
- **Deadline display and sorting** — the dashboard's Deadline column can be sorted earliest/latest first.
- **Readable empty states** (empty document log, no search/filter results, no analytics data yet).
- **Readable error states** for every failure the API layer can return (unsupported file type, empty/unreadable document, extraction failure, timeout, service unavailable, not found, and more — see `src/lib/errors.js`).
- **Configuration/authentication error handling** — a missing or invalid n8n connection is shown as a plain-language "configuration problem," never a stack trace or the credential itself.
- **Disabled authenticated actions in GitHub Pages mode without a runtime key** — Refresh, Send for processing, and Mark as reviewed are visibly disabled (with an explanatory tooltip) until a classroom API key is entered, and the API layer itself refuses to contact n8n without one.

---

## 4. n8n application endpoints

The application talks to n8n through exactly three endpoints (full contract in [CONTRACT.md](CONTRACT.md)):

| Endpoint | Purpose |
| --- | --- |
| `GET /webhook/documents` | Returns every processed-document record from the Google Sheet (the dashboard's data source). |
| `POST /webhook/process-document` | Sends one uploaded document to n8n and returns the AI-extracted business fields plus the Drive file link. |
| `POST /webhook/review` | Records a human review — n8n matches the correct Google Sheet row by Document ID, sets Status to Reviewed, and stores the reviewer and review note on that row. |

An earlier development-stage issue involving blank or duplicate Document IDs (recorded in `PROMPTS.md`) was re-verified before final submission and is not present in the current live document data.

In local mode, Express calls these through `N8N_BASE_URL` plus the configured path for each route, adding the `x-api-key` header itself. In GitHub Pages mode, the browser calls the same paths directly on `VITE_N8N_BASE_URL`, attaching the runtime classroom key as `x-api-key`.

---

## 5. Local setup

You'll need Node.js and access to the project's n8n Cloud instance (base URL and shared credential) already provided to you by the project owner.

```bash
# 1. Clone the repository
git clone https://github.com/viviangal/medcore-document-operations-hub.git

# 2. Enter the project
cd medcore-document-operations-hub

# 3. Install dependencies
npm install
```

**4. Create your local environment file.**

Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

**5. Configure `.env`.** Open the new `.env` file and fill in:

| Variable | Required | Description |
| --- | --- | --- |
| `N8N_BASE_URL` | yes | Base URL of the n8n Cloud webhook, e.g. `https://your-n8n-host/webhook`. |
| `N8N_SECRET` | yes | The credential n8n expects in the `x-api-key` header. Server-side only — never reaches the browser. |
| `N8N_PROCESS_PATH`, `N8N_DOCUMENTS_PATH`, `N8N_REVIEW_PATH` | no | Override the default webhook sub-paths (`/process-document`, `/documents`, `/review`) if your n8n instance uses different ones. |
| `REQUEST_TIMEOUT_MS` | no | Upstream request timeout in milliseconds (default `90000`). |
| `MAX_FILE_MB` / `VITE_MAX_FILE_MB` | no | Maximum upload size in MB (default `10`). |
| `PORT` | no | Port the Express server listens on (default `5174`). |
| `VITE_API_MODE` | no | Leave unset or `proxy` for local development. Only `direct` (used by the GitHub Pages build) changes this. |
| `VITE_N8N_BASE_URL` | no | Leave empty for local development — only used in direct mode. |

If `N8N_BASE_URL` or `N8N_SECRET` is left unset, the app still runs and shows a clear "not connected" message instead of failing.

**6. Run the application — one command:**

```bash
npm run dev
```

This single command starts **both** processes at once:

| Process | Port | Role |
| --- | --- | --- |
| Express server (`server/server.js`) | `5174` | The only layer that holds `N8N_SECRET` and calls n8n. |
| Vite dev server | `5173` | Serves the React app and proxies `/api/*` to the Express server. |

**7. Open the app:**

```
http://localhost:5173
```

Stop both processes with `Ctrl+C`.

---

## 6. GitHub Pages deployment (classroom demo)

The classroom demo is live at:

**https://viviangal.github.io/medcore-document-operations-hub/**

GitHub Pages is static hosting — it can serve the built React app, but it cannot run the Express server, so there is no backend where a credential can remain server-side. The GitHub Pages build therefore switches the app into **direct mode**: the browser calls n8n Cloud directly, and an authorized tester enters the classroom/demo credential at runtime instead of it being held by a server.

- A visitor enters the **classroom/demo API key** into the key bar shown at the top of the page.
- That key is stored in `sessionStorage` for the current browser tab/session, with an in-memory fallback if `sessionStorage` is unavailable (`src/lib/directApiKey.js`). It is not written to `localStorage` and is not intended to persist beyond that session.
- Based on the current source and build, the key is not written to source code, `.env.pages`, or the generated `docs/` output — this has been checked for the current build each time it was produced. A dedicated audit of the full Git history for any historical trace of a key value has not been performed yet and is planned as a separate step before final submission.
- Until a key is entered, the authenticated actions (Refresh, Send for processing, Mark as reviewed) are visibly disabled with an explanatory tooltip, and the API client itself (`src/api/client.js`) refuses to make any request to n8n at all — it fails locally with a configuration-style error rather than sending an unauthenticated call.
- n8n CORS is configured to allow browser-origin requests from `https://viviangal.github.io`. If another web origin attempts to call the webhook, the browser's CORS enforcement prevents that page from successfully using the cross-origin request unless n8n allows that origin. CORS is not authentication; the `x-api-key` header remains the authentication mechanism.
- The credential entered here is a rotatable classroom/demo credential intended for this kind of public, runtime-entered use — that is a property of how it's used and managed, not a claim that it is structurally different from whatever credential local mode currently has configured.

The Pages build is produced with:

```bash
npm run build:pages
```

which builds in `direct` mode (using `.env.pages`, which contains only the public `VITE_API_MODE` and `VITE_N8N_BASE_URL` values — no secret) and writes the static site into **`docs/`**, which GitHub Pages serves directly from the `main` branch.

> **Important — build ordering:** `npm run build` (proxy mode) and `npm run build:pages` (direct mode) both write to the same `docs/` folder (`vite.config.js` sets a shared `outDir`). Whichever one you run last is what ends up in `docs/`, and therefore what gets committed and deployed. **`npm run build:pages` must always be the final build run before staging/committing/pushing a GitHub Pages deployment.** Running a plain `npm run build` afterward would silently overwrite `docs/` with proxy-mode output and break the live classroom demo, with no build error to warn you.

---

## 7. Security

- The real `.env` file is listed in `.gitignore` and is never committed.
- `.env.example` contains placeholder values only (e.g. `replace-me`, `your-n8n-host`) — no real credential.
- `.env.pages` contains only non-secret, public build configuration (`VITE_API_MODE`, `VITE_N8N_BASE_URL`) used for the GitHub Pages build.
- No API key has been found bundled into the GitHub Pages JavaScript output — this was checked by scanning the built `docs/` bundle for the credential value and for the `N8N_SECRET` / `VITE_N8N_SECRET` identifiers as part of each build in this workflow so far.
- In local mode, the currently configured n8n credential exists only in the Express server's environment and is added to outbound requests there — it never reaches browser code.
- The GitHub Pages deployment relies on an authorized tester entering the credential at runtime, since there is no server there to hold it. The security boundary is where the credential can be extracted from, not necessarily a different value from local mode.
- **The credential used for this deployment is a rotatable classroom/demo credential, and should be rotated or revoked after grading/demo use is complete.**
- The runtime classroom key is stored only in `sessionStorage` (with an in-memory fallback), scoped to the current tab/session, and is never written to `localStorage`.
- This application contains no AI extraction prompts, no urgency-decision rules, and no direct Google API calls — that logic exists only in the n8n workflows.
- A full audit of Git history for any historical trace of a credential value has not yet been performed and is planned as a step before final submission.

---

## 8. Known limitations

- GitHub Pages is static hosting and cannot securely keep a backend-only credential server-side; the classroom deployment necessarily exposes the temporary demo credential to the active browser session once a user enters it.
- This direct-to-n8n architecture is intended only for the classroom/demo deployment, not as a general production pattern.
- A production deployment should use a real backend or serverless proxy with proper authentication, the way local mode already does through Express.
- Current identity handling (`src/lib/session.js`) is demo/single-user oriented — there is no login or role system.
- The Google Sheet remains the single source of truth for the document log and review state; this application has no database of its own.
- The runtime classroom credential for the GitHub Pages demo must be supplied separately, out of band, to an authorized tester or grader — it is not published anywhere in this repository.

---

## 9. Testing and evidence

All required lecturer test cases and their results are recorded in [TESTING.md](TESTING.md), together with references to the supporting screenshot evidence. The screenshot files themselves are submitted separately from this Git repository.

---

## 10. Repository documentation

| File / folder | Purpose |
| --- | --- |
| [SPEC.md](SPEC.md) | The application's functional specification — required features, allowed values, and rules that must never be broken. |
| [CONTRACT.md](CONTRACT.md) | The exact request/response contract between this application and the n8n workflows. |
| [PROMPTS.md](PROMPTS.md) | Log of the Claude Code prompts that materially shaped this project, with results and corrections — including the development-history Document ID finding referenced in section 4. |
| [TESTING.md](TESTING.md) | The formal manual test record required for submission. |
| `README.md` | This file. |

This repository contains the application source code and the project documentation listed above. The sanitized n8n workflow JSON exports and the screenshot/test evidence referenced in `TESTING.md` are submitted separately from this Git repository and are not stored in it.

---

## 11. Build commands

| Command | What it does |
| --- | --- |
| `npm run dev` | **Primary local development command.** Starts the Express server and the Vite dev server together. |
| `npm run build` | Production build in proxy mode (the default) — output goes to `docs/`. |
| `npm run build:pages` | Production build in **direct** mode for GitHub Pages, using `.env.pages` — output goes to `docs/`. See the build-ordering note in section 6. |
| `npm run dev:server` | Starts only the Express server (`server/server.js`) on port `5174`. For troubleshooting the backend in isolation. |
| `npm run dev:web` | Starts only the Vite dev server on port `5173`. For troubleshooting the frontend in isolation. |
| `npm run preview` | Serves the last production build locally, for a final check before deploying. |

---

## 12. Project structure

```
src/
  api/             client.js (single API layer), mock.js
  components/      shared UI: badges, field grid, empty/error states, key bar
  lib/             constants, error catalog, formatting, normalizeDocument.js, direct-mode key storage, session
  screens/         Upload, Dashboard, DocumentDetail, Analytics
  state/           DocumentsContext (shared document cache)
server/
  server.js               Express proxy - the only layer that holds N8N_SECRET
  normalizeDocument.js     maps raw Google Sheet headers to CONTRACT.md field names
docs/               generated static site (GitHub Pages output - do not edit by hand)
README.md
SPEC.md
CONTRACT.md
PROMPTS.md
TESTING.md
.env.example
.env.pages
```
