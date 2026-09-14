import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { isDirectMode, processDocument } from '../api/client.js'
import DocumentFields from '../components/DocumentFields.jsx'
import { ErrorBanner, SuccessBanner } from '../components/Feedback.jsx'
import { ACCEPTED_EXTENSIONS, MAX_FILE_MB } from '../lib/constants.js'
import { useHasDirectApiKey } from '../lib/directApiKey.js'
import { toAppError } from '../lib/errors.js'
import { readFileAsBase64, resolveMimeType, validateFile } from '../lib/fileValidation.js'
import { formatFileSize } from '../lib/format.js'
import { CURRENT_USER } from '../lib/session.js'
import { useDocuments } from '../state/DocumentsContext.jsx'

const NO_KEY_TITLE = 'Enter the classroom API key to enable this action'

const PHASE = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  DONE: 'done',
  ERROR: 'error'
}

export default function Upload() {
  const { refresh } = useDocuments()
  const hasDirectKey = useHasDirectApiKey()
  const blockedByNoKey = isDirectMode && !hasDirectKey
  const inputRef = useRef(null)
  // Guards against a second submission from a double click, which would create
  // a second spreadsheet row (SPEC.md F2).
  const submittingRef = useRef(false)

  const [file, setFile] = useState(null)
  const [phase, setPhase] = useState(PHASE.IDLE)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  // A visible counter keeps a long wait from looking frozen.
  useEffect(() => {
    if (phase !== PHASE.PROCESSING) return undefined
    setElapsed(0)
    const timer = setInterval(() => setElapsed((seconds) => seconds + 1), 1000)
    return () => clearInterval(timer)
  }, [phase])

  function selectFile(candidate) {
    setResult(null)
    const validationError = validateFile(candidate)
    if (validationError) {
      // Rejected in the browser. Nothing is sent (SPEC.md F1).
      setFile(validationError.keepFile ? candidate : null)
      setError(validationError)
      setPhase(PHASE.ERROR)
      return
    }
    setFile(candidate)
    setError(null)
    setPhase(PHASE.IDLE)
  }

  function handleInputChange(event) {
    const candidate = event.target.files?.[0]
    if (candidate) selectFile(candidate)
    // Allows re-selecting the same file after a reset.
    event.target.value = ''
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    const candidate = event.dataTransfer.files?.[0]
    if (candidate) selectFile(candidate)
  }

  function clearSelection() {
    setFile(null)
    setError(null)
    setResult(null)
    setPhase(PHASE.IDLE)
  }

  async function handleSend() {
    if (!file || submittingRef.current) return
    submittingRef.current = true
    setPhase(PHASE.PROCESSING)
    setError(null)
    setResult(null)

    try {
      const fileBase64 = await readFileAsBase64(file)
      const response = await processDocument({
        file_name: file.name,
        mime_type: resolveMimeType(file),
        file_base64: fileBase64,
        submitted_by: CURRENT_USER.email
      })
      setResult(response)
      setPhase(PHASE.DONE)
      // The automation has written a new row, so the document log is stale.
      refresh()
    } catch (caught) {
      const appError = toAppError(caught)
      setError(appError)
      setPhase(PHASE.ERROR)
      if (!appError.keepFile) setFile(null)
    } finally {
      submittingRef.current = false
    }
  }

  const isProcessing = phase === PHASE.PROCESSING

  return (
    <div className="screen">
      <header className="screen__header">
        <div>
          <h1 className="screen__title">Upload document</h1>
          <p className="screen__subtitle">
            Send one document for processing. Accepted formats: PDF, DOCX and TXT, up to {MAX_FILE_MB} MB.
          </p>
        </div>
      </header>

      <div className="upload-layout">
        <section className="card">
          <div className="card__header">
            <h2 className="card__title">1 · Choose a file</h2>
          </div>

          <div className="card__body">
            <div
              className={`dropzone${isDragging ? ' dropzone--active' : ''}${
                isProcessing ? ' dropzone--disabled' : ''
              }`}
              onDragOver={(event) => {
                event.preventDefault()
                if (!isProcessing) setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={isProcessing ? (event) => event.preventDefault() : handleDrop}
            >
              <div className="dropzone__icon" aria-hidden="true" />
              <p className="dropzone__title">Drag a document here</p>
              <p className="dropzone__hint">or</p>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => inputRef.current?.click()}
                disabled={isProcessing}
              >
                Browse files
              </button>
              <input
                ref={inputRef}
                type="file"
                className="visually-hidden"
                accept={ACCEPTED_EXTENSIONS.join(',')}
                onChange={handleInputChange}
              />
              <p className="dropzone__formats">PDF · DOCX · TXT</p>
            </div>

            {file && (
              <div className="file-card">
                <div className="file-card__icon" aria-hidden="true">
                  {(file.name.split('.').pop() ?? '').toUpperCase().slice(0, 4)}
                </div>
                <div className="file-card__details">
                  <p className="file-card__name" title={file.name}>
                    {file.name}
                  </p>
                  <p className="file-card__meta">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={clearSelection}
                  disabled={isProcessing}
                >
                  Remove
                </button>
              </div>
            )}

            <ErrorBanner error={error} onRetry={file ? handleSend : undefined} retryLabel="Retry" />
          </div>

          <div className="card__footer">
            <p className="card__footer-note">
              The file is validated in the browser before anything is sent.
            </p>
            <button
              type="button"
              className="button button--primary"
              onClick={handleSend}
              disabled={!file || isProcessing || blockedByNoKey}
              title={blockedByNoKey ? NO_KEY_TITLE : undefined}
            >
              {isProcessing ? 'Processing…' : 'Send for processing'}
            </button>
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <h2 className="card__title">2 · Result</h2>
          </div>

          <div className="card__body">
            {phase === PHASE.IDLE && !result && (
              <div className="placeholder">
                <p className="placeholder__title">No document processed yet</p>
                <p className="placeholder__message">
                  The extracted business information will appear here once processing finishes.
                </p>
              </div>
            )}

            {isProcessing && (
              <div className="processing" role="status" aria-live="polite">
                <div className="processing__spinner" aria-hidden="true" />
                <p className="processing__title">Processing document</p>
                <p className="processing__message">
                  Reading the document and extracting the business information. This can take up to 90
                  seconds — you can stay on this screen.
                </p>
                <p className="processing__timer">{elapsed}s elapsed</p>
                <div className="processing__bar" aria-hidden="true">
                  <span />
                </div>
              </div>
            )}

            {phase === PHASE.ERROR && !isProcessing && !result && (
              <div className="placeholder">
                <p className="placeholder__title">Nothing was processed</p>
                <p className="placeholder__message">
                  Correct the problem on the left and send the document again.
                </p>
              </div>
            )}

            {result && !isProcessing && (
              <>
                <SuccessBanner
                  title="Document processed"
                  message={
                    result.notification_sent
                      ? 'The record was added to the document log and a notification was sent.'
                      : 'The record was added to the document log.'
                  }
                />
                <div className="result-head">
                  <p className="result-head__name">{result.file_name}</p>
                </div>
                <DocumentFields record={{ ...result.fields, file_link: result.file_link }} />
                <div className="result-actions">
                  <Link className="button button--secondary" to={`/documents/${result.document_id}`}>
                    Open document detail
                  </Link>
                  <button type="button" className="button button--ghost" onClick={clearSelection}>
                    Process another document
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
