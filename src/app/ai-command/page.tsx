'use client'

import { useState, useRef, useEffect } from 'react'
import Header from '@/components/Header'

const QUICK_WORKFLOWS = [
  { title: 'PICO Builder', desc: 'Structure your clinical question using PICO framework', icon: '⊕', prompt: 'Help me build a PICO question for my clinical guideline.', color: '#6366F1' },
  { title: 'Evidence Summary', desc: 'Generate rapid evidence synthesis from PubMed', icon: '◎', prompt: 'Help me develop a PubMed search strategy for a systematic review.', color: '#D97757' },
  { title: 'GRADE Assessment', desc: 'AI-assisted quality of evidence assessment', icon: '⬆', prompt: 'Guide me through a GRADE evidence quality assessment for my outcomes.', color: '#10B981' },
  { title: 'EtR Framework', desc: 'Build Evidence-to-Recommendation table', icon: '⬡', prompt: 'Help me complete an Evidence-to-Recommendation framework for my guideline.', color: '#F59E0B' },
  { title: 'Guideline Draft', desc: 'Auto-generate recommendation text from evidence', icon: '✦', prompt: 'Help me draft clinical recommendations using standard GRADE wording.', color: '#8B5CF6' },
]

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: '7px', height: '7px', borderRadius: '50%', background: '#D97757',
          animation: `typingBounce 1.4s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function AICommandPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg, timestamp: new Date() }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages.slice(-10) }),
      })
      const data = await res.json()
      const text = data.response || data.error || 'No response received.'
      setMessages([...newMessages, { role: 'assistant', content: text, timestamp: new Date() }])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }])
    }
    setLoading(false)
  }

  function handleQuickStart(prompt: string) {
    setInput(prompt)
  }

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
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>
      }
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
      <div className="fade-in" style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 73px)' }}>
        {/* Quick Workflows — empty state */}
        {messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.6s, transform 0.6s',
          }}>
            {/* Decorative icon */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', marginBottom: '20px',
              background: 'linear-gradient(135deg, #D97757, #E8956F)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', color: 'white', boxShadow: '0 8px 32px rgba(217,119,87,0.3)',
            }}>
              ✦
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A1A', marginBottom: '6px' }}>How can I help?</h2>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '32px', maxWidth: '400px', textAlign: 'center', lineHeight: 1.5 }}>
              Ask questions about clinical guideline development, GRADE methodology, or use a workflow below.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', maxWidth: '900px', width: '100%' }}>
              {QUICK_WORKFLOWS.map((wf, i) => (
                <button
                  key={wf.title}
                  onClick={() => handleQuickStart(wf.prompt)}
                  className="card-hover"
                  style={{
                    background: 'white', border: '1px solid #E5E5E0', borderRadius: '12px',
                    padding: '20px 16px', textAlign: 'left', cursor: 'pointer',
                    opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)',
                    transition: `opacity 0.5s ease ${0.2 + i * 0.08}s, transform 0.5s ease ${0.2 + i * 0.08}s, box-shadow 0.2s, border-color 0.2s`,
                    position: 'relative', overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = wf.color + '60' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E5E0' }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px', marginBottom: '12px',
                    background: wf.color + '15', color: wf.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', fontWeight: 700,
                  }}>
                    {wf.icon}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A', marginBottom: '4px' }}>{wf.title}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', lineHeight: 1.4 }}>{wf.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message History */}
        {messages.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', paddingRight: '8px' }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className="slide-up"
                style={{
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
                {msg.role === 'assistant' && (
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #D97757, #E8956F)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '12px', fontWeight: 700, marginTop: '2px',
                  }}>
                    AI
                  </div>
                )}
                <div>
                  <div style={{
                    maxWidth: '600px', padding: '12px 16px',
                    borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #D97757, #C4633F)' : 'white',
                    color: msg.role === 'user' ? 'white' : '#1A1A1A',
                    border: msg.role === 'assistant' ? '1px solid #E5E5E0' : 'none',
                    fontSize: '13px', lineHeight: '1.6',
                    boxShadow: msg.role === 'user' ? '0 2px 8px rgba(217,119,87,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
                  }}>
                    {msg.role === 'user' ? msg.content : renderContent(msg.content)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #1E1E2E, #2D2D3D)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '10px', fontWeight: 600, marginTop: '2px',
                  }}>
                    You
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #D97757, #E8956F)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '12px', fontWeight: 700,
                }}>
                  AI
                </div>
                <div style={{ padding: '14px 18px', borderRadius: '14px 14px 14px 2px', background: 'white', border: '1px solid #E5E5E0' }}>
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} style={{
          display: 'flex', gap: '12px',
          background: 'white', borderRadius: '14px', border: '1px solid #E5E5E0',
          padding: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#D97757', fontWeight: 700 }}>AI &rsaquo;</span>
            <input
              aria-label="Message the AI assistant"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about clinical guideline development..."
              style={{
                width: '100%', padding: '10px 14px 10px 46px', borderRadius: '8px',
                border: 'none', fontSize: '14px', outline: 'none',
                background: 'transparent', boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: '10px 24px', borderRadius: '10px', border: 'none',
              background: loading || !input.trim() ? '#E5E5E0' : 'linear-gradient(135deg, #D97757, #C4633F)',
              color: loading || !input.trim() ? '#9CA3AF' : 'white',
              fontSize: '14px', fontWeight: 600,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Send
          </button>
        </form>

        {/* Session stats */}
        {messages.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px', fontSize: '11px', color: '#9CA3AF' }}>
            <span>{messages.filter((m) => m.role === 'user').length} messages sent</span>
            <span>Session started {formatTime(messages[0].timestamp)}</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0) }
          30% { transform: translateY(-6px) }
        }
      `}</style>
    </>
  )
}
