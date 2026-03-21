'use client'

import Sidebar from '@/components/Sidebar'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function SRLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F5F0' }}>
      <Sidebar />
      <ErrorBoundary>
        <main className="app-main" style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {children}
        </main>
      </ErrorBoundary>
    </div>
  )
}
