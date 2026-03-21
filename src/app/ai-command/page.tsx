'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import { sanitize } from '@/lib/sanitize'

const QUICK_WORKFLOWS = [
  { title: 'PICO Builder', desc: 'Structure your clinical question using PICO framework', icon: '⊕' },
  { title: 'Evidence Summary', desc: 'Generate rapid evidence synthesis from PubMed', icon: '◎' },
  { title: 'GRADE Assessment', desc: 'AI-assisted quality of evidence assessment', icon: '⬆' },
  { title: 'EtR Framework', desc: 'Build Evidence-to-Recommendation table', icon: '⬡' },
  { title: 'Guideline Draft', desc: 'Auto-generate recommendation text from evidence', icon: '✦' },
]

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AICommandPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    // TODO: Wire to Gemini Edge Function
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `<p>I received your request: <strong>"${userMsg}"</strong></p><p>The AI engine will be connected to the Gemini proxy via the Supabase Edge Function. This is a placeholder response demonstrating the command center interface.</p><p>Available capabilities include: PICO question structuring, evidence search and synthesis, GRADE methodology assessment, recommendation drafting, and guideline quality scoring.</p>`,
        },
      ])
      setLoading(false)
    }, 1500)
  }

  function handleQuickStart(title: string) {
    setInput(`Help me with: ${title}`)
  }

  return (
    <>
      <Header title="AI Command Center" subtitle="Gemini-powered clinical guideline assistant" />
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 73px)' }}>
        {/* Quick Workflows */}
        {messages.length === 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {QUICK_WORKFLOWS.map((wf) => (
                <button
                  key={wf.title}
                  onClick={() => handleQuickStart(wf.title)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '8px' }}>{wf.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{wf.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{wf.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message History */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                marginBottom: '16px',
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-card)',
                  color: msg.role === 'user' ? 'white' : 'var(--text)',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  fontSize: '13px',
                  lineHeight: '1.6',
                }}
                dangerouslySetInnerHTML={
                  msg.role === 'assistant' ? { __html: sanitize(msg.content) } : undefined
                }
              >
                {msg.role === 'user' ? msg.content : undefined}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
              <div style={{ padding: '12px 16px', borderRadius: '12px 12px 12px 0', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-light)' }}>
                <span style={{ display: 'inline-block', animation: 'pulse 1.5s infinite' }}>Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--primary)', fontWeight: 700 }}>AI &rsaquo;</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about clinical guideline development..."
              style={{
                width: '100%',
                padding: '12px 14px 12px 46px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                fontSize: '14px',
                outline: 'none',
                background: 'var(--bg-card)',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--primary)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.6 : 1,
            }}
          >
            Send
          </button>
        </form>
      </div>
    </>
  )
}
