// Session-only storage for the classroom n8n API key used by GitHub Pages
// "direct" mode (see src/api/client.js). This value never touches disk: it
// lives in sessionStorage (cleared when the tab/browser closes) with an
// in-memory fallback for browsers that block storage (e.g. private
// browsing). It is never written to localStorage, never logged, and never
// included in any error message — callers only ever get the raw string
// back to attach as a header, or null.

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'medcore.directApiKey'

let memoryKey = null

// Sibling components (Dashboard, Upload, DocumentDetail) need to know the
// instant the key is saved or cleared in DirectModeKeyBar, without a shared
// context provider. A tiny subscriber list plus useSyncExternalStore (below)
// is the smallest way to make that reactive across components.
const listeners = new Set()

function notifyDirectApiKeyChange() {
  for (const listener of listeners) listener()
}

export function subscribeDirectApiKey(onChange) {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

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

  notifyDirectApiKeyChange()
}

export function clearDirectApiKey() {
  setDirectApiKey(null)
}

// True as soon as a runtime key exists, and re-renders the calling component
// the instant one is saved or cleared anywhere in the app (DirectModeKeyBar).
export function useHasDirectApiKey() {
  return useSyncExternalStore(subscribeDirectApiKey, () => Boolean(getDirectApiKey()))
}