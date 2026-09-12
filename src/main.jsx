import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'

// import.meta.env.BASE_URL mirrors vite.config.js's `base` automatically:
// "/" in local dev, "/medcore-document-operations-hub/" in the GitHub Pages
// production build (see vite.config.js). Passing it as basename is the
// standard Vite + React Router pairing, so every <Link>/<NavLink>/navigate()
// call keeps working under either path without any route name changing.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
