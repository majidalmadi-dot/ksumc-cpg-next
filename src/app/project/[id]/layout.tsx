import Sidebar from '@/components/Sidebar'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main className="app-main" style={{ flex: 1, overflow: 'auto' }}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}
