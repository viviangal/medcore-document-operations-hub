// MedCore Document Operations Hub — application server.
//
// Architecture (CONTRACT.md section 9):
//   Browser -> Express server -> n8n Cloud
//
// This server is the only layer that is allowed to know the n8n shared secret,
// and the only layer that adds the x-api-key header.
//
// MILESTONE 5: GET /documents, POST /process-document and POST /review are all
// connected to n8n. Each route calls n8n through callN8n(), which is the only
// place the x-api-key header is added.

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

// A 401/403 from n8n always means the shared secret n8n received was missing
// or wrong. Checked by every route from the raw response status, before the
// body is parsed, so this is detected even when n8n's rejection body isn't
// valid JSON (the prior bug: a non-JSON 401/403 body fell through to the
// generic SERVER_ERROR branch instead). The message never echoes n8n's own
// text, headers, or the secret itself.
function respondUnauthorized(res) {
  return sendUpstreamError(res, {
    status: 401,
    error_code: 'UNAUTHORIZED',
    message: 'The document service could not authenticate.'
  })
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
      process_document: n8nConfigured ? 'live' : 'not-configured',
      review: n8nConfigured ? 'live' : 'not-configured'
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

  if (response.status === 401 || response.status === 403) {
    console.error(`[server] GET /documents upstream status ${response.status}`)
    return respondUnauthorized(res)
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
    // GET /documents has no per-ID lookup, so a 404 here means the n8n
    // endpoint itself is missing or unpublished, not that one document is
    // gone (that case only applies to POST /review, which keeps NOT_FOUND).
    if (response.status === 404) {
      return sendUpstreamError(res, {
        status: 502,
        error_code: 'SERVICE_UNAVAILABLE',
        message: 'The document service is currently unavailable.'
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

// POST /process-document — step 2 of the connection order in SPEC.md section 7.
// Transparent proxy: the request body from the frontend is forwarded to n8n
// unchanged, and n8n's response (body + status) is handed back unchanged. n8n
// owns all validation and the extracted-field shape (CONTRACT.md section 2).
app.post('/api/process-document', async (req, res) => {
  if (!n8nConfigured) {
    return notConfigured(res)
  }

  let response
  try {
    response = await callN8n(n8nConfig.processPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {})
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`[server] POST /process-document timed out after ${n8nConfig.timeoutMs}ms`)
      return sendUpstreamError(res, {
        status: 504,
        error_code: 'TIMEOUT',
        message: 'The document service did not respond in time.'
      })
    }
    console.error('[server] POST /process-document connection error:', error.message)
    return sendUpstreamError(res, {
      status: 502,
      error_code: 'SERVICE_UNAVAILABLE',
      message: 'The document service could not be reached.'
    })
  }

  if (response.status === 401 || response.status === 403) {
    console.error(`[server] POST /process-document upstream status ${response.status}`)
    return respondUnauthorized(res)
  }

  let payload
  try {
    payload = await response.json()
  } catch (error) {
    console.error('[server] POST /process-document returned invalid JSON:', error.message)
    return sendUpstreamError(res, {
      status: 502,
      error_code: 'SERVER_ERROR',
      message: 'The document service returned an unexpected response.'
    })
  }

  if (!response.ok) {
    console.error(`[server] POST /process-document upstream status ${response.status}`)
    // n8n reports its own error codes in the body (CONTRACT.md section 4). When
    // it does, pass that straight through with n8n's status so the frontend can
    // act on the code (UNSUPPORTED_FILE_TYPE, EMPTY_DOCUMENT, ...).
    if (payload && typeof payload === 'object' && payload.error_code) {
      return res.status(response.status).json(payload)
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

  // Success — hand the n8n response back unchanged (CONTRACT.md section 2).
  return res.status(response.status).json(payload)
})

// POST /review — step 3 of the connection order in SPEC.md section 7.
// Transparent proxy, same shape as POST /process-document: the request body from
// the frontend ({ document_id, reviewed_by, review_note }) is forwarded to n8n
// unchanged, and n8n's response (body + status) is handed back unchanged. n8n
// owns the Google Sheet update (Status = Reviewed, Reviewed By, Review Note) and
// returns HTTP 404 when no row matches document_id (CONTRACT.md sections 6-7).
app.post('/api/review', async (req, res) => {
  if (!n8nConfigured) {
    return notConfigured(res)
  }

  let response
  try {
    response = await callN8n(n8nConfig.reviewPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {})
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`[server] POST /review timed out after ${n8nConfig.timeoutMs}ms`)
      return sendUpstreamError(res, {
        status: 504,
        error_code: 'TIMEOUT',
        message: 'The document service did not respond in time.'
      })
    }
    console.error('[server] POST /review connection error:', error.message)
    return sendUpstreamError(res, {
      status: 502,
      error_code: 'SERVICE_UNAVAILABLE',
      message: 'The document service could not be reached.'
    })
  }

  if (response.status === 401 || response.status === 403) {
    console.error(`[server] POST /review upstream status ${response.status}`)
    return respondUnauthorized(res)
  }

  let payload
  try {
    payload = await response.json()
  } catch (error) {
    console.error('[server] POST /review returned invalid JSON:', error.message)
    return sendUpstreamError(res, {
      status: 502,
      error_code: 'SERVER_ERROR',
      message: 'The document service returned an unexpected response.'
    })
  }

  if (!response.ok) {
    console.error(`[server] POST /review upstream status ${response.status}`)
    // If n8n reports its own error code in the body, pass it straight through.
    if (payload && typeof payload === 'object' && payload.error_code) {
      return res.status(response.status).json(payload)
    }
    if (response.status === 404) {
      return sendUpstreamError(res, {
        status: 404,
        error_code: 'NOT_FOUND',
        message: 'No document with that ID was found in the document log.'
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

  // Success — hand the n8n response back unchanged (CONTRACT.md section 7).
  return res.status(response.status).json(payload)
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
  const upstream = n8nConfigured ? 'live' : 'not-configured'
  console.log(`[server] documents: ${upstream} · process-document: ${upstream} · review: ${upstream}`)
})
