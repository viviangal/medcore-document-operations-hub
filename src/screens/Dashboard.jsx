import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge, TypeTag, UrgencyBadge } from '../components/Badges.jsx'
import { EmptyState, ErrorBanner, LoadingRows } from '../components/Feedback.jsx'
import Value from '../components/Value.jsx'
import { DEPARTMENTS, DOCUMENT_TYPES, STATUSES, URGENCY_LEVELS } from '../lib/constants.js'
import { capitalize, formatDate, formatTimestamp } from '../lib/format.js'
import { useDocuments } from '../state/DocumentsContext.jsx'

const INITIAL_FILTERS = {
  urgency: 'all',
  document_type: 'all',
  department: 'all',
  status: 'all'
}

function matchesSearch(doc, term) {
  if (!term) return true
  const haystack = [doc.file_name, doc.sender_or_company, doc.summary]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(term)
}

// Deadline arrives as a human-readable string from the automation, either a
// plain date (CONTRACT.md's own example: "12 March 2026") or that date
// embedded in a longer sentence (e.g. "Valid through 13 September 2026",
// "...requested by 10:00 on 7 September 2026"), or the placeholder
// "Not found". This is text extraction for sorting only — it never changes
// what is displayed, and it never invents a date that isn't written in the
// string. Anything that still doesn't yield a date is pushed to the bottom
// in both directions.
const MONTH_NAMES =
  'January|February|March|April|May|June|July|August|September|October|November|December'
const EMBEDDED_DEADLINE = new RegExp(
  `(?:(\\d{1,2}:\\d{2})\\s+on\\s+)?(\\d{1,2}\\s+(?:${MONTH_NAMES})\\s+\\d{4})`,
  'i'
)

function parseDeadline(value) {
  if (!value || typeof value !== 'string') return null
  const direct = new Date(value)
  if (!Number.isNaN(direct.getTime())) return direct
  const match = value.match(EMBEDDED_DEADLINE)
  if (!match) return null
  const [, time, datePart] = match
  const parsed = new Date(time ? `${datePart} ${time}` : datePart)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

// Sorts a copy of `list` by deadline; documents without a parseable deadline
// keep their relative order and stay at the bottom in either direction. This
// is display ordering only — it does not touch the documents themselves.
function sortByDeadline(list, direction) {
  return list
    .map((doc, index) => ({ doc, index, date: parseDeadline(doc.deadline) }))
    .sort((a, b) => {
      if (!a.date && !b.date) return a.index - b.index
      if (!a.date) return 1
      if (!b.date) return -1
      const diff = a.date.getTime() - b.date.getTime()
      return direction === 'desc' ? -diff : diff
    })
    .map((entry) => entry.doc)
}

// Only the fields listed for the CSV export, in the required column order.
// Each getter reads the raw record field — the same value already shown in
// the table — nothing is re-derived or invented for the export.
const CSV_COLUMNS = [
  ['Received', (doc) => formatDate(doc.received_at)],
  ['File Name', (doc) => doc.file_name],
  ['Document Type', (doc) => doc.document_type],
  ['Sender / Company', (doc) => doc.sender_or_company],
  ['Summary', (doc) => doc.summary],
  ['Requested Action', (doc) => doc.requested_action],
  ['Deadline', (doc) => doc.deadline],
  ['Urgency', (doc) => doc.urgency],
  ['Department', (doc) => doc.department],
  ['Status', (doc) => doc.status],
  ['Reviewed By', (doc) => doc.reviewed_by],
  ['Review Note', (doc) => doc.review_note],
  ['File Link', (doc) => doc.file_link]
]

// RFC 4180 escaping: a value containing a comma, quote or line break is
// wrapped in quotes with any inner quote doubled. A missing value becomes
// "Not provided" (the same wording Value already uses on screen) instead of
// an empty cell or the literal word undefined/null.
function csvCell(value) {
  const text = value === null || value === undefined || value === '' ? 'Not provided' : String(value)
  if (!/["\r\n,]/.test(text)) return text
  return '"' + text.replace(/"/g, '""') + '"'
}

function buildCsv(rows) {
  const lines = [CSV_COLUMNS.map(([header]) => csvCell(header)).join(',')]
  for (const doc of rows) {
    lines.push(CSV_COLUMNS.map(([, getValue]) => csvCell(getValue(doc))).join(','))
  }
  return lines.join('\r\n')
}

// Frontend-only download: a Blob URL clicked through a throwaway <a>, no
// server involved. The UTF-8 BOM keeps Excel from misreading the file.
function downloadDocumentsCsv(rows) {
  const csv = buildCsv(rows)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const today = new Date()
  const stamp = [today.getFullYear(), today.getMonth() + 1, today.getDate()]
    .map((part, index) => (index === 0 ? part : String(part).padStart(2, '0')))
    .join('-')

  const link = document.createElement('a')
  link.href = url
  link.download = `MedCore_Documents_${stamp}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { documents, status, error, lastUpdated, refresh } = useDocuments()

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  // null | 'asc' | 'desc'. First click sorts earliest-first, second click
  // latest-first, and it keeps toggling from there.
  const [deadlineSort, setDeadlineSort] = useState(null)

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    // All filters apply together (SPEC.md F5).
    return documents.filter(
      (doc) =>
        matchesSearch(doc, term) &&
        (filters.urgency === 'all' || doc.urgency === filters.urgency) &&
        (filters.document_type === 'all' || doc.document_type === filters.document_type) &&
        (filters.department === 'all' || doc.department === filters.department) &&
        (filters.status === 'all' || doc.status === filters.status)
    )
  }, [documents, search, filters])

  // Deadline sort is applied on top of the search/filter result, so it never
  // resets or fights with them.
  const sortedVisible = useMemo(() => {
    if (!deadlineSort) return visible
    return sortByDeadline(visible, deadlineSort)
  }, [visible, deadlineSort])

  const filtersActive =
    search.trim() !== '' || Object.values(filters).some((value) => value !== 'all')

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function clearAll() {
    setSearch('')
    setFilters(INITIAL_FILTERS)
  }

  function toggleDeadlineSort() {
    setDeadlineSort((current) => (current === 'asc' ? 'desc' : 'asc'))
  }

  // Exports exactly the rows currently on screen: sortedVisible already has
  // search, every filter, and the deadline sort applied.
  function exportCsv() {
    downloadDocumentsCsv(sortedVisible)
  }

  const counts = useMemo(
    () => ({
      total: documents.length,
      // Awaiting review = automated processing has finished but a person has
      // not yet marked it Reviewed. "Processed" is the automation's normal
      // finished state; "Needs Review" is the flagged state it may also
      // return. Both count; "Reviewed" does not. Computed from the current
      // documents every render, never hard-coded.
      awaitingReview: documents.filter(
        (doc) => doc.status === 'Processed' || doc.status === 'Needs Review'
      ).length,
      // Needs review is a subset of Awaiting review above: only the documents
      // explicitly flagged Needs Review, not the ordinary Processed ones.
      needsReview: documents.filter((doc) => doc.status === 'Needs Review').length,
      high: documents.filter((doc) => doc.urgency === 'High').length
    }),
    [documents]
  )

  const isFirstLoad = status === 'loading' && documents.length === 0

  return (
    <div className="screen">
      <header className="screen__header">
        <div>
          <h1 className="screen__title">Document log</h1>
          <p className="screen__subtitle">
            Every document processed by the Smart Office Document Assistant, newest first.
          </p>
        </div>
        <div className="screen__actions">
          {lastUpdated && (
            <span className="screen__meta">Updated {formatTimestamp(lastUpdated.toISOString())}</span>
          )}
          <button
            type="button"
            className="button button--secondary"
            onClick={exportCsv}
            disabled={sortedVisible.length === 0}
          >
            Export CSV
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={refresh}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      <div className="stat-row">
        <div className="stat">
          <span className="stat__value">{counts.total}</span>
          <span className="stat__label">Documents in log</span>
        </div>
        <div className="stat">
          <span className="stat__value">{counts.awaitingReview}</span>
          <span className="stat__label">Awaiting review</span>
        </div>
        <div className="stat">
          <span className="stat__value">{counts.needsReview}</span>
          <span className="stat__label">Needs review</span>
        </div>
        <div className="stat">
          <span className="stat__value">{counts.high}</span>
          <span className="stat__label">High urgency</span>
        </div>
      </div>

      <section className="card">
        <div className="toolbar">
          <div className="toolbar__search">
            <label className="visually-hidden" htmlFor="dashboard-search">
              Search documents
            </label>
            <input
              id="dashboard-search"
              type="search"
              className="input input--search"
              placeholder="Search file name, sender or summary"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="toolbar__filters">
            <FilterSelect
              id="filter-urgency"
              label="Urgency"
              value={filters.urgency}
              options={URGENCY_LEVELS}
              onChange={(value) => updateFilter('urgency', value)}
            />
            <FilterSelect
              id="filter-type"
              label="Type"
              value={filters.document_type}
              options={DOCUMENT_TYPES}
              formatLabel={capitalize}
              onChange={(value) => updateFilter('document_type', value)}
            />
            <FilterSelect
              id="filter-department"
              label="Department"
              value={filters.department}
              options={DEPARTMENTS}
              onChange={(value) => updateFilter('department', value)}
            />
            <FilterSelect
              id="filter-status"
              label="Status"
              value={filters.status}
              options={STATUSES}
              onChange={(value) => updateFilter('status', value)}
            />
            {filtersActive && (
              <button type="button" className="button button--ghost button--small" onClick={clearAll}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="card__body card__body--flush">
          {status === 'error' && <ErrorBanner error={error} onRetry={refresh} retryLabel="Reload" />}

          {isFirstLoad && <LoadingRows rows={8} />}

          {!isFirstLoad && status !== 'error' && documents.length === 0 && (
            <EmptyState
              title="The document log is empty"
              message="No documents have been processed yet. Upload a document to get started."
              action={
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => navigate('/upload')}
                >
                  Upload a document
                </button>
              }
            />
          )}

          {!isFirstLoad && documents.length > 0 && visible.length === 0 && (
            <EmptyState
              title="No results"
              message="No documents match the current search and filters."
              action={
                <button type="button" className="button button--secondary" onClick={clearAll}>
                  Clear search and filters
                </button>
              }
            />
          )}

          {visible.length > 0 && (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Received</th>
                    <th scope="col">Document</th>
                    <th scope="col">Type</th>
                    <th scope="col">Sender / company</th>
                    <th scope="col">Urgency</th>
                    <th scope="col">Department</th>
                    <th
                      scope="col"
                      aria-sort={
                        deadlineSort === 'asc'
                          ? 'ascending'
                          : deadlineSort === 'desc'
                            ? 'descending'
                            : 'none'
                      }
                    >
                      <button
                        type="button"
                        className="table__sort"
                        onClick={toggleDeadlineSort}
                        aria-label={`Sort by deadline, ${
                          deadlineSort === 'asc'
                            ? 'earliest first, click for latest first'
                            : deadlineSort === 'desc'
                              ? 'latest first, click for earliest first'
                              : 'click to sort by earliest first'
                        }`}
                      >
                        Deadline
                        {deadlineSort && (
                          <span className="table__sort-icon" aria-hidden="true">
                            {deadlineSort === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVisible.map((doc, index) => (
                    <tr
                      // document_id is not guaranteed unique in the live data (a Google
                      // Sheet row-number issue on the n8n side). A composite key keeps
                      // React from confusing rows across renders; index guarantees
                      // uniqueness even when every other field collides too.
                      key={`${doc.document_id || 'no-id'}-${doc.received_at || 'no-date'}-${index}`}
                      className="table__row"
                      tabIndex={0}
                      role="link"
                      onClick={() => navigate(`/documents/${doc.document_id}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          navigate(`/documents/${doc.document_id}`)
                        }
                      }}
                    >
                      <td className="table__cell--muted">{formatDate(doc.received_at)}</td>
                      <td>
                        <span className="table__primary">{doc.file_name}</span>
                      </td>
                      <td>
                        <TypeTag value={doc.document_type} />
                      </td>
                      <td>
                        <Value>{doc.sender_or_company}</Value>
                      </td>
                      <td>
                        <UrgencyBadge value={doc.urgency} />
                      </td>
                      <td>
                        <Value>{doc.department}</Value>
                      </td>
                      <td className="table__cell--muted">
                        <Value>{doc.deadline}</Value>
                      </td>
                      <td>
                        <StatusBadge value={doc.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="table__footnote">
                Showing {visible.length} of {documents.length} documents
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

// formatLabel controls the displayed text only — the option's value (what
// filtering compares against) is always the raw contract value.
function FilterSelect({ id, label, value, options, onChange, formatLabel = (option) => option }) {
  return (
    <div className="filter">
      <label className="filter__label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="input input--select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </div>
  )
}
