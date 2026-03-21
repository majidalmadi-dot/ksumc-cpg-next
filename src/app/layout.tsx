import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KSUMC National CPG Authority',
  description: 'Clinical Practice Guideline Development Platform — King Saud University Medical City',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
