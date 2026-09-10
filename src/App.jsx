import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { isReviewMocked } from './api/client.js'
import { CURRENT_USER } from './lib/session.js'
import Dashboard from './screens/Dashboard.jsx'
import DocumentDetail from './screens/DocumentDetail.jsx'
import Upload from './screens/Upload.jsx'
import { DocumentsProvider } from './state/DocumentsContext.jsx'

const NAV_ITEMS = [
  { to: '/', label: 'Document log', end: true },
  { to: '/upload', label: 'Upload document', end: false }
]

export default function App() {
  return (
    <DocumentsProvider>
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">
              MC
            </span>
            <span className="brand__text">
              <span className="brand__name">MedCore</span>
              <span className="brand__product">Document Operations Hub</span>
            </span>
          </div>

          <nav className="nav" aria-label="Main">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav__item${isActive ? ' nav__item--active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar__footer">
            <p className="sidebar__user">{CURRENT_USER.name}</p>
            <p className="sidebar__email">{CURRENT_USER.email}</p>
          </div>
        </aside>

        <div className="main">
          {isReviewMocked() && (
            <div className="mode-strip" role="status">
              The document log and document processing are connected to the document service. Marking
              documents as reviewed still uses demo data for now.
            </div>
          )}

          <main className="content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/documents/:documentId" element={<DocumentDetail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </DocumentsProvider>
  )
}
