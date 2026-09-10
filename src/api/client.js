// The single API access layer (SPEC.md section 7).
//
// Every network-shaped call in the interface goes through this module. No other
// file may call fetch, and no other file imports mock.js directly.
//
// Endpoints are connected one at a time, in the order given in SPEC.md section 7:
//   1. GET  /documents        <- connected (milestone 2)
//   2. POST /process-document <- connected (milestone 3 backend, milestone 4 frontend)
//   3. POST /review           <- still mocked
//
// The browser calls the Express server. The Express server is the only place
// that knows the n8n shared secret. No secret exists in this file.

import { REQUEST_TIMEOUT_MS, REVIEW_NOTE_MAX_LENGTH } from '../lib/constants.js'
import { createAppError, errorFromStatus, toAppError } from '../lib/errors.js'
import { mockReview } from './mock.js'

const API_BASE = '/api'

// POST /review is not gated by an env flag: it stays mocked until its own
// milestone regardless of any toggle.
export function isReviewMocked() {
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
 * POST /process-document — sends one document for processing. The Express server
 * forwards it to n8n and returns the extracted business information unchanged
 * (CONTRACT.md section 2). Structured n8n errors (UNSUPPORTED_FILE_TYPE,
 * EMPTY_DOCUMENT, ...) surface here through request()'s error handling.
 * @param {{file_name: string, mime_type: string, file_base64: string, submitted_by?: string}} body
 */
export async function processDocument(body) {
  return request('/process-document', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/**
 * POST /review — records a human review.
 * Still mocked (milestone 5 connects this). See isReviewMocked().
 * @param {{document_id: string, status: 'Reviewed'|'Needs Review', reviewed_by: string, review_note?: string}} body
 */
export async function submitReview(body) {
  const payload = {
    ...body,
    review_note: (body.review_note ?? '').slice(0, REVIEW_NOTE_MAX_LENGTH)
  }

  return mockReview(payload)
}
