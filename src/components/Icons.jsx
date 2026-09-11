// Small inline SVG icons for the sidebar only (SPEC.md/CONTRACT.md are
// unaffected). No icon library is installed (see package.json), so these are
// hand-drawn, stroke-based, 24x24 viewBox glyphs that inherit their color
// from the surrounding text via currentColor — nav item color/state changes
// (see .nav__item svg in styles.css) automatically recolor them.

const ICON_PROPS = {
  viewBox: '0 0 24 24',
  width: 20,
  height: 20,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true'
}

export function DocumentLogIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
      <path d="M9 12.5h6M9 16h6M9 9h2" />
    </svg>
  )
}

export function UploadIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M7 18h10a4 4 0 0 0 .6-7.95 5.5 5.5 0 0 0-10.79.4A3.5 3.5 0 0 0 7 18Z" />
      <path d="M12 15V9m0 0-2.5 2.5M12 9l2.5 2.5" />
    </svg>
  )
}

export function AnalyticsIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M5 19v-7M12 19V5M19 19v-4" />
    </svg>
  )
}

// The sidebar's brand mark: four rounded rectangles arranged in a pinwheel
// cross — an abstract medical-tech mark, not a literal first-aid symbol —
// filled with its own teal-to-blue gradient so it reads clearly at ~38px
// directly on the dark sidebar background (no background tile needed).
export function BrandMarkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="38" height="38" aria-hidden="true">
      <defs>
        <linearGradient id="brandMarkGradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="1" stopColor="#1a6fa8" />
        </linearGradient>
      </defs>
      <rect x="8.5" y="1" width="7" height="8.5" rx="3" fill="url(#brandMarkGradient)" />
      <rect x="8.5" y="14.5" width="7" height="8.5" rx="3" fill="url(#brandMarkGradient)" />
      <rect x="1" y="8.5" width="8.5" height="7" rx="3" fill="url(#brandMarkGradient)" />
      <rect x="14.5" y="8.5" width="8.5" height="7" rx="3" fill="url(#brandMarkGradient)" />
    </svg>
  )
}

// One subtle decorative flourish for the lower sidebar, behind the user
// info and tagline text. It sits inside .sidebar__footer's own
// overflow:hidden box, anchored to the bottom, so it can never overlap the
// text sitting above it (see styles.css for the positioning/opacity rules).
export function SidebarWave() {
  return (
    <svg
      className="sidebar__footer-wave"
      viewBox="0 0 200 40"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 28 C 34 8, 62 40, 96 20 S 158 2, 200 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="M0 35 C 40 20, 80 40, 118 24 S 168 10, 200 30"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.6"
      />
    </svg>
  )
}
