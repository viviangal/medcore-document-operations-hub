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
