'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import { getProjects, SEED_PROJECTS } from '@/lib/projects'

import type { Project } from '@/types/database'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  planning: { label: 'Planning', color: '#9CA3AF', bg: '#F3F4F6' },
  scoping: { label: 'Scoping', color: '#6366F1', bg: '#EDE9FE' },
  evidence_search: { label: 'Evidence Search', color: '#8B5CF6', bg: '#F3E8FF' },
  grade_appraisal: { label: 'GRADE Appraisal', color: '#F59E0B', bg: '#FEF3C7' },
  etr_consensus: { label: 'EtR & Consensus', color: '#D97757', bg: '#FED7AA' },
  external_review: { label: 'External Review', color: '#10B981', bg: '#D1FAE5' },
  published: { label: 'Published', color: '#059669', bg: '#D1FAE5' },
  archived: { label: 'Archived', color: '#6B7280', bg: '#F3F4F6' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#9CA3AF', bg: '#F3F4F6' }
  return (
    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: cfg.bg, color: cfg.color, fontWeight: 600 }}>
      {cfg.label}
    </span>
  )
}

function isOverdue(project: Project): boolean {
  if (!project.target_date || project.status === 'published' || project.status === 'archived') return false
  return new Date(project.target_date) < new Date()
}

export default function LifecyclePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const p = await getProjects()
        setProjects(p)
      } catch {
        setProjects(SEED_PROJECTS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const sorted = [...projects].sort((a, b) => {
    // Overdue first, then by status weight, then by updated_at
    const aOverdue = isOverdue(a) ? 0 : 1
    const bOverdue = isOverdue(b) ? 0 : 1
    if (aOverdue !== bOverdue) return aOverdue - bOverdue
    const statusOrder = ['grade_appraisal', 'etr_consensus', 'evidence_search', 'external_review', 'scoping', 'planning', 'published', 'archived']
    return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
  })

  const published = projects.filter((p) => p.status === 'published')
  const inDev = projects.filter((p) => !['published', 'archived', 'planning'].includes(p.status))
  const avgAgree = published.length > 0
    ? Math.round(published.reduce((s, p) => s + (p.agree_ii_score ?? 0), 0) / published.length)
    : 0
  const overdue = projects.filter(isOverdue).length

  if (loading) {
    return (
      <>
        <Header title="Lifecycle Tracker" subtitle="Loading..." />
        <div style={{ padding: '32px' }}>
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" style={{ height: '44px', marginBottom: '8px', borderRadius: '8px' }} />)}
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Lifecycle Tracker" subtitle="End-to-end guideline development tracking" />
      <div style={{ padding: '24px 32px' }}>
        {/* Analytics Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>{published.length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>Published</div>
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>{inDev.length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>In Development</div>
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--info)' }}>{avgAgree}%</div>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>Avg AGREE II</div>
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: overdue > 0 ? 'var(--error)' : 'var(--success)' }}>{overdue}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>Overdue</div>
          </div>
        </div>

        {/* Projects Table */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '28px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-cream)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>Guideline</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>Pathway</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>AGREE II</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>Target Date</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: isOverdue(p) ? '#FEF2F2' : 'transparent' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{(p.title)}</div>
                    {p.description && <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>{(p.description)}</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={p.status} /></td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-light)' }}>{p.pathway.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: p.agree_ii_score && p.agree_ii_score >= 80 ? 'var(--success)' : p.agree_ii_score ? 'var(--warning)' : 'var(--text-light)' }}>
                    {p.agree_ii_score != null ? `${p.agree_ii_score}%` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                    {p.target_date ? (
                      <span style={{ color: isOverdue(p) ? 'var(--error)' : 'var(--text-light)' }}>
                        {isOverdue(p) && '⚠ '}
                        {new Date(p.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Published Repository */}
        {published.length > 0 && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>Published Repository</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {published.map((p) => (
                <div key={p.id} style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border)', borderTop: '3px solid var(--success)' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{(p.title)}</div>
                  {p.agree_ii_score && (
                    <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600, marginBottom: '6px' }}>AGREE II: {p.agree_ii_score}%</div>
                  )}
                  {p.published_at && (
                    <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                      Published {new Date(p.published_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-cream)', color: 'var(--text)', cursor: 'pointer' }}>View PDF</button>
                    <button style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-cream)', color: 'var(--text)', cursor: 'pointer' }}>Summary</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
