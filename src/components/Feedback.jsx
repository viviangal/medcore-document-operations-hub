// Shared error / empty / loading presentation. Every message here comes from
// the error catalog, so the user never sees a stack trace (SPEC.md F7).

export function ErrorBanner({ error, onRetry, retryLabel = 'Try again' }) {
  if (!error) return null
  return (
    <div className="banner banner--error" role="alert">
      <div className="banner__body">
        <p className="banner__title">{error.title}</p>
        <p className="banner__message">{error.message}</p>
      </div>
      {onRetry && error.retryable && (
        <button type="button" className="button button--ghost" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  )
}

export function SuccessBanner({ title, message, children }) {
  return (
    <div className="banner banner--success" role="status">
      <div className="banner__body">
        <p className="banner__title">{title}</p>
        {message && <p className="banner__message">{message}</p>}
      </div>
      {children}
    </div>
  )
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state__mark" aria-hidden="true" />
      <p className="empty-state__title">{title}</p>
      {message && <p className="empty-state__message">{message}</p>}
      {action}
    </div>
  )
}

export function LoadingRows({ rows = 6 }) {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton__row" />
      ))}
    </div>
  )
}
