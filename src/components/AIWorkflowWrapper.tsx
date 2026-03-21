'use client'

import { AIWorkflowProvider } from '@/lib/ai-workflow'
import AIWorkflowBar from '@/components/AIWorkflowBar'

export default function AIWorkflowWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AIWorkflowProvider>
      <AIWorkflowBar />
      {children}
    </AIWorkflowProvider>
  )
}
