// MedCore Document Operations Hub — application server.
//
// Architecture (CONTRACT.md section 9):
//   Browser -> Express server -> n8n Cloud
//
// This server is the only layer that is allowed to know the n8n shared secret,
// and the only layer that adds the x-api-key header.
//
// MILESTONE 1: the interface runs on mock data inside the browser, so these
// routes make no outbound calls at all. They answer with a structured
// NOT_CONFIGURED error until the endpoints are connected one at a time.

import express from 'express'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT ?? 5174)

// process-document carries a base64 payload, so the JSON body can be large.
app.use(express.json({ limit: '25mb' }))

const n8nConfig = {
  baseUrl: process.env.N8N_BASE_URL ?? '',
  processPath: process.env.N8N_PROCESS_PATH ?? '/process-document',
  documentsPath: process.env.N8N_DOCUMENTS_PATH ?? '/documents',
  reviewPath: process.env.N8N_REVIEW_PATH ?? '/review',
  timeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 90000)
}

// Milestone 1 keeps every call mocked in the browser. Flipping USE_MOCK to
// false alone does not enable the routes below; the n8n calls are still to be
// written, one endpoint at a time.
const USE_MOCK = String(process.env.USE_MOCK ?? 'true') !== 'false'

function notConfigured(res) {
  return res.status(503).json({
    status: 'error',
    error_code: 'NOT_CONFIGURED',
    message: 'The n8n integration is not connected yet. The interface is running on mock data.'
  })
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: USE_MOCK ? 'mock' : 'live',
    // Booleans only. Never the values themselves.
    n8n_configured: Boolean(n8nConfig.baseUrl) && Boolean(process.env.N8N_SECRET),
    timeout_ms: n8nConfig.timeoutMs
  })
})

// GET /documents — step 1 of the connection order in SPEC.md section 7.
app.get('/api/documents', (_req, res) => {
  // TODO (milestone 2): GET `${n8nConfig.baseUrl}${n8nConfig.documentsPath}`
  // with the x-api-key header taken from process.env.N8N_SECRET.
  return notConfigured(res)
})

// POST /process-document — step 2.
app.post('/api/process-document', (_req, res) => {
  // TODO (milestone 3): forward the contract body to n8n with the x-api-key
  // header and a 90 second timeout.
  return notConfigured(res)
})

// POST /review — step 3.
app.post('/api/review', (_req, res) => {
  // TODO (milestone 4): forward the review to n8n with the x-api-key header.
  return notConfigured(res)
})

app.use('/api', (_req, res) => {
  res.status(404).json({
    status: 'error',
    error_code: 'NOT_FOUND',
    message: 'Unknown endpoint.'
  })
})

// Errors are logged on the server and never returned to the browser as a stack
// trace (SPEC.md F7).
app.use((error, _req, res, _next) => {
  console.error('[server] unhandled error:', error.message)
  res.status(500).json({
    status: 'error',
    error_code: 'SERVER_ERROR',
    message: 'The document service reported an internal problem.'
  })
})

app.listen(PORT, () => {
  console.log(`[server] MedCore API server listening on http://localhost:${PORT}`)
  console.log(`[server] mode: ${USE_MOCK ? 'mock (no n8n calls)' : 'live'}`)
})
