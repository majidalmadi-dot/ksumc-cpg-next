import type { Metadata } from 'next'
import './globals.css'
import KeyboardShortcuts from '@/components/KeyboardShortcuts'

export const metadata: Metadata = {
  title: 'KSUMC National CPG Authority',
  description: 'Clinical Practice Guideline Development Platform — King Saud University Medical City',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'KSUMC National CPG Authority',
    description: 'AI-powered clinical practice guideline development with GRADE methodology, PubMed evidence search, and framework compliance tracking.',
    siteName: 'KSUMC CPG Platform',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <KeyboardShortcuts />
      </body>
    </html>
  )
}
