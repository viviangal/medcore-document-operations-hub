// Values defined by SPEC.md section 5 and CONTRACT.md section 3.
// The application displays these values, it never invents or translates them.

export const DOCUMENT_TYPES = [
  'invoice',
  'request',
  'report',
  'complaint',
  'contract',
  'quote',
  'other'
]

export const URGENCY_LEVELS = ['Low', 'Medium', 'High']

export const DEPARTMENTS = [
  'Sales',
  'Finance',
  'Support',
  'HR',
  'Management',
  'General'
]

// "Processed" is written by the automation, the two review states come from
// POST /review (CONTRACT.md section 6).
export const STATUSES = ['Processed', 'Needs Review', 'Reviewed']

export const REVIEW_STATUSES = ['Reviewed', 'Needs Review']

export const REVIEW_NOTE_MAX_LENGTH = 200

// CONTRACT.md section 8.
export const REQUEST_TIMEOUT_MS = 90000

export const MAX_FILE_MB = Number(import.meta.env.VITE_MAX_FILE_MB ?? 10)
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt']

export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]

// Placeholder values the automation may return for missing information.
// They must stay visible exactly as received (SPEC.md section 5).
export const MISSING_VALUES = ['Not found', 'No action found']

export function isMissingValue(value) {
  return MISSING_VALUES.includes(value)
}
