import Sidebar from '@/components/Sidebar'
import AIWorkflowWrapper from '@/components/AIWorkflowWrapper'
import PICONavigator from '@/components/PICONavigator'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main
        id="main-content"
        className="app-main"
        style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}
      >
        <AIWorkflowWrapper>
          {children}
          <PICONavigator />
        </AIWorkflowWrapper>
      </main>
    </div>
  )
}
