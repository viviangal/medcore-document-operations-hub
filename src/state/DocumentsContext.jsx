import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getDocuments, isDirectMode } from '../api/client.js'
import { getDirectApiKey } from '../lib/directApiKey.js'
import { toAppError } from '../lib/errors.js'

const DocumentsContext = createContext(null)

// Newest first (SPEC.md F4). Records without a usable timestamp keep their
// position at the end rather than being dropped.
function sortNewestFirst(documents) {
  return [...documents].sort((a, b) => {
    const left = new Date(a.received_at).getTime()
    const right = new Date(b.received_at).getTime()
    if (Number.isNaN(left) && Number.isNaN(right)) return 0
    if (Number.isNaN(left)) return 1
    if (Number.isNaN(right)) return -1
    return right - left
  })
}

export function DocumentsProvider({ children }) {
  const [documents, setDocuments] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setStatus((current) => (current === 'ready' ? 'ready' : 'loading'))
    setError(null)
    try {
      const result = await getDocuments()
      setDocuments(sortNewestFirst(result))
      setLastUpdated(new Date())
      setStatus('ready')
    } catch (caught) {
      setError(toAppError(caught))
      setStatus('error')
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    // In direct mode there is no runtime key yet on first mount until the
    // instructor enters one in DirectModeKeyBar (which calls refresh() itself
    // once saved) -- skip the auto-fetch so it doesn't fail with NOT_CONFIGURED.
    // Proxy/local mode always has a key of null and is unaffected.
    if (isDirectMode && !getDirectApiKey()) return
    refresh()
  }, [refresh])

  // Applies a review result locally so the status updates without a full reload.
  const applyReview = useCallback((documentId, patch) => {
    setDocuments((current) =>
      current.map((doc) => (doc.document_id === documentId ? { ...doc, ...patch } : doc))
    )
  }, [])

  const value = useMemo(
    () => ({ documents, status, error, lastUpdated, refresh, applyReview }),
    [documents, status, error, lastUpdated, refresh, applyReview]
  )

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>
}

export function useDocuments() {
  const context = useContext(DocumentsContext)
  if (!context) {
    throw new Error('useDocuments must be used inside DocumentsProvider')
  }
  return context
}
