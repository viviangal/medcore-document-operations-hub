import { useState } from 'react'
import {
  clearDirectApiKey,
  getDirectApiKey,
  setDirectApiKey,
} from '../lib/directApiKey.js'
import { useDocuments } from '../state/DocumentsContext.jsx'

// Shown only in GitHub Pages "direct" mode (App.jsx checks isDirectMode
// before rendering this at all — proxy/local dev never mounts it). Lets the
// instructor supply the low-value classroom n8n API key at runtime so this
// browser tab can reach the hosted n8n webhooks directly. The key is kept
// only in sessionStorage/memory (see lib/directApiKey.js) — never written
// to source, never logged, never shown again once saved.
export default function DirectModeKeyBar() {
  const { refresh } = useDocuments()
  const [hasKey, setHasKey] = useState(() => Boolean(getDirectApiKey()))
  const [draft, setDraft] = useState('')

  function handleSave(event) {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed) return

    setDirectApiKey(trimmed)
    setDraft('')
    setHasKey(true)
    refresh()
  }

  function handleClear() {
    clearDirectApiKey()
    setHasKey(false)
    setDraft('')
  }

  if (hasKey) {
    return (
      <div className="mode-strip" role="status">
        <div className="direct-key-status">
          <span>This hosted demo is connected with a classroom API key for this browser session.</span>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={handleClear}
          >
            Clear key
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mode-strip" role="status">
      <form className="direct-key-form" onSubmit={handleSave}>
        <span>
          This hosted demo talks to n8n directly. Enter the classroom API key to connect this
          browser tab — it is kept only for this session and is never saved to disk.
        </span>

        <input
          type="password"
          autoComplete="off"
          className="input"
          placeholder="Classroom API key"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />

        <button
          type="submit"
          className="button button--secondary button--small"
        >
          Save for this session
        </button>
      </form>
    </div>
  )
}