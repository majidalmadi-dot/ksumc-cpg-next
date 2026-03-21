import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import KeyboardShortcuts from '@/components/KeyboardShortcuts'
import { WebVitals } from '@/components/WebVitals'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#D97757',
}

export const metadata: Metadata = {
  title: {
    default: 'KSUMC National CPG Authority',
    template: '%s | KSUMC CPG Platform',
  },
  description: 'Clinical Practice Guideline Development Platform — King Saud University Medical City',
  icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
  manifest: '/manifest.json',
  metadataBase: new URL('https://ksumc-cpg-next.vercel.app'),
  applicationName: 'KSUMC CPG Platform',
  openGraph: {
    title: 'KSUMC National CPG Authority',
    description: 'AI-powered clinical practice guideline development with GRADE methodology, PubMed evidence search, and framework compliance tracking.',
    siteName: 'KSUMC CPG Platform',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif' }}>
        {children}
        <KeyboardShortcuts />
        <WebVitals />
      </body>
    </html>
  )
}
