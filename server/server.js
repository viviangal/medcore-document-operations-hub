// MedCore Document Operations Hub — application server.
//
// Architecture (CONTRACT.md section 9):
//   Browser -> Express server -> n8n Cloud
//
// This server is the only layer that is allowed to know the n8n shared secret,
// and the only layer that adds the x-api-key header.
//
// MILESTONE 2: GET /documents is connected to n8n. POST /process-document and
// POST /review remain unconnected NOT_CONFIGURED stubs until their own
// milestones (SPEC.md section 7).

import express from 'express'
import dotenv from 'dotenv'
import { normalizeDocuments } from './normalizeDocument.js'

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

const n8nSecret = process.env.N8N_SECRET ?? ''
const n8nConfigured = Boolean(n8nConfig.baseUrl) && Boolean(n8nSecret)

function notConfigured(res) {
  return res.status(503).json({
    status: 'error',
    error_code: 'NOT_CONFIGURED',
    message: 'The n8n integration is not connected yet. The interface is running on mock data.'
  })
}

function sendUpstreamError(res, { status, error_code, message }) {
  return res.status(status).json({ status: 'error', error_code, message })
}

// Calls n8n with the shared secret and a hard timeout. The browser never sees
// this function or the secret it uses.
async function callN8n(path, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), n8nConfig.timeoutMs)
  try {
    return await fetch(`${n8nConfig.baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'x-api-key': n8nSecret,
        ...options.headers
      }
    })
  } finally {
    clearTimeout(timer)
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    endpoints: {
      documents: n8nConfigured ? 'live' : 'not-configured',
      process_document: 'mock',
      review: 'mock'
    },
    // Booleans only. Never the values themselves.
    n8n_configured: n8nConfigured,
    timeout_ms: n8nConfig.timeoutMs
  })
})

// GET /documents — step 1 of the connection order in SPEC.md section 7.
app.get('/api/documents', async (_req, res) => {
  if (!n8nConfigured) {
    return notConfigured(res)
  }

  let response
  try {
    response = await callN8n(n8nConfig.documentsPath)
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`[server] GET /documents timed out after ${n8nConfig.timeoutMs}ms`)
      return sendUpstreamError(res, {
        status: 504,
        error_code: 'TIMEOUT',
        message: 'The document service did not respond in time.'
      })
    }
    console.error('[server] GET /documents connection error:', error.message)
    return sendUpstreamError(res, {
      status: 502,
      error_code: 'SERVICE_UNAVAILABLE',
      message: 'The document service could not be reached.'
    })
  }

  let payload
  try {
    payload = await response.json()
  } catch (error) {
    console.error('[server] GET /documents returned invalid JSON:', error.message)
    return sendUpstreamError(res, {
      status: 502,
      error_code: 'SERVER_ERROR',
      message: 'The document service returned an unexpected response.'
    })
  }

  if (!response.ok) {
    console.error(`[server] GET /documents upstream status ${response.status}`)
    if (response.status === 401 || response.status === 403) {
      return sendUpstreamError(res, {
        status: 401,
        error_code: 'UNAUTHORIZED',
        message: 'The document service rejected the request.'
      })
    }
    if (response.status === 404) {
      return sendUpstreamError(res, {
        status: 404,
        error_code: 'NOT_FOUND',
        message: 'The document service reported nothing found.'
      })
    }
    if (response.status >= 500) {
      return sendUpstreamError(res, {
        status: 502,
        error_code: 'SERVER_ERROR',
        message: 'The document service reported an internal problem.'
      })
    }
    return sendUpstreamError(res, {
      status: response.status,
      error_code: 'BAD_REQUEST',
      message: 'The document service rejected the request.'
    })
  }

  if (!Array.isArray(payload)) {
    console.error('[server] GET /documents payload was not an array')
    return sendUpstreamError(res, {
      status: 502,
      error_code: 'SERVER_ERROR',
      message: 'The document service returned an unexpected response.'
    })
  }

  return res.json(normalizeDocuments(payload))
})

// POST /process-document — step 2. Not connected yet.
app.post('/api/process-document', (_req, res) => {
  // TODO (milestone 3): forward the contract body to n8n with the x-api-key
  // header and a 90 second timeout.
  return notConfigured(res)
})

// POST /review — step 3. Not connected yet.
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
  console.log(
    `[server] documents: ${n8nConfigured ? 'live' : 'not-configured'} · process-document: mock · review: mock`
  )
})
