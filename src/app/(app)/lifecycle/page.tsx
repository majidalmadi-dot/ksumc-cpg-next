'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { getProjects, SEED_PROJECTS } from '@/lib/projects'
import type { Project, ProjectStatus } from '@/types/database'

const STATUS_ORDER: ProjectStatus[] = ['planning', 'scoping', 'evidence_search', 'grade_appraisal', 'etr_consensus', 'external_review', 'published', 'archived']
const STATUS_LABELS: Record<string, string> = {
  planning: 'Planning', scoping: 'Scoping', evidence_search: 'Evidence Search',
  grade_appraisal: 'GRADE', etr_consensus: 'EtR Consensus', external_review: 'External Review',
  published: 'Published', archived: 'Archived',
}
const STATUS_COLORS: Record<string, string> = {
  planning: '#9CA3AF', scoping: '#6366F1', evidence_search: '#8B5CF6',
  grade_appraisal: '#F59E0B', etr_consensus: '#D97757', external_review: '#10B981',
  published: '#059669', archived: '#6B7280',
}

function isOverdue(p: Project) {
  return !!p.target_date && p.status !== 'published' && p.status !== 'archived' && new Date(p.target_date) < new Date()
}

/* Gantt-style Timeline */
function GanttTimeline({ projects }: { projects: Project[] }) {
  const [now] = useState(() => new Date())
  const active = projects.filter(p => !['published', 'archived'].includes(p.status))
  const sorted = [...active].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status)
    const bi = STATUS_ORDER.indexOf(b.status)
    return bi - ai
  })
  const monthsRange = 12
  const startMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const months = Array.from({ length: monthsRange }, (_, i) => {
    const d = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1)
    return { date: d, label: d.toLocaleDateString('en-US', { month: 'short' }), year: d.getFullYear() }
  })
  const totalMs = months[months.length - 1].date.getTime() - months[0].date.getTime()

  function getBarPos(p: Project) {
    const created = new Date(p.created_at)
    const target = p.target_date ? new Date(p.target_date) : new Date(now.getTime() + 90 * 86400000)
    const start = Math.max(created.getTime(), months[0].date.getTime())
    const end = Math.min(target.getTime(), months[months.length - 1].date.getTime())
    const left = ((start - months[0].date.getTime()) / totalMs) * 100
    const width = Math.max(((end - start) / totalMs) * 100, 3)
    return { left: `${Math.max(left, 0)}%`, width: `${Math.min(width, 100 - left)}%` }
  }

  const todayPos = ((now.getTime() - months[0].date.getTime()) / totalMs) * 100

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)', padding: '20px', overflowX: 'auto' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px' }}>Development Timeline</h3>
      <div style={{ minWidth: '700px' }}>
        {/* Month Headers */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingLeft: '180px', marginBottom: '8px' }}>
          {months.map((m, i) => (
            <div key={i} style={{ flex: 1, fontSize: '10px', fontWeight: 600, color: 'var(--text-light)', padding: '4px 0', textAlign: 'center', borderLeft: '1px solid #F0EDE8' }}>
              {m.label} {m.year !== now.getFullYear() ? `'${String(m.year).slice(2)}` : ''}
            </div>
          ))}
        </div>

        {/* Bars */}
        <div style={{ position: 'relative' }}>
          {/* Today line */}
          <div style={{ position: 'absolute', left: `calc(180px + ${todayPos}% * (100% - 180px) / 100)`, top: 0, bottom: 0, width: '2px', background: '#EF4444', zIndex: 2, opacity: 0.6 }} />

          {sorted.map(p => {
            const bar = getBarPos(p)
            const overdue = isOverdue(p)
            return (
              <Link key={p.id} href={`/project/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', height: '32px', cursor: 'pointer' }}>
                  <div style={{ width: '180px', flexShrink: 0, paddingRight: '12px', overflow: 'hidden' }}>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                  </div>
                  <div style={{ flex: 1, position: 'relative', height: '20px' }}>
                    <div style={{
                      position: 'absolute', top: '2px', left: bar.left, width: bar.width, height: '16px',
                      borderRadius: '4px', background: overdue ? '#EF4444' : STATUS_COLORS[p.status],
                      opacity: 0.85, transition: 'opacity 0.2s',
                    }}>
                      <span style={{ position: 'absolute', left: '6px', top: '1px', fontSize: '9px', color: 'white', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* Status Distribution Mini Chart */
function StatusDistribution({ projects }: { projects: Project[] }) {
  const counts = STATUS_ORDER.filter(s => s !== 'archived').map(s => ({
    status: s, count: projects.filter(p => p.status === s).length,
  }))
  const max = Math.max(...counts.map(c => c.count), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px', padding: '0 4px' }}>
      {counts.map(({ status, count }) => (
        <div key={status} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: count > 0 ? 'var(--text)' : 'var(--text-light)' }}>{count}</span>
          <div style={{ width: '100%', height: `${(count / max) * 80}px`, minHeight: '4px', borderRadius: '3px 3px 0 0', background: STATUS_COLORS[status], opacity: 0.85, transition: 'height 0.3s' }} />
          <span style={{ fontSize: '8px', color: 'var(--text-light)', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.1 }}>{STATUS_LABELS[status]?.split(' ')[0]}</span>
        </div>
      ))}
    </div>
  )
}

export default function LifecyclePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getProjects().then(p => { setProjects(p); setLoading(false) }).catch(() => { setProjects(SEED_PROJECTS); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    let items = [...projects]
    if (search) { const q = search.toLowerCase(); items = items.filter(p => p.title.toLowerCase().includes(q)) }
    if (filter !== 'all') items = items.filter(p => filter === 'overdue' ? isOverdue(p) : p.status === filter)
    return items.sort((a, b) => {
      if (isOverdue(a) && !isOverdue(b)) return -1
      if (!isOverdue(a) && isOverdue(b)) return 1
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
    })
  }, [projects, filter, search])

  const published = projects.filter(p => p.status === 'published')
  const inDev = projects.filter(p => !['published', 'archived', 'planning'].includes(p.status))
  const overdue = projects.filter(isOverdue)
  const avgAgree = published.length > 0 ? Math.round(published.reduce((s, p) => s + (p.agree_ii_score ?? 0), 0) / published.length) : 0

  if (loading) {
    return (<><Header title="Lifecycle Tracker" subtitle="Loading..." /><div style={{ padding: '32px' }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px', borderRadius: '8px' }} />)}</div></>)
  }

  const inp: React.CSSProperties = { padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '13px', background: '#FAF9F6' }

  return (
    <>
      <Header title="Lifecycle Tracker" subtitle={`${projects.length} guidelines · ${inDev.length} in active development`} />
      <div className="fade-in" style={{ padding: '24px 32px' }}>

        {/* Stats Row */}
        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Published', value: published.length, color: '#10B981', sub: `${avgAgree}% avg AGREE II` },
            { label: 'In Development', value: inDev.length, color: '#D97757', sub: `${inDev.length} active` },
            { label: 'Overdue', value: overdue.length, color: overdue.length > 0 ? '#EF4444' : '#10B981', sub: overdue.length > 0 ? 'Action needed' : 'All on track' },
            { label: 'Total Pipeline', value: projects.length, color: '#6366F1', sub: `${Math.round(published.length / Math.max(projects.length, 1) * 100)}% completion` },
          ].map(s => (
            <div key={s.label} className="card-hover" style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '16px 20px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{s.label}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts Row: Gantt + Distribution */}
        <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <GanttTimeline projects={projects} />
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>Status Distribution</h3>
            <StatusDistribution projects={projects} />
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input style={{ ...inp, flex: 1, minWidth: '200px' }} placeholder="Search guidelines..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={inp} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Statuses ({projects.length})</option>
            <option value="overdue">Overdue ({overdue.length})</option>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]} ({projects.filter(p => p.status === s).length})</option>)}
          </select>
        </div>

        {/* Projects Table */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '28px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-cream)', borderBottom: '2px solid var(--border)' }}>
                {['Guideline', 'Status', 'Progress', 'Pathway', 'AGREE II', 'Target Date'].map(h => (
                  <th key={h} style={{ textAlign: h === 'AGREE II' ? 'center' : 'left', padding: '10px 14px', fontSize: '10px', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const idx = STATUS_ORDER.indexOf(p.status)
                const progress = p.status === 'published' ? 100 : Math.round(((idx + 1) / 7) * 100)
                const overdue_ = isOverdue(p)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: overdue_ ? '#FEF2F2' : 'transparent' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <Link href={`/project/${p.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#D97757' }}>{p.title}</div>
                        {p.description && <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: `${STATUS_COLORS[p.status]}18`, color: STATUS_COLORS[p.status] }}>{STATUS_LABELS[p.status]}</span>
                    </td>
                    <td style={{ padding: '12px 14px', width: '140px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${progress}%`, background: p.status === 'published' ? '#10B981' : STATUS_COLORS[p.status], borderRadius: '3px', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-light)', minWidth: '30px' }}>{progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text)' }}>{p.pathway.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: (p.agree_ii_score ?? 0) >= 80 ? '#10B981' : (p.agree_ii_score ?? 0) >= 60 ? '#F59E0B' : 'var(--text-light)' }}>
                      {p.agree_ii_score != null ? `${p.agree_ii_score}%` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px' }}>
                      {p.target_date ? (
                        <span style={{ color: overdue_ ? '#EF4444' : 'var(--text-light)', fontWeight: overdue_ ? 600 : 400 }}>
                          {overdue_ && '⚠ '}
                          {new Date(p.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      ) : <span style={{ color: 'var(--text-light)' }}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Published Repository */}
        {published.length > 0 && (
          <>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px' }}>Published Repository</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {published.map(p => (
                <Link key={p.id} href={`/project/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card-hover" style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border)', borderTop: '3px solid #10B981', cursor: 'pointer' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>{p.title}</div>
                    {p.agree_ii_score != null && <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, marginBottom: '6px' }}>AGREE II: {p.agree_ii_score}%</div>}
                    {p.published_at && <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>Published {new Date(p.published_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#D1FAE5', color: '#065F46', fontWeight: 500 }}>PDF</span>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#DBEAFE', color: '#1E40AF', fontWeight: 500 }}>Summary</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
