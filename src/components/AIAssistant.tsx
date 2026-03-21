'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AIAssistantProps {
  context: string          // System context describing what the user is working on
  placeholder?: string
  quickActions?: { label: string; prompt: string }[]
  onSuggestion?: (text: string) => void  // Callback when user wants to apply a suggestion
  compact?: boolean
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#F3F4F6;padding:1px 4px;border-radius:3px;font-size:11px">$1</code>')
    .replace(/^- (.+)$/gm, '<div style="padding-left:12px">• $1</div>')
    .replace(/^\d+\. (.+)$/gm, '<div style="padding-left:12px">$&</div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

export default function AIAssistant({ context, placeholder, quickActions, onSuggestion, compact }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[Context: ${context}]\n\n${text}`,
          history: messages.slice(-6),
        }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response || 'No response.' }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    }
    setLoading(false)
  }, [context, loading, messages])

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          padding: '8px 14px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #D97757, #C4643F)',
          color: 'white', border: 'none', fontSize: '12px', fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          boxShadow: '0 2px 8px rgba(217,119,87,0.3)',
        }}
      >
        <span style={{ fontSize: '14px' }}>✦</span> AI Assistant
        {messages.length > 0 && (
          <span style={{ background: 'rgba(255,255,255,0.3)', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>
            {messages.length}
          </span>
        )}
      </button>
    )
  }

  const panelStyle: React.CSSProperties = compact
    ? { background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', overflow: 'hidden' }
    : { background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', overflow: 'hidden', position: 'sticky', top: '24px', alignSelf: 'start' }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #D97757, #C4643F)', color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>✦</span>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>AI Assistant</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setCollapsed(true)}
            style={{ background: 'none', border: 'none', color: 'white', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}
          >
            ▾
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      {quickActions && quickActions.length > 0 && messages.length === 0 && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Quick Actions
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                onClick={() => sendMessage(qa.prompt)}
                style={{
                  padding: '4px 10px', borderRadius: '14px',
                  border: '1px solid #E5E5E0', background: '#FAF9F6',
                  fontSize: '11px', color: '#374151', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {qa.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ maxHeight: compact ? '250px' : '350px', overflowY: 'auto', padding: '12px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px 8px', color: '#9CA3AF', fontSize: '12px', lineHeight: 1.5 }}>
            Ask me anything about this workflow. I can help with methodology, suggest improvements, or draft content.
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: '10px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px',
              fontSize: '10px', fontWeight: 600, color: msg.role === 'user' ? '#374151' : '#D97757',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {msg.role === 'user' ? '◉ You' : '✦ AI'}
            </div>
            <div
              style={{
                fontSize: '12px', lineHeight: 1.6, color: '#374151',
                background: msg.role === 'user' ? '#F5F5F0' : '#FEF8F5',
                padding: '8px 12px', borderRadius: '8px',
              }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
            />
            {msg.role === 'assistant' && onSuggestion && (
              <button
                onClick={() => onSuggestion(msg.content)}
                style={{
                  marginTop: '4px', padding: '2px 10px', borderRadius: '4px',
                  border: '1px solid #E5E5E0', background: 'white',
                  fontSize: '10px', color: '#6B7280', cursor: 'pointer',
                }}
              >
                Apply Suggestion →
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '12px', color: '#D97757' }}>
            <span className="skeleton" style={{ width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' }} />
            Thinking...
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: '8px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
          placeholder={placeholder || 'Ask the AI assistant...'}
          style={{
            flex: 1, padding: '7px 10px', borderRadius: '6px',
            border: '1px solid #E5E5E0', fontSize: '12px', background: '#FAF9F6',
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            padding: '7px 14px', borderRadius: '6px', border: 'none',
            background: loading || !input.trim() ? '#E5E5E0' : '#D97757',
            color: 'white', fontSize: '12px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          →
        </button>
      </div>
    </div>
  )
}
