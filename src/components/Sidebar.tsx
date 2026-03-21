'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  href: string
  icon: string
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: '◉' },
      { label: 'Lifecycle Tracker', href: '/lifecycle', icon: '↻' },
    ],
  },
  {
    title: 'Development',
    items: [
      { label: 'GRADE Workflow', href: '/grade', icon: '⬆' },
      { label: 'Evidence Search', href: '/evidence', icon: '⊕' },
      { label: 'AI Command Center', href: '/ai-command', icon: '✦' },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Active Guidelines', href: '/guidelines', icon: '▤' },
      { label: 'Frameworks', href: '/frameworks', icon: '⬡' },
      { label: 'PHPSA', href: '/phpsa', icon: '◈' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Audit Trail', href: '/audit', icon: '⏱' },
      { label: 'Settings', href: '/settings', icon: '⚙' },
    ],
  },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close mobile sidebar on escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <>
      {/* Mobile hamburger */}
      <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Mobile overlay */}
      <div className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)} />

      <aside
        className={`app-sidebar ${mobileOpen ? 'open' : ''}`}
        style={{
          width: collapsed ? '64px' : '260px',
          background: 'linear-gradient(180deg, #2D2D3D, #1E1E2E)',
          transition: 'width 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div style={{ padding: collapsed ? '16px 8px' : '20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {!collapsed && (
            <div>
              <div style={{ color: '#D97757', fontWeight: 700, fontSize: '15px' }}>KSUMC</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' }}>National CPG Authority</div>
            </div>
          )}
          {collapsed && <div style={{ color: '#D97757', fontWeight: 700, fontSize: '18px', textAlign: 'center' }}>K</div>}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} style={{ marginBottom: '8px' }}>
              {!collapsed && (
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 20px 4px' }}>
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: collapsed ? '10px 0' : '9px 20px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                      background: isActive ? 'rgba(217,119,87,0.2)' : 'transparent',
                      borderLeft: isActive ? '3px solid #D97757' : '3px solid transparent',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            padding: '12px',
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {collapsed ? '→' : '← Collapse'}
        </button>
      </aside>
    </>
  )
}
