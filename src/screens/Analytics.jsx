import { EmptyState, ErrorBanner, LoadingRows } from '../components/Feedback.jsx'
import { capitalize } from '../lib/format.js'
import { useDocuments } from '../state/DocumentsContext.jsx'

// Groups documents by a field's value and counts each occurrence. A missing
// value (null, undefined or an empty string) is grouped under "Not provided"
// — the same wording the Value component already uses on screen — instead of
// being dropped or shown as undefined/null. Sorted by count descending; ties
// are broken alphabetically so the order is stable between renders.
function countBy(documents, getValue) {
  const counts = new Map()
  for (const doc of documents) {
    const raw = getValue(doc)
    const key = raw === null || raw === undefined || raw === '' ? 'Not provided' : raw
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export default function Analytics() {
  const { documents, status, error, refresh } = useDocuments()

  const isFirstLoad = status === 'loading' && documents.length === 0
  const hasDocuments = documents.length > 0

  // Same definitions as the Document log KPIs (Dashboard.jsx): a document is
  // "awaiting review" once automated processing has finished but it has not
  // yet been marked Reviewed, whether that is the automation's normal
  // "Processed" state or the flagged "Needs Review" state.
  const kpis = {
    total: documents.length,
    awaitingReview: documents.filter(
      (doc) => doc.status === 'Processed' || doc.status === 'Needs Review'
    ).length,
    high: documents.filter((doc) => doc.urgency === 'High').length,
    reviewed: documents.filter((doc) => doc.status === 'Reviewed').length
  }

  const byUrgency = countBy(documents, (doc) => doc.urgency)
  const byDepartment = countBy(documents, (doc) => doc.department)
  const byType = countBy(documents, (doc) => doc.document_type)
  const byStatus = countBy(documents, (doc) => doc.status)

  return (
    <div className="screen">
      <header className="screen__header">
        <div>
          <h1 className="screen__title">Analytics</h1>
          <p className="screen__subtitle">
            A read-only summary of the documents currently in the log.
          </p>
        </div>
      </header>

      {status === 'error' && <ErrorBanner error={error} onRetry={refresh} retryLabel="Reload" />}

      {isFirstLoad && <LoadingRows rows={4} />}

      {!isFirstLoad && status !== 'error' && !hasDocuments && (
        <EmptyState
          title="No data to analyze yet"
          message="Once documents have been processed, their statistics will appear here."
        />
      )}

      {hasDocuments && (
        <>
          <div className="stat-row">
            <div className="stat">
              <span className="stat__value">{kpis.total}</span>
              <span className="stat__label">Total documents</span>
            </div>
            <div className="stat">
              <span className="stat__value">{kpis.awaitingReview}</span>
              <span className="stat__label">Awaiting review</span>
            </div>
            <div className="stat">
              <span className="stat__value">{kpis.high}</span>
              <span className="stat__label">High urgency</span>
            </div>
            <div className="stat">
              <span className="stat__value">{kpis.reviewed}</span>
              <span className="stat__label">Reviewed</span>
            </div>
          </div>

          <div className="analytics-grid">
            <Breakdown title="Documents by urgency" rows={byUrgency} />
            <Breakdown title="Documents by department" rows={byDepartment} />
            <Breakdown title="Documents by document type" rows={byType} formatLabel={capitalize} />
            <Breakdown title="Documents by status" rows={byStatus} />
          </div>
        </>
      )}
    </div>
  )
}

// A count per category, sized as a share of the largest category in the same
// breakdown so the bars are relative within that card, not across the page.
function Breakdown({ title, rows, formatLabel = (label) => label }) {
  const maxCount = Math.max(...rows.map((row) => row.count), 1)
  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">{title}</h2>
      </div>
      <div className="card__body">
        {rows.map((row) => (
          <div key={row.label} className="breakdown-row">
            <div className="breakdown-row__labels">
              <span className="breakdown-row__label">{formatLabel(row.label)}</span>
              <span className="breakdown-row__count">{row.count}</span>
            </div>
            <div className="breakdown-bar">
              <span
                className="breakdown-bar__fill"
                style={{ width: `${(row.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
