'use client'

import { useState, useRef, useEffect } from 'react'
import Header from '@/components/Header'

const QUICK_WORKFLOWS = [
  { title: 'PICO Builder', desc: 'Structure your clinical question using PICO framework', icon: '⊕', prompt: 'Help me build a PICO question for my clinical guideline.' },
  { title: 'Evidence Summary', desc: 'Generate rapid evidence synthesis from PubMed', icon: '◎', prompt: 'Help me develop a PubMed search strategy for a systematic review.' },
  { title: 'GRADE Assessment', desc: 'AI-assisted quality of evidence assessment', icon: '⬆', prompt: 'Guide me through a GRADE evidence quality assessment for my outcomes.' },
  { title: 'EtR Framework', desc: 'Build Evidence-to-Recommendation table', icon: '⬡', prompt: 'Help me complete an Evidence-to-Recommendation framework for my guideline.' },
  { title: 'Guideline Draft', desc: 'Auto-generate recommendation text from evidence', icon: '✦', prompt: 'Help me draft clinical recommendations using standard GRADE wording.' },
]

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AICommandPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: messages.slice(-10),
        }),
      })

      const data = await res.json()
      const text = data.response || data.error || 'No response received.'

      setMessages([...newMessages, { role: 'assistant', content: text }])
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }])
    }
    setLoading(false)
  }

  function handleQuickStart(prompt: string) {
    setInput(prompt)
  }

  // Simple markdown-like rendering
  function renderContent(text: string) {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []

    lines.forEach((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        elements.push(<div key={i} style={{ fontWeight: 700, fontSize: '14px', marginTop: '12px', marginBottom: '4px' }}>{line.replace(/\*\*/g, '')}</div>)
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(<div key={i} style={{ paddingLeft: '16px', marginBottom: '2px' }}>• {renderInlineFormatting(line.slice(2))}</div>)
      } else if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^(\d+)\.\s/)?.[1]
        elements.push(<div key={i} style={{ paddingLeft: '16px', marginBottom: '2px' }}>{num}. {renderInlineFormatting(line.replace(/^\d+\.\s/, ''))}</div>)
      } else if (line.startsWith('```')) {
        // skip code fence markers
      } else if (line.trim() === '') {
        elements.push(<div key={i} style={{ height: '8px' }} />)
      } else {
        elements.push(<div key={i} style={{ marginBottom: '4px' }}>{renderInlineFormatting(line)}</div>)
      }
    })

    return elements
  }

  function renderInlineFormatting(text: string): React.ReactNode {
    // Bold
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>
      }
      // Inline code
      const codeParts = part.split(/(`[^`]+`)/g)
      return codeParts.map((cp, j) => {
        if (cp.startsWith('`') && cp.endsWith('`')) {
          return <code key={`${i}-${j}`} style={{ background: '#F3F4F6', padding: '1px 4px', borderRadius: '3px', fontSize: '12px', fontFamily: 'monospace' }}>{cp.slice(1, -1)}</code>
        }
        return cp
      })
    })
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
                  onClick={() => handleQuickStart(wf.prompt)}
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
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-card)',
                  color: msg.role === 'user' ? 'white' : 'var(--text)',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  fontSize: '13px',
                  lineHeight: '1.6',
                }}
              >
                {msg.role === 'user' ? msg.content : renderContent(msg.content)}
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
          <div ref={messagesEndRef} />
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
