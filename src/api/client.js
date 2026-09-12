// The single API access layer (SPEC.md section 7).
//
// Every network-shaped call in the interface goes through this module. No other
// file may call fetch, and no other file imports mock.js directly.
//
// Endpoints are connected one at a time, in the order given in SPEC.md section 7:
//   1. GET /documents          <- connected (milestone 2)
//   2. POST /process-document <- connected (milestone 3 backend, milestone 4 frontend)
//   3. POST /review           <- connected (milestone 5)
//
// The browser calls the Express server. The Express server is the only place
// that knows the n8n shared secret. No secret exists in this file.

import { REQUEST_TIMEOUT_MS, REVIEW_NOTE_MAX_LENGTH } from '../lib/constants.js'
import { createAppError, errorFromStatus, toAppError } from '../lib/errors.js'
import { getDirectApiKey } from '../lib/directApiKey.js'

// Two API modes, both decided at BUILD time (Vite bakes VITE_ vars into the
// bundle -- there is no server to read a runtime .env on GitHub Pages):
//
//   'proxy' (default, unset VITE_API_MODE): every request goes to this
//   app's own /api/* routes. In local dev, Vite's dev-server proxy forwards
//   them to the Express server (see vite.config.js), which is the only place
//   that knows N8N_SECRET. This is the existing behavior and is completely
//   unaffected unless VITE_API_MODE is explicitly set to 'direct'.
//
//   'direct' (VITE_API_MODE=direct): for the GitHub Pages static build,
//   which has no server to proxy through. The browser calls the hosted n8n
//   webhook base (VITE_N8N_BASE_URL) directly. Because anything shipped to
//   a static site is public, this mode never attaches N8N_SECRET or any
//   build-time credential -- see .env.example for the placeholder vars.
//   Instead, in this mode only, the required x-api-key header is filled in
//   at RUNTIME from a key the instructor enters into DirectModeKeyBar,
//   which is stored only in sessionStorage/memory (lib/directApiKey.js) --
//   never in source, never in this build, never logged.

const API_MODE = import.meta.env.VITE_API_MODE === 'direct' ? 'direct' : 'proxy'
const API_BASE =
  API_MODE === 'direct'
    ? (import.meta.env.VITE_N8N_BASE_URL ?? '')
    : '/api'

export const isDirectMode = API_MODE === 'direct'

// --- real transport --------------------------------------------------------

async function request(path, options = {}) {
  // Only read/attach the runtime key in direct mode. In proxy mode (every
  // local dev run, and any production build that hasn't opted into direct
  // mode) this is always null, so the header below is never added and the
  // existing Express-proxied request is byte-for-byte unchanged.
  const directKey = isDirectMode ? getDirectApiKey() : null

  // In direct mode, never call n8n without a runtime key -- there is no
  // server to fall back on, so a missing key is a local configuration
  // problem, not a network error. Proxy mode is unaffected (directKey is
  // always null there, so this never triggers).
  if (isDirectMode && !directKey) {
    throw createAppError('NOT_CONFIGURED')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(directKey ? { 'x-api-key': directKey } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    throw toAppError(error)
  } finally {
    clearTimeout(timer)
  }

  let payload = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    // n8n reports its own error codes in the body (CONTRACT.md section 4).
    if (payload?.error_code) throw createAppError(payload.error_code)
    throw errorFromStatus(response.status)
  }

  if (payload?.status === 'error') {
    throw createAppError(payload.error_code ?? 'UNKNOWN')
  }

  return payload
}

// --- endpoints -------------------------------------------------------------

/** GET /documents — the processed-document records from the Google Sheet. */
export async function getDocuments() {
  const payload = await request('/documents')
  return Array.isArray(payload) ? payload : []
}

/**
 * POST /process-document — sends one document for processing. The Express server
 * forwards it to n8n and returns the extracted business information unchanged
 * (CONTRACT.md section 2). Structured n8n errors (UNSUPPORTED_FILE_TYPE,
 * EMPTY_DOCUMENT, ...) surface here through request()'s error handling.
 * @param {{file_name: string, mime_type: string, file_base64: string, submitted_by: string}} body
 */
export async function processDocument(body) {
  return request('/process-document', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * POST /review — records a human review. The Express server forwards it to n8n
 * with the x-api-key header; n8n updates the matching Google Sheet row
 * (Status = Reviewed, Reviewed By, Review Note) and returns
 * { status: 'updated', document_id } (CONTRACT.md sections 6-7). A missing row
 * surfaces here as a NOT_FOUND AppError through request()'s error handling.
 * @param {{document_id: string, reviewed_by: string, review_note?: string}} body
 */
export async function submitReview(body) {
  const payload = {
    document_id: body.document_id,
    reviewed_by: body.reviewed_by,
    review_note: (body.review_note ?? '').slice(0, REVIEW_NOTE_MAX_LENGTH),
  }

  return request('/review', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}