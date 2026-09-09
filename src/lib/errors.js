// Single place that turns any failure into something a colleague in the office
// can read. Raw stack traces are never shown to the user (SPEC.md F7).

export class AppError extends Error {
  constructor({ code, title, message, retryable = false, keepFile = false }) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.title = title
    this.retryable = retryable
    this.keepFile = keepFile
  }
}

const CATALOG = {
  UNSUPPORTED_FILE_TYPE: {
    title: 'Unsupported file type',
    message: 'Only PDF, DOCX and TXT files can be processed. Choose a different file.',
    retryable: false,
    keepFile: false
  },
  FILE_TOO_LARGE: {
    title: 'File is too large',
    message: 'The selected file exceeds the maximum upload size. Choose a smaller file.',
    retryable: false,
    keepFile: false
  },
  EMPTY_DOCUMENT: {
    title: 'No readable text found',
    message:
      'This document contains no readable text, so there is nothing to extract. Try another file, or a version that is not a scanned image.',
    retryable: false,
    keepFile: true
  },
  EXTRACTION_FAILED: {
    title: 'Extraction did not complete',
    message: 'The document could not be read this time. Your file is still selected, so you can try again.',
    retryable: true,
    keepFile: true
  },
  UNAUTHORIZED: {
    title: 'Configuration problem',
    message:
      'The document service is not configured correctly. Nothing was sent. Please contact IT operations and quote this screen.',
    retryable: false,
    keepFile: true
  },
  NOT_CONFIGURED: {
    title: 'Service not connected',
    message:
      'The document service is not connected yet. Nothing was sent. Please contact IT operations.',
    retryable: false,
    keepFile: true
  },
  NOT_FOUND: {
    title: 'Document not found',
    message: 'This document is no longer in the document log. Refresh the dashboard and try again.',
    retryable: false,
    keepFile: false
  },
  TIMEOUT: {
    title: 'The request took too long',
    message:
      'Processing did not finish within 90 seconds. The document may still be processing — check the dashboard before sending it again.',
    retryable: true,
    keepFile: true
  },
  SERVICE_UNAVAILABLE: {
    title: 'Document service unavailable',
    message: 'The document service did not respond. Please try again in a few minutes.',
    retryable: true,
    keepFile: true
  },
  BAD_REQUEST: {
    title: 'The request could not be processed',
    message: 'The document service rejected this request. Please check the file and try again.',
    retryable: false,
    keepFile: true
  },
  SERVER_ERROR: {
    title: 'Something went wrong',
    message: 'The document service reported an internal problem. Please try again in a few minutes.',
    retryable: true,
    keepFile: true
  },
  NETWORK_ERROR: {
    title: 'No connection to the document service',
    message: 'The application could not reach the document service. Check your connection and try again.',
    retryable: true,
    keepFile: true
  },
  UNKNOWN: {
    title: 'Unexpected problem',
    message: 'Something unexpected happened. Please try again, and contact IT operations if it continues.',
    retryable: true,
    keepFile: true
  }
}

export function createAppError(code, overrides = {}) {
  const entry = CATALOG[code] ?? CATALOG.UNKNOWN
  return new AppError({ code: code in CATALOG ? code : 'UNKNOWN', ...entry, ...overrides })
}

// Maps an HTTP status to a catalog entry. Used once the real endpoints are wired.
export function errorFromStatus(status) {
  if (status === 401 || status === 403) return createAppError('UNAUTHORIZED')
  if (status === 404) return createAppError('NOT_FOUND')
  if (status === 503 || status === 502 || status === 504) return createAppError('SERVICE_UNAVAILABLE')
  if (status >= 400 && status < 500) return createAppError('BAD_REQUEST')
  if (status >= 500) return createAppError('SERVER_ERROR')
  return createAppError('UNKNOWN')
}

export function toAppError(error) {
  if (error instanceof AppError) return error
  if (error?.name === 'AbortError') return createAppError('TIMEOUT')
  if (error instanceof TypeError) return createAppError('NETWORK_ERROR')
  return createAppError('UNKNOWN')
}
