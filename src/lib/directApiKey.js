// Session-only storage for the classroom n8n API key used by GitHub Pages
// "direct" mode (see src/api/client.js). This value never touches disk: it
// lives in sessionStorage (cleared when the tab/browser closes) with an
// in-memory fallback for browsers that block storage (e.g. private
// browsing). It is never written to localStorage, never logged, and never
// included in any error message — callers only ever get the raw string
// back to attach as a header, or null.

const STORAGE_KEY = 'medcore.directApiKey'

let memoryKey = null

export function getDirectApiKey() {
  if (memoryKey) return memoryKey
  try {
    return sessionStorage.getItem(STORAGE_KEY) || null
  } catch {
    return null
  }
}

export function setDirectApiKey(key) {
  const trimmed = (key || '').trim()
  memoryKey = trimmed || null

  try {
    if (trimmed) {
      sessionStorage.setItem(STORAGE_KEY, trimmed)
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // sessionStorage unavailable (private mode, etc.) — the in-memory copy
    // above still lets the current tab work for the rest of this session.
  }
}

export function clearDirectApiKey() {
  setDirectApiKey(null)
}