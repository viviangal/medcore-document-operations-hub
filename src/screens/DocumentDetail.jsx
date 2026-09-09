import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { submitReview } from '../api/client.js'
import { StatusBadge } from '../components/Badges.jsx'
import DocumentFields from '../components/DocumentFields.jsx'
import { EmptyState, ErrorBanner, LoadingRows, SuccessBanner } from '../components/Feedback.jsx'
import Value from '../components/Value.jsx'
import { REVIEW_NOTE_MAX_LENGTH } from '../lib/constants.js'
import { toAppError } from '../lib/errors.js'
import { formatTimestamp } from '../lib/format.js'
import { CURRENT_USER } from '../lib/session.js'
import { useDocuments } from '../state/DocumentsContext.jsx'

export default function DocumentDetail() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const { documents, status, error, refresh, applyReview } = useDocuments()

  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [reviewError, setReviewError] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  // Prevents a double click from sending two review updates.
  const savingRef = useRef(false)

  const record = useMemo(
    () => documents.find((doc) => doc.document_id === documentId),
    [documents, documentId]
  )

  async function sendReview(nextStatus) {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setReviewError(null)
    setConfirmation(null)

    const trimmedNote = note.trim()

    try {
      await submitReview({
        document_id: documentId,
        status: nextStatus,
        reviewed_by: CURRENT_USER.email,
        review_note: trimmedNote
      })
      // The displayed status updates once the review is accepted (SPEC.md F6).
      applyReview(documentId, {
        status: nextStatus,
        reviewed_by: CURRENT_USER.email,
        review_note: trimmedNote
      })
      setConfirmation(
        nextStatus === 'Reviewed'
          ? 'This document is marked as reviewed.'
          : 'This document is flagged as needing review.'
      )
      setNote('')
    } catch (caught) {
      setReviewError(toAppError(caught))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  if (status === 'loading' && documents.length === 0) {
    return (
      <div className="screen">
        <LoadingRows rows={6} />
      </div>
    )
  }

  if (status === 'error' && documents.length === 0) {
    return (
      <div className="screen">
        <ErrorBanner error={error} onRetry={refresh} retryLabel="Reload" />
      </div>
    )
  }

  if (!record) {
    return (
      <div className="screen">
        <EmptyState
          title="Document not found"
          message={`No document with the ID ${documentId} exists in the document log.`}
          action={
            <button type="button" className="button button--primary" onClick={() => navigate('/')}>
              Back to the document log
            </button>
          }
        />
      </div>
    )
  }

  const remaining = REVIEW_NOTE_MAX_LENGTH - note.length

  return (
    <div className="screen">
      <nav className="breadcrumb">
        <Link className="link" to="/">
          Document log
        </Link>
        <span aria-hidden="true">/</span>
        <span>{record.document_id}</span>
      </nav>

      <header className="screen__header">
        <div>
          <h1 className="screen__title">{record.file_name}</h1>
          <p className="screen__subtitle">
            Received {formatTimestamp(record.received_at)} · Document ID {record.document_id}
          </p>
        </div>
        <div className="screen__actions">
          <StatusBadge value={record.status} />
        </div>
      </header>

      <div className="detail-layout">
        <section className="card">
          <div className="card__header">
            <h2 className="card__title">Extracted information</h2>
          </div>
          <div className="card__body">
            <DocumentFields record={record} />
          </div>
        </section>

        <div className="detail-side">
          <section className="card">
            <div className="card__header">
              <h2 className="card__title">Human review</h2>
            </div>
            <div className="card__body">
              {confirmation && <SuccessBanner title="Review recorded" message={confirmation} />}
              <ErrorBanner
                error={reviewError}
                onRetry={() => sendReview('Reviewed')}
                retryLabel="Try again"
              />

              <label className="field-label" htmlFor="review-note">
                Review note <span className="field-label__optional">(optional)</span>
              </label>
              <textarea
                id="review-note"
                className="input input--textarea"
                rows={4}
                maxLength={REVIEW_NOTE_MAX_LENGTH}
                value={note}
                disabled={saving}
                placeholder="Add a short note for the record"
                onChange={(event) => setNote(event.target.value.slice(0, REVIEW_NOTE_MAX_LENGTH))}
              />
              <p className={`char-count${remaining <= 20 ? ' char-count--low' : ''}`}>
                {remaining} of {REVIEW_NOTE_MAX_LENGTH} characters remaining
              </p>

              <div className="review-actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => sendReview('Reviewed')}
                  disabled={saving || record.status === 'Reviewed'}
                >
                  {saving ? 'Saving…' : 'Mark as reviewed'}
                </button>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => sendReview('Needs Review')}
                  disabled={saving || record.status === 'Needs Review'}
                >
                  Flag as needs review
                </button>
              </div>

              {record.reviewed_by && (
                <dl className="mini-list mini-list--bordered">
                  <div>
                    <dt>Last reviewed by</dt>
                    <dd>{record.reviewed_by}</dd>
                  </div>
                  {record.review_note && (
                    <div>
                      <dt>Note on record</dt>
                      <dd>{record.review_note}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__header">
              <h2 className="card__title">Record</h2>
            </div>
            <div className="card__body">
              <dl className="mini-list">
                <div>
                  <dt>Document ID</dt>
                  <dd>{record.document_id}</dd>
                </div>
                <div>
                  <dt>File name</dt>
                  <dd>{record.file_name}</dd>
                </div>
                <div>
                  <dt>Received</dt>
                  <dd>{formatTimestamp(record.received_at)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <Value>{record.status}</Value>
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
