'use client'

import { useEffect } from 'react'

export function WebVitals() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Use the built-in Performance API to report core web vitals
    const reportMetric = (name: string, value: number) => {
      // In production, this would send to an analytics endpoint
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Web Vitals] ${name}: ${Math.round(value)}ms`)
      }
    }

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      if (lastEntry) reportMetric('LCP', lastEntry.startTime)
    })

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if ('processingStart' in entry) {
          reportMetric('FID', (entry as PerformanceEventTiming).processingStart - entry.startTime)
        }
      }
    })

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0
      for (const entry of list.getEntries()) {
        if (!(entry as LayoutShift).hadRecentInput) {
          clsValue += (entry as LayoutShift).value
        }
      }
      if (clsValue > 0) reportMetric('CLS', clsValue * 1000) // scale for readability
    })

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
      fidObserver.observe({ type: 'first-input', buffered: true })
      clsObserver.observe({ type: 'layout-shift', buffered: true })
    } catch {
      // Observer types not supported in this browser
    }

    return () => {
      lcpObserver.disconnect()
      fidObserver.disconnect()
      clsObserver.disconnect()
    }
  }, [])

  return null
}

interface LayoutShift extends PerformanceEntry {
  hadRecentInput: boolean
  value: number
}
