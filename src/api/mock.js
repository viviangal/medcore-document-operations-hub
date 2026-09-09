// Mock transport for milestone 1 (SPEC.md section 7).
//
// This module imitates the n8n responses described in CONTRACT.md so the whole
// interface can be built and tested before any real endpoint exists. It makes
// no network calls of any kind.
//
// It contains NO business logic: no AI, no urgency rules, no extraction. The
// field values below are fixed example data in the shape the automation returns.

import { createAppError } from '../lib/errors.js'

const LATENCY = {
  documents: 420,
  process: 2400,
  review: 520
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

// ---------------------------------------------------------------------------
// Seed records — the shape returned by GET /documents (CONTRACT.md section 5).
// The document log includes records from the original Google Drive Part 1
// workflow (SPEC.md F4), which carry the drive- prefix.
// ---------------------------------------------------------------------------

const SEED_DOCUMENTS = [
  {
    document_id: 'exec-1043',
    received_at: '2026-03-11T09:24:00Z',
    file_name: 'invoice-4471.pdf',
    file_link: 'https://drive.google.com/file/d/example/view',
    document_type: 'invoice',
    sender_or_company: 'Nordic Supplies Ltd',
    summary: 'Invoice for office chairs delivered in February.',
    requested_action: 'Approve and pay invoice 4471',
    deadline: '12 March 2026',
    urgency: 'High',
    department: 'Finance',
    status: 'Processed'
  },
  {
    document_id: 'exec-1042',
    received_at: '2026-03-11T08:05:00Z',
    file_name: 'service-request-hospital-nord.pdf',
    file_link: 'https://drive.google.com/file/d/example-1042/view',
    document_type: 'request',
    sender_or_company: 'Hospital Nord Procurement',
    summary: 'Request for on-site service of two infusion pump units under warranty.',
    requested_action: 'Schedule a service technician visit',
    deadline: '16 March 2026',
    urgency: 'High',
    department: 'Support',
    status: 'Needs Review'
  },
  {
    document_id: 'exec-1041',
    received_at: '2026-03-10T16:41:00Z',
    file_name: 'quote-mri-consumables.docx',
    file_link: 'https://drive.google.com/file/d/example-1041/view',
    document_type: 'quote',
    sender_or_company: 'Baltic Medical Imaging',
    summary: 'Quotation request for annual supply of MRI consumables.',
    requested_action: 'Prepare and return a price quotation',
    deadline: '20 March 2026',
    urgency: 'Medium',
    department: 'Sales',
    status: 'Processed'
  },
  {
    document_id: 'exec-1040',
    received_at: '2026-03-10T14:12:00Z',
    file_name: 'complaint-delivery-delay.txt',
    file_link: 'https://drive.google.com/file/d/example-1040/view',
    document_type: 'complaint',
    sender_or_company: 'Clinica Ribeiro',
    summary: 'Complaint about a delayed delivery of surgical consumables ordered in January.',
    requested_action: 'Contact the customer with a revised delivery date',
    deadline: 'Not found',
    urgency: 'High',
    department: 'Support',
    status: 'Reviewed'
  },
  {
    document_id: 'exec-1039',
    received_at: '2026-03-10T11:58:00Z',
    file_name: 'distribution-agreement-2026.pdf',
    file_link: 'https://drive.google.com/file/d/example-1039/view',
    document_type: 'contract',
    sender_or_company: 'Vertex Diagnostics GmbH',
    summary: 'Renewal of the regional distribution agreement for diagnostic analysers.',
    requested_action: 'Review clause 7 and return a signed copy',
    deadline: '31 March 2026',
    urgency: 'Medium',
    department: 'Management',
    status: 'Needs Review'
  },
  {
    document_id: 'exec-1038',
    received_at: '2026-03-09T15:30:00Z',
    file_name: 'monthly-sales-report-february.docx',
    file_link: 'https://drive.google.com/file/d/example-1038/view',
    document_type: 'report',
    sender_or_company: 'MedCore Regional Sales',
    summary: 'February sales figures for the Nordic and Baltic regions.',
    requested_action: 'No action found',
    deadline: 'Not found',
    urgency: 'Low',
    department: 'Sales',
    status: 'Processed'
  },
  {
    document_id: 'exec-1037',
    received_at: '2026-03-09T13:02:00Z',
    file_name: 'invoice-4468.pdf',
    file_link: 'https://drive.google.com/file/d/example-1037/view',
    document_type: 'invoice',
    sender_or_company: 'Peninsula Logistics',
    summary: 'Freight invoice for shipments 9921 to 9944.',
    requested_action: 'Verify shipment references and pay',
    deadline: '25 March 2026',
    urgency: 'Medium',
    department: 'Finance',
    status: 'Reviewed'
  },
  {
    document_id: 'exec-1036',
    received_at: '2026-03-09T09:47:00Z',
    file_name: 'candidate-application-field-engineer.pdf',
    file_link: 'https://drive.google.com/file/d/example-1036/view',
    document_type: 'other',
    sender_or_company: 'Not found',
    summary: 'Application for the field service engineer position advertised in February.',
    requested_action: 'Forward to the hiring manager',
    deadline: 'Not found',
    urgency: 'Low',
    department: 'HR',
    status: 'Processed'
  },
  {
    document_id: 'exec-1035',
    received_at: '2026-03-08T17:20:00Z',
    file_name: 'tender-invitation-regional-clinic.pdf',
    file_link: 'https://drive.google.com/file/d/example-1035/view',
    document_type: 'request',
    sender_or_company: 'Regional Clinic Association',
    summary: 'Invitation to tender for patient monitoring equipment across four clinics.',
    requested_action: 'Confirm participation before the closing date',
    deadline: '18 March 2026',
    urgency: 'High',
    department: 'Sales',
    status: 'Needs Review'
  },
  {
    document_id: 'exec-1034',
    received_at: '2026-03-08T12:09:00Z',
    file_name: 'calibration-report-q1.pdf',
    file_link: 'https://drive.google.com/file/d/example-1034/view',
    document_type: 'report',
    sender_or_company: 'Helix Calibration Services',
    summary: 'Quarterly calibration report for loan equipment held at the regional depot.',
    requested_action: 'File with the quality records',
    deadline: 'Not found',
    urgency: 'Low',
    department: 'Support',
    status: 'Processed'
  },
  {
    document_id: 'exec-1033',
    received_at: '2026-03-07T15:55:00Z',
    file_name: 'payment-reminder-4402.txt',
    file_link: 'https://drive.google.com/file/d/example-1033/view',
    document_type: 'invoice',
    sender_or_company: 'Orion Packaging',
    summary: 'Second reminder for unpaid invoice 4402 issued in January.',
    requested_action: 'Confirm payment status with accounts payable',
    deadline: '13 March 2026',
    urgency: 'High',
    department: 'Finance',
    status: 'Needs Review'
  },
  {
    document_id: 'exec-1032',
    received_at: '2026-03-07T10:31:00Z',
    file_name: 'training-schedule-april.docx',
    file_link: 'https://drive.google.com/file/d/example-1032/view',
    document_type: 'other',
    sender_or_company: 'MedCore Academy',
    summary: 'Proposed product training schedule for distributor partners in April.',
    requested_action: 'Confirm trainer availability',
    deadline: '27 March 2026',
    urgency: 'Low',
    department: 'HR',
    status: 'Processed'
  },
  {
    document_id: 'exec-1031',
    received_at: '2026-03-06T16:14:00Z',
    file_name: 'complaint-packaging-damage.pdf',
    file_link: 'https://drive.google.com/file/d/example-1031/view',
    document_type: 'complaint',
    sender_or_company: 'Sundberg Medical Centre',
    summary: 'Two delivered boxes arrived with damaged outer packaging and broken seals.',
    requested_action: 'Arrange replacement and collect the damaged units',
    deadline: '14 March 2026',
    urgency: 'High',
    department: 'Support',
    status: 'Reviewed'
  },
  {
    document_id: 'exec-1030',
    received_at: '2026-03-06T11:02:00Z',
    file_name: 'supplier-quote-sterile-trays.docx',
    file_link: 'https://drive.google.com/file/d/example-1030/view',
    document_type: 'quote',
    sender_or_company: 'Alpine Sterile Systems',
    summary: 'Supplier quotation for sterile instrument trays, valid for thirty days.',
    requested_action: 'Compare against the current supplier price list',
    deadline: '05 April 2026',
    urgency: 'Medium',
    department: 'Finance',
    status: 'Processed'
  },
  {
    document_id: 'exec-1029',
    received_at: '2026-03-05T14:48:00Z',
    file_name: 'framework-contract-amendment.pdf',
    file_link: 'https://drive.google.com/file/d/example-1029/view',
    document_type: 'contract',
    sender_or_company: 'National Health Procurement Office',
    summary: 'Amendment to the framework contract covering delivery lead times.',
    requested_action: 'Legal review before countersignature',
    deadline: '24 March 2026',
    urgency: 'Medium',
    department: 'Management',
    status: 'Needs Review'
  },
  {
    document_id: 'exec-1028',
    received_at: '2026-03-05T09:19:00Z',
    file_name: 'stock-availability-request.txt',
    file_link: 'https://drive.google.com/file/d/example-1028/view',
    document_type: 'request',
    sender_or_company: 'Delta Care Pharmacy Group',
    summary: 'Request for current stock availability of three catalogue items.',
    requested_action: 'Send availability confirmation',
    deadline: '10 March 2026',
    urgency: 'Medium',
    department: 'Sales',
    status: 'Reviewed'
  },
  {
    document_id: 'exec-1027',
    received_at: '2026-03-04T15:36:00Z',
    file_name: 'internal-memo-office-move.docx',
    file_link: 'https://drive.google.com/file/d/example-1027/view',
    document_type: 'other',
    sender_or_company: 'MedCore Facilities',
    summary: 'Internal memo about the relocation of the second-floor operations desk.',
    requested_action: 'No action found',
    deadline: 'Not found',
    urgency: 'Low',
    department: 'General',
    status: 'Processed'
  },
  {
    document_id: 'exec-1026',
    received_at: '2026-03-04T08:52:00Z',
    file_name: 'invoice-4455.pdf',
    file_link: 'https://drive.google.com/file/d/example-1026/view',
    document_type: 'invoice',
    sender_or_company: 'Coastal Instruments',
    summary: 'Invoice for spare parts supplied to the service depot in February.',
    requested_action: 'Match against purchase order 8812 and approve',
    deadline: '30 March 2026',
    urgency: 'Low',
    department: 'Finance',
    status: 'Processed'
  },
  {
    document_id: 'drive-0918',
    received_at: '2026-03-03T13:27:00Z',
    file_name: 'annual-audit-summary.pdf',
    file_link: 'https://drive.google.com/file/d/example-0918/view',
    document_type: 'report',
    sender_or_company: 'Westline Auditors',
    summary: 'Summary of the annual quality audit of the distribution warehouse.',
    requested_action: 'Circulate to the management team',
    deadline: 'Not found',
    urgency: 'Medium',
    department: 'Management',
    status: 'Processed'
  },
  {
    document_id: 'drive-0917',
    received_at: '2026-03-03T10:04:00Z',
    file_name: 'warranty-claim-form.docx',
    file_link: 'https://drive.google.com/file/d/example-0917/view',
    document_type: 'request',
    sender_or_company: 'Not found',
    summary: 'Warranty claim for a patient monitor delivered in November.',
    requested_action: 'No action found',
    deadline: 'Not found',
    urgency: 'Medium',
    department: 'Support',
    status: 'Needs Review'
  },
  {
    document_id: 'drive-0916',
    received_at: '2026-03-02T16:45:00Z',
    file_name: 'price-list-update-2026.txt',
    file_link: 'https://drive.google.com/file/d/example-0916/view',
    document_type: 'other',
    sender_or_company: 'Vertex Diagnostics GmbH',
    summary: 'Updated distributor price list effective from the second quarter.',
    requested_action: 'Update the internal catalogue',
    deadline: '01 April 2026',
    urgency: 'Low',
    department: 'Sales',
    status: 'Reviewed'
  },
  {
    document_id: 'drive-0915',
    received_at: '2026-03-02T09:11:00Z',
    file_name: 'shipment-confirmation-9921.pdf',
    file_link: 'https://drive.google.com/file/d/example-0915/view',
    document_type: 'report',
    sender_or_company: 'Peninsula Logistics',
    summary: 'Confirmation of dispatch for shipment 9921 to the regional depot.',
    requested_action: 'No action found',
    deadline: 'Not found',
    urgency: 'Low',
    department: 'General',
    status: 'Processed'
  }
]

// In-memory document log, standing in for the Google Sheet during milestone 1.
let documentLog = clone(SEED_DOCUMENTS)
let nextId = 1044

function newDocumentId() {
  return `exec-${nextId++}`
}

// ---------------------------------------------------------------------------
// Deterministic scenarios, so every error state in SPEC.md F7 can be reviewed
// without a live workflow. Driven by the file name only.
// ---------------------------------------------------------------------------

function scenarioFor(fileName = '') {
  const name = fileName.toLowerCase()
  if (name.includes('empty')) return 'EMPTY_DOCUMENT'
  if (name.includes('fail') || name.includes('corrupt')) return 'EXTRACTION_FAILED'
  if (name.includes('unauthorized')) return 'UNAUTHORIZED'
  if (name.includes('timeout')) return 'TIMEOUT'
  return null
}

// Example extraction results, cycled through for uploaded files. These are
// fixed sample values, not a classification of the uploaded document.
const SAMPLE_FIELDS = [
  {
    document_type: 'invoice',
    sender_or_company: 'Nordic Supplies Ltd',
    summary: 'Invoice for office chairs delivered in February.',
    requested_action: 'Approve and pay invoice 4471',
    deadline: '12 March 2026',
    urgency: 'High',
    department: 'Finance'
  },
  {
    document_type: 'request',
    sender_or_company: 'Hospital Nord Procurement',
    summary: 'Request for a service visit covering two devices still under warranty.',
    requested_action: 'Schedule a service technician visit',
    deadline: '19 March 2026',
    urgency: 'Medium',
    department: 'Support'
  },
  {
    document_type: 'report',
    sender_or_company: 'Not found',
    summary: 'Operational summary covering the previous reporting period.',
    requested_action: 'No action found',
    deadline: 'Not found',
    urgency: 'Low',
    department: 'General'
  }
]

let sampleIndex = 0

// ---------------------------------------------------------------------------
// Mock endpoints
// ---------------------------------------------------------------------------

export async function mockGetDocuments() {
  await delay(LATENCY.documents)
  return clone(documentLog)
}

export async function mockProcessDocument(payload) {
  const scenario = scenarioFor(payload?.file_name)

  if (scenario === 'TIMEOUT') {
    await delay(3000)
    throw createAppError('TIMEOUT')
  }

  await delay(LATENCY.process)

  if (scenario) {
    throw createAppError(scenario)
  }

  const fields = clone(SAMPLE_FIELDS[sampleIndex % SAMPLE_FIELDS.length])
  sampleIndex += 1

  const documentId = newDocumentId()
  const receivedAt = new Date().toISOString()

  // The record the automation would have written to the Google Sheet.
  documentLog = [
    {
      document_id: documentId,
      received_at: receivedAt,
      file_name: payload.file_name,
      file_link: `https://drive.google.com/file/d/${documentId}/view`,
      ...fields,
      status: 'Processed'
    },
    ...documentLog
  ]

  return {
    status: 'processed',
    document_id: documentId,
    file_name: payload.file_name,
    file_link: `https://drive.google.com/file/d/${documentId}/view`,
    received_at: receivedAt,
    fields,
    notification_sent: true
  }
}

export async function mockReview(payload) {
  await delay(LATENCY.review)

  const index = documentLog.findIndex((doc) => doc.document_id === payload.document_id)
  if (index === -1) {
    throw createAppError('NOT_FOUND')
  }

  documentLog = documentLog.map((doc, position) =>
    position === index
      ? {
          ...doc,
          status: payload.status,
          reviewed_by: payload.reviewed_by,
          review_note: payload.review_note ?? ''
        }
      : doc
  )

  return { status: 'updated', document_id: payload.document_id }
}

// Test helper: empties the log so the empty-state can be reviewed.
export function mockClearDocuments() {
  documentLog = []
}
