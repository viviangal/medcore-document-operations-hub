// Maps the raw Google Sheet column headers n8n currently returns for
// GET /documents into the field names defined in CONTRACT.md section 5.
//
// This is a field-name translation only. No value is invented, changed, or
// guessed — "Not found", "No action found" and every other value pass through
// exactly as received. Unmapped columns (the Sheet's row_number, or anything
// unexpected) are ignored rather than propagated.

const HEADER_TO_FIELD = {
  'Document ID': 'document_id',
  'Received At': 'received_at',
  'File Name': 'file_name',
  'File Link': 'file_link',
  'Document Type': 'document_type',
  'Sender / Company': 'sender_or_company',
  Summary: 'summary',
  'Requested Action': 'requested_action',
  Deadline: 'deadline',
  Urgency: 'urgency',
  Department: 'department',
  Status: 'status',
  'Reviewed By': 'reviewed_by',
  'Review Note': 'review_note'
}

// If a row already arrives in contract-shaped keys (e.g. the Sheet headers
// change to match CONTRACT.md directly), pass those through too.
const CONTRACT_FIELDS = new Set(Object.values(HEADER_TO_FIELD))

export function normalizeDocumentRow(row) {
  if (!row || typeof row !== 'object') return null

  const normalized = {}

  for (const [key, value] of Object.entries(row)) {
    if (CONTRACT_FIELDS.has(key)) {
      normalized[key] = value
      continue
    }
    const field = HEADER_TO_FIELD[key]
    if (field) normalized[field] = value
    // Anything else (row_number, etc.) is intentionally dropped.
  }

  return normalized
}

export function normalizeDocuments(rows) {
  if (!Array.isArray(rows)) return []
  return rows.map(normalizeDocumentRow).filter(Boolean)
}
