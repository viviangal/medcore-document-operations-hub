import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AnalyticsIcon, BrandMarkIcon, DocumentLogIcon, SidebarWave, UploadIcon } from './components/Icons.jsx'
import { CURRENT_USER } from './lib/session.js'
import Analytics from './screens/Analytics.jsx'
import Dashboard from './screens/Dashboard.jsx'
import DocumentDetail from './screens/DocumentDetail.jsx'
import Upload from './screens/Upload.jsx'
import { DocumentsProvider } from './state/DocumentsContext.jsx'

const NAV_ITEMS = [
  { to: '/', label: 'Document log', end: true, icon: DocumentLogIcon },
  { to: '/upload', label: 'Upload document', end: false, icon: UploadIcon },
  { to: '/analytics', label: 'Analytics', end: false, icon: AnalyticsIcon }
]

// Sidebar user card — visual only. CURRENT_USER.email ("Vivian") remains the
// real reviewer/submitter identity sent to the backend as reviewed_by /
// submitted_by (see session.js); it is never read here. "Vivian Gal" and the
// "VG" initials are a cosmetic display label for the sidebar card only, so
// this visual pass cannot change what gets recorded in the Google Sheet.
const SIDEBAR_DISPLAY_NAME = 'Vivian Gal'
const SIDEBAR_INITIALS = 'VG'

export default function App() {
  return (
    <DocumentsProvider>
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">
              <BrandMarkIcon />
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
                <item.icon />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar__footer">
            <div className="sidebar__user-row">
              <span className="sidebar__avatar" aria-hidden="true">
                {SIDEBAR_INITIALS}
              </span>
              <span className="sidebar__user-text">
                <span className="sidebar__user-name">{SIDEBAR_DISPLAY_NAME}</span>
                <span className="sidebar__user-role">{CURRENT_USER.name}</span>
              </span>
            </div>
            <p className="sidebar__tagline">
              Documents
              <br />
              People forward
            </p>
            <SidebarWave />
          </div>
        </aside>

        <div className="main">
          <main className="content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/documents/:documentId" element={<DocumentDetail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </DocumentsProvider>
  )
}
