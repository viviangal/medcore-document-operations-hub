import { isMissingValue } from '../lib/constants.js'

// "Not found" and "No action found" are real answers from the automation.
// They are styled differently so they read as a known gap, but they are never
// hidden, replaced or guessed (SPEC.md section 5).
export default function Value({ children }) {
  if (children === null || children === undefined || children === '') {
    return <span className="value value--empty">Not provided</span>
  }
  if (typeof children === 'string' && isMissingValue(children)) {
    return <span className="value value--missing">{children}</span>
  }
  return <span className="value">{children}</span>
}
