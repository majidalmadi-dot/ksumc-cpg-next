'use client'

import { memo, useState, useEffect } from 'react'

interface HeaderProps {
  title: string
  subtitle?: string
}

function HeaderComponent({ title, subtitle }: HeaderProps) {
  const [dateStr, setDateStr] = useState('')
  const [isoDate, setIsoDate] = useState('')

  useEffect(() => {
    const now = new Date()
    setDateStr(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }))
    setIsoDate(now.toISOString().slice(0, 10))
  }, [])

  return (
    <header
      role="banner"
      style={{
        padding: '20px 32px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: '13px', color: 'var(--text-light)', margin: '4px 0 0' }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <time style={{ fontSize: '12px', color: 'var(--text-light)' }} dateTime={isoDate}>
          {dateStr}
        </time>
        <div
          aria-label="User profile"
          style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 600,
          }}
        >
          MA
        </div>
      </div>
    </header>
  )
}

export default memo(HeaderComponent)
