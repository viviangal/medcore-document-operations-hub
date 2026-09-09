// Badges present contract values visually. The underlying text is always the
// exact value returned by the automation (CONTRACT.md section 10).

const URGENCY_CLASS = {
  High: 'badge badge--urgency-high',
  Medium: 'badge badge--urgency-medium',
  Low: 'badge badge--urgency-low'
}

const STATUS_CLASS = {
  Processed: 'badge badge--status-processed',
  Reviewed: 'badge badge--status-reviewed',
  'Needs Review': 'badge badge--status-needs-review'
}

export function UrgencyBadge({ value }) {
  if (!value) return <span className="value value--missing">—</span>
  const className = URGENCY_CLASS[value] ?? 'badge badge--neutral'
  return (
    <span className={className}>
      <span className="badge__dot" aria-hidden="true" />
      {value}
    </span>
  )
}

export function StatusBadge({ value }) {
  if (!value) return <span className="value value--missing">—</span>
  return <span className={STATUS_CLASS[value] ?? 'badge badge--neutral'}>{value}</span>
}

export function TypeTag({ value }) {
  if (!value) return <span className="value value--missing">—</span>
  return <span className="type-tag">{value}</span>
}
