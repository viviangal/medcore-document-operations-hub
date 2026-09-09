// The single API access layer (SPEC.md section 7).
//
// Every network-shaped call in the interface goes through this module. No other
// file may call fetch, and no other file imports mock.js directly.
//
// Endpoints are connected one at a time, in the order given in SPEC.md section 7:
//   1. GET  /documents        <- connected (milestone 2)
//   2. POST /process-document <- still mocked
//   3. POST /review           <- still mocked
//
// The browser calls the Express server. The Express server is the only place
// that knows the n8n shared secret. No secret exists in this file.

import { REQUEST_TIMEOUT_MS, REVIEW_NOTE_MAX_LENGTH } from '../lib/constants.js'
import { createAppError, errorFromStatus, toAppError } from '../lib/errors.js'
import { mockProcessDocument, mockReview } from './mock.js'

const API_BASE = '/api'

// POST /process-document and POST /review are deliberately not gated by an env
// flag: they stay mocked until their own milestones regardless of any toggle,
// so connecting GET /documents cannot accidentally activate them.
export function isWriteMocked() {
  return true
}

// --- real transport -----------------------------------------------------

async function request(path, options = {}) {
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
        ...options.headers
      }
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

// --- endpoints --------------------------------------------------------------

/** GET /documents — the processed-document records from the Google Sheet. */
export async function getDocuments() {
  const payload = await request('/documents')
  return Array.isArray(payload) ? payload : []
}

/**
 * POST /process-document — sends one document for processing.
 * Still mocked (milestone 3 connects this). See isWriteMocked().
 * @param {{file_name: string, mime_type: string, file_base64: string, submitted_by?: string}} body
 */
export async function processDocument(body) {
  return mockProcessDocument(body)
}

/**
 * POST /review — records a human review.
 * Still mocked (milestone 4 connects this). See isWriteMocked().
 * @param {{document_id: string, status: 'Reviewed'|'Needs Review', reviewed_by: string, review_note?: string}} body
 */
export async function submitReview(body) {
  const payload = {
    ...body,
    review_note: (body.review_note ?? '').slice(0, REVIEW_NOTE_MAX_LENGTH)
  }

  return mockReview(payload)
}
