import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge, TypeTag, UrgencyBadge } from '../components/Badges.jsx'
import { EmptyState, ErrorBanner, LoadingRows } from '../components/Feedback.jsx'
import Value from '../components/Value.jsx'
import { DEPARTMENTS, DOCUMENT_TYPES, STATUSES, URGENCY_LEVELS } from '../lib/constants.js'
import { formatTimestamp } from '../lib/format.js'
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

export default function Dashboard() {
  const navigate = useNavigate()
  const { documents, status, error, lastUpdated, refresh } = useDocuments()

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(INITIAL_FILTERS)

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

  const filtersActive =
    search.trim() !== '' || Object.values(filters).some((value) => value !== 'all')

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function clearAll() {
    setSearch('')
    setFilters(INITIAL_FILTERS)
  }

  const counts = useMemo(
    () => ({
      total: documents.length,
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
          <span className="stat__value">{counts.needsReview}</span>
          <span className="stat__label">Awaiting review</span>
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
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((doc) => (
                    <tr
                      key={doc.document_id}
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
                      <td className="table__cell--muted">{formatTimestamp(doc.received_at)}</td>
                      <td>
                        <span className="table__primary">{doc.file_name}</span>
                        <span className="table__secondary">{doc.summary}</span>
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

function FilterSelect({ id, label, value, options, onChange }) {
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
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}
