'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { getProjects, SEED_PROJECTS } from '@/lib/projects'
import type { Project, ProjectStatus } from '@/types/database'

const STATUS_COLORS: Record<string, string> = {
  published: '#10B981', planning: '#6B7280',
  scoping: '#8B5CF6', evidence_search: '#3B82F6',
  grade_appraisal: '#F59E0B', etr_consensus: '#EF4444',
  external_review: '#6366F1', archived: '#9CA3AF',
}

const STATUS_LABELS: Record<string, string> = {
  published: 'Published', planning: 'Planning',
  scoping: 'Scoping', evidence_search: 'Evidence Search',
  grade_appraisal: 'GRADE Appraisal', etr_consensus: 'EtR Consensus',
  external_review: 'External Review', archived: 'Archived',
}

const PATHWAY_LABELS: Record<string, string> = { de_novo: 'De Novo', adaptation: 'Adaptation', adoption: 'Adoption' }

export default function GuidelinesPage() {
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pathwayFilter, setPathwayFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => { getProjects().then(setProjects) }, [])

  const filtered = useMemo(() => {
    let items = [...projects]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter((p) => p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.icd_codes?.some((c) => c.toLowerCase().includes(q)))
    }
    if (statusFilter === 'published') items = items.filter((p) => p.status === 'published')
    else if (statusFilter === 'development') items = items.filter((p) => !['published', 'archived', 'planning'].includes(p.status))
    else if (statusFilter === 'review') items = items.filter((p) => p.status === 'external_review')
    else if (statusFilter === 'planning') items = items.filter((p) => p.status === 'planning')
    if (pathwayFilter !== 'all') items = items.filter((p) => p.pathway === pathwayFilter)
    items.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'agree') return (b.agree_ii_score ?? 0) - (a.agree_ii_score ?? 0)
      if (sortBy === 'target') return (a.target_date ?? '').localeCompare(b.target_date ?? '')
      return (b.updated_at ?? '').localeCompare(a.updated_at ?? '')
    })
    return items
  }, [projects, search, statusFilter, pathwayFilter, sortBy])

  const published = projects.filter((p) => p.status === 'published')
  const withScore = published.filter((p) => p.agree_ii_score != null)
  const avgAgree = withScore.length ? Math.round(withScore.reduce((s, p) => s + (p.agree_ii_score ?? 0), 0) / withScore.length) : 0
  const thisQuarter = projects.filter((p) => {
    if (!p.target_date) return false
    const d = new Date(p.target_date)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3)
  })

  const inp: React.CSSProperties = { padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '13px', background: '#FAF9F6' }
  const card: React.CSSProperties = { background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px' }

  return (
    <>
      <Header title="Active Guidelines" subtitle="Published and in-development clinical practice guidelines" />
      <div className="fade-in" style={{ padding: '24px 32px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Guidelines', value: projects.length, color: '#1A1A1A' },
            { label: 'Published', value: published.length, color: '#10B981' },
            { label: 'Avg AGREE II', value: `${avgAgree}%`, color: '#6366F1' },
            { label: 'Due This Quarter', value: thisQuarter.length, color: '#F59E0B' },
          ].map((s) => (
            <div key={s.label} style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input style={{ ...inp, flex: 1, minWidth: '200px' }} placeholder="Search guidelines..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select style={inp} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option><option value="published">Published</option><option value="development">In Development</option><option value="review">Under Review</option><option value="planning">Planning</option>
          </select>
          <select style={inp} value={pathwayFilter} onChange={(e) => setPathwayFilter(e.target.value)}>
            <option value="all">All Pathways</option><option value="de_novo">De Novo</option><option value="adaptation">Adaptation</option><option value="adoption">Adoption</option>
          </select>
          <select style={inp} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="updated">Recently Updated</option><option value="title">Title A-Z</option><option value="agree">AGREE II Score</option><option value="target">Target Date</option>
          </select>
          <div style={{ display: 'flex', borderRadius: '6px', border: '1px solid #E5E5E0', overflow: 'hidden' }}>
            <button onClick={() => setViewMode('grid')} style={{ padding: '6px 12px', border: 'none', background: viewMode === 'grid' ? '#D97757' : 'white', color: viewMode === 'grid' ? 'white' : '#6B7280', fontSize: '12px', cursor: 'pointer' }}>Grid</button>
            <button onClick={() => setViewMode('list')} style={{ padding: '6px 12px', border: 'none', borderLeft: '1px solid #E5E5E0', background: viewMode === 'list' ? '#D97757' : 'white', color: viewMode === 'list' ? 'white' : '#6B7280', fontSize: '12px', cursor: 'pointer' }}>List</button>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>{filtered.length} guidelines found</div>

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
            {filtered.map((p) => (
              <div key={p.id} style={{ ...card, padding: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: STATUS_COLORS[p.status] + '20', color: STATUS_COLORS[p.status], fontWeight: 600 }}>{STATUS_LABELS[p.status]}</span>
                  {p.agree_ii_score != null && (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${p.agree_ii_score >= 80 ? '#10B981' : p.agree_ii_score >= 60 ? '#F59E0B' : '#EF4444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>{p.agree_ii_score}</div>
                  )}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', lineHeight: 1.3 }}>{p.title}</div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', lineHeight: 1.4 }}>{p.description}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#FEF3C7', color: '#92400E' }}>{PATHWAY_LABELS[p.pathway]}</span>
                  {p.icd_codes?.slice(0, 3).map((c) => <span key={c} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#F3F4F6', color: '#374151' }}>{c}</span>)}
                </div>
                {p.target_population && <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px' }}>{p.target_population}</div>}
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{p.published_at ? `Published ${p.published_at}` : `Target: ${p.target_date}`}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <Link href={`/project/${p.id}`} style={{ flex: 1, padding: '6px', borderRadius: '5px', border: '1px solid #E5E5E0', background: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: '#374151', textDecoration: 'none', textAlign: 'center', display: 'block' }}>View</Link>
                  <Link href={`/project/${p.id}`} style={{ flex: 1, padding: '6px', borderRadius: '5px', border: 'none', background: '#D97757', color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', textAlign: 'center', display: 'block' }}>Edit</Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div style={{ ...card, marginBottom: '32px', padding: '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead><tr style={{ borderBottom: '2px solid #E5E5E0' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600 }}>Guideline</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600 }}>Status</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600 }}>Pathway</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600 }}>AGREE II</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '10px 14px' }}></th>
              </tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, marginBottom: '2px' }}>{p.title}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{p.description}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: STATUS_COLORS[p.status] + '20', color: STATUS_COLORS[p.status], fontWeight: 600 }}>{STATUS_LABELS[p.status]}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px' }}>{PATHWAY_LABELS[p.pathway]}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{p.agree_ii_score ?? '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#6B7280' }}>{p.published_at || p.target_date}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <Link href={`/project/${p.id}`} style={{ padding: '4px 12px', borderRadius: '4px', border: 'none', background: '#D97757', color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Published Section */}
        {published.length > 0 && (
          <>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Published Repository</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {published.map((p) => (
                <div key={p.id} style={{ ...card, padding: '16px', textAlign: 'center' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: `3px solid ${(p.agree_ii_score ?? 0) >= 80 ? '#10B981' : '#F59E0B'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, margin: '0 auto 10px', color: (p.agree_ii_score ?? 0) >= 80 ? '#10B981' : '#F59E0B' }}>{p.agree_ii_score}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{p.title}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '10px' }}>Published {p.published_at}</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Link href="/reports" style={{ flex: 1, padding: '5px', borderRadius: '5px', border: '1px solid #E5E5E0', background: 'white', fontSize: '11px', cursor: 'pointer', textDecoration: 'none', color: '#374151', textAlign: 'center', display: 'block' }}>PDF</Link>
                    <Link href={`/project/${p.id}`} style={{ flex: 1, padding: '5px', borderRadius: '5px', border: 'none', background: '#D97757', color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', textAlign: 'center', display: 'block' }}>View</Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
