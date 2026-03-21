import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Start New Guideline',
  description: 'Begin an AI-guided clinical practice guideline development workflow',
}

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return children
}
