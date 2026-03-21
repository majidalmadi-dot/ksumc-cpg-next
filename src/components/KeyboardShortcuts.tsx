'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Shortcut {
  key: string
  label: string
  description: string
  action: () => void
  mod?: boolean // Requires Ctrl/Cmd
}

export default function KeyboardShortcuts() {
  const router = useRouter()
  const [helpOpen, setHelpOpen] = useState(false)

  const shortcuts: Shortcut[] = [
    { key: 'd', label: 'G → D', description: 'Go to Dashboard', action: () => router.push('/dashboard') },
    { key: 'l', label: 'G → L', description: 'Go to Lifecycle Tracker', action: () => router.push('/lifecycle') },
    { key: 'g', label: 'G → G', description: 'Go to GRADE Workflow', action: () => router.push('/grade') },
    { key: 'e', label: 'G → E', description: 'Go to Evidence Search', action: () => router.push('/evidence') },
    { key: 'a', label: 'G → A', description: 'Go to AI Command Center', action: () => router.push('/ai-command') },
    { key: 'f', label: 'G → F', description: 'Go to Frameworks', action: () => router.push('/frameworks') },
    { key: 't', label: 'G → T', description: 'Go to Audit Trail', action: () => router.push('/audit') },
    { key: 's', label: 'G → S', description: 'Go to Settings', action: () => router.push('/settings') },
  ]

  const [gPrefix, setGPrefix] = useState(false)
  const [gTimer, setGTimer] = useState<NodeJS.Timeout | null>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) {
        return
      }

      // ? or Shift+/ → toggle help
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault()
        setHelpOpen((prev) => !prev)
        return
      }

      // Escape → close help
      if (e.key === 'Escape' && helpOpen) {
        setHelpOpen(false)
        return
      }

      // Ctrl/Cmd+K → focus search (AI Command)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        router.push('/ai-command')
        return
      }

      // "g" prefix for navigation
      if (!gPrefix && e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setGPrefix(true)
        if (gTimer) clearTimeout(gTimer)
        const timer = setTimeout(() => setGPrefix(false), 1500)
        setGTimer(timer)
        return
      }

      if (gPrefix) {
        setGPrefix(false)
        if (gTimer) clearTimeout(gTimer)
        const shortcut = shortcuts.find((s) => s.key === e.key)
        if (shortcut) {
          e.preventDefault()
          shortcut.action()
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gPrefix, helpOpen, router]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    return () => {
      if (gTimer) clearTimeout(gTimer)
    }
  }, [gTimer])

  if (!helpOpen) {
    return (
      <>
        {/* Floating hint */}
        <div style={{
          position: 'fixed', bottom: '16px', right: '16px', zIndex: 900,
          padding: '6px 12px', borderRadius: '8px',
          background: 'rgba(30,30,46,0.85)', color: 'rgba(255,255,255,0.7)',
          fontSize: '11px', cursor: 'pointer', backdropFilter: 'blur(8px)',
          transition: 'opacity 0.2s',
        }} onClick={() => setHelpOpen(true)}>
          Press <kbd style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace', fontSize: '11px' }}>?</kbd> for shortcuts
        </div>
        {gPrefix && (
          <div style={{
            position: 'fixed', bottom: '50px', right: '16px', zIndex: 901,
            padding: '6px 14px', borderRadius: '8px',
            background: '#D97757', color: 'white',
            fontSize: '12px', fontWeight: 600, animation: 'slideIn 0.15s ease',
          }}>
            g → waiting for key...
          </div>
        )}
      </>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setHelpOpen(false)} />
      <div style={{
        position: 'relative', background: 'white', borderRadius: '14px',
        padding: '28px', width: '100%', maxWidth: '480px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#1E1E2E' }}>Keyboard Shortcuts</h2>
          <button onClick={() => setHelpOpen(false)} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
        </div>

        {/* General */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>General</div>
          <ShortcutRow keys={['?']} desc="Show / hide this panel" />
          <ShortcutRow keys={['Esc']} desc="Close modal or panel" />
          <ShortcutRow keys={['⌘', 'K']} desc="Quick AI Command" />
        </div>

        {/* Navigation */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Navigation <span style={{ fontWeight: 400, textTransform: 'none' }}>(press G then key)</span>
          </div>
          {shortcuts.map((s) => (
            <ShortcutRow key={s.key} keys={['G', s.key.toUpperCase()]} desc={s.description} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ShortcutRow({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
      <span style={{ fontSize: '13px', color: '#374151' }}>{desc}</span>
      <div style={{ display: 'flex', gap: '4px' }}>
        {keys.map((k, i) => (
          <span key={i}>
            <kbd style={{
              display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
              background: '#F5F5F0', border: '1px solid #E5E5E0',
              fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#374151',
              minWidth: '22px', textAlign: 'center',
            }}>
              {k}
            </kbd>
            {i < keys.length - 1 && <span style={{ color: '#D1D5DB', margin: '0 2px', fontSize: '12px' }}>+</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
