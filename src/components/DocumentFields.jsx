import { TypeTag, UrgencyBadge } from './Badges.jsx'
import Value from './Value.jsx'

// The eight extracted fields required by SPEC.md F3, shown in the same order on
// the upload result and on the document detail screen.
export default function DocumentFields({ record }) {
  return (
    <dl className="field-grid">
      <div className="field">
        <dt>Document type</dt>
        <dd>
          <TypeTag value={record.document_type} />
        </dd>
      </div>

      <div className="field">
        <dt>Sender / company</dt>
        <dd>
          <Value>{record.sender_or_company}</Value>
        </dd>
      </div>

      <div className="field">
        <dt>Urgency</dt>
        <dd>
          <UrgencyBadge value={record.urgency} />
        </dd>
      </div>

      <div className="field">
        <dt>Department</dt>
        <dd>
          <Value>{record.department}</Value>
        </dd>
      </div>

      <div className="field field--wide">
        <dt>Summary</dt>
        <dd>
          <Value>{record.summary}</Value>
        </dd>
      </div>

      <div className="field field--wide">
        <dt>Requested action</dt>
        <dd>
          <Value>{record.requested_action}</Value>
        </dd>
      </div>

      <div className="field">
        <dt>Deadline</dt>
        <dd>
          <Value>{record.deadline}</Value>
        </dd>
      </div>

      <div className="field">
        <dt>File</dt>
        <dd>
          {record.file_link ? (
            <a className="link" href={record.file_link} target="_blank" rel="noreferrer">
              Open in Google Drive
            </a>
          ) : (
            <Value>{null}</Value>
          )}
        </dd>
      </div>
    </dl>
  )
}
