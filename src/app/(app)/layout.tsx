import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main
        id="main-content"
        className="app-main"
        style={{ flex: 1, overflow: 'auto' }}
      >
        {children}
      </main>
    </div>
  )
}
