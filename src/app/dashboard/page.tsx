'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { getProjects, getProjectStats, SEED_PROJECTS } from '@/lib/projects'
import { logAudit } from '@/lib/audit'
import type { Project, ProjectStatus, ProjectPathway } from '@/types/database'

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planning', scoping: 'Scoping', evidence_search: 'Evidence Search',
  grade_appraisal: 'GRADE Appraisal', etr_consensus: 'EtR & Consensus',
  external_review: 'External Review', published: 'Published', archived: 'Archived',
}

const STATUS_COLORS: Record<string, string> = {
  planning: '#9CA3AF', scoping: '#6366F1', evidence_search: '#8B5CF6',
  grade_appraisal: '#F59E0B', etr_consensus: '#D97757', external_review: '#10B981',
  published: '#10B981', archived: '#6B7280',
}

const PATHWAY_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  de_novo: { color: '#8B5CF6', bg: '#EDE9FE', label: 'De Novo' },
  adaptation: { color: '#F59E0B', bg: '#FEF3C7', label: 'Adaptation' },
  adoption: { color: '#10B981', bg: '#D1FAE5', label: 'Adoption' },
}

/* ── Stat Card ─────────────────────────────────────────────── */
function StatCard({ label, value, sub, color, trend }: { label: string; value: string | number; sub?: string; color?: string; trend?: 'up' | 'down' }) {
  return (
    <div className="card-hover" style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '20px', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: color || 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {value}
        {trend && <span style={{ fontSize: '14px', color: trend === 'up' ? '#10B981' : '#EF4444' }}>{trend === 'up' ? '↑' : '↓'}</span>}
      </div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

/* ── Pipeline Funnel (SVG) ─────────────────────────────────── */
function PipelineFunnel({ projects }: { projects: Project[] }) {
  const statuses: ProjectStatus[] = ['scoping', 'evidence_search', 'grade_appraisal', 'etr_consensus', 'external_review']
  const counts = statuses.map(s => ({ status: s, count: projects.filter(p => p.status === s).length }))
  const max = Math.max(...counts.map(c => c.count), 1)
  return (
    <svg viewBox="0 0 480 220" style={{ width: '100%', height: 'auto' }}>
      {counts.map(({ status, count }, i) => {
        const barW = (count / max) * 300
        const y = 10 + i * 42
        return (
          <g key={status}>
            <text x="120" y={y + 20} textAnchor="end" style={{ fontSize: '11px', fill: 'var(--text-light)' }}>{STATUS_LABELS[status]}</text>
            <rect x="130" y={y + 4} width={barW} height="26" rx="4" fill={STATUS_COLORS[status]} opacity="0.85" />
            <text x={135 + barW / 2} y={y + 22} textAnchor="middle" style={{ fontSize: '12px', fill: 'white', fontWeight: 600 }}>{count}</text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── Pathway Donut (SVG) ───────────────────────────────────── */
function PathwayDonut({ projects }: { projects: Project[] }) {
  const paths: ProjectPathway[] = ['de_novo', 'adaptation', 'adoption']
  const counts = paths.map(p => projects.filter(pr => pr.pathway === p).length)
  const total = counts.reduce((a, b) => a + b, 0) || 1
  const r = 55, cx = 75, cy = 75, circ = 2 * Math.PI * r
  let offset = -circ / 4
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <svg width="150" height="150" viewBox="0 0 150 150">
        {paths.map((p, i) => {
          const seg = (counts[i] / total) * circ
          const dash = `${seg - 2} ${circ - seg + 2}`
          const o = offset
          offset += seg
          return <circle key={p} cx={cx} cy={cy} r={r} fill="none" stroke={PATHWAY_COLORS[p].color} strokeWidth="14" strokeDasharray={dash} strokeDashoffset={-o} />
        })}
        <circle cx={cx} cy={cy} r="38" fill="white" />
        <text x={cx} y={cy} textAnchor="middle" dy="0.35em" style={{ fontSize: '16px', fontWeight: 700, fill: 'var(--text)' }}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: '9px', fill: 'var(--text-light)' }}>projects</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {paths.map((p, i) => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: PATHWAY_COLORS[p].color }} />
            <span style={{ fontSize: '12px', color: 'var(--text)' }}>{PATHWAY_COLORS[p].label}: <strong>{counts[i]}</strong> ({Math.round(counts[i] / total * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── AGREE II Distribution (SVG) ───────────────────────────── */
function AgreeDistribution({ projects }: { projects: Project[] }) {
  const scored = projects.filter(p => p.agree_ii_score != null)
  const green = scored.filter(p => (p.agree_ii_score ?? 0) >= 80).length
  const amber = scored.filter(p => (p.agree_ii_score ?? 0) >= 60 && (p.agree_ii_score ?? 0) < 80).length
  const red = scored.filter(p => (p.agree_ii_score ?? 0) < 60).length
  const total = green + amber + red || 1
  const bars = [
    { label: 'Excellent (≥80)', count: green, color: '#10B981' },
    { label: 'Adequate (60–79)', count: amber, color: '#F59E0B' },
    { label: 'Needs Work (<60)', count: red, color: '#EF4444' },
  ]
  return (
    <svg viewBox="0 0 400 130" style={{ width: '100%', height: 'auto' }}>
      {bars.map((b, i) => {
        const y = 10 + i * 40
        const w = (b.count / total) * 220
        return (
          <g key={b.label}>
            <text x="115" y={y + 18} textAnchor="end" style={{ fontSize: '11px', fill: 'var(--text-light)' }}>{b.label}</text>
            <rect x="125" y={y + 2} width={Math.max(w, 2)} height="24" rx="4" fill={b.color} opacity="0.85" />
            <text x={130 + w + 6} y={y + 19} style={{ fontSize: '12px', fill: 'var(--text)', fontWeight: 600 }}>{b.count}</text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── Monthly Sparkline (SVG) ───────────────────────────────── */
function MonthlySparkline({ projects }: { projects: Project[] }) {
  const now = new Date()
  const data = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - 4 + i, 1)
    return { month: d.toLocaleDateString('en-US', { month: 'short' }), count: projects.filter(p => { const u = new Date(p.updated_at); return u >= d && u < end }).length }
  })
  const max = Math.max(...data.map(d => d.count), 1)
  const w = 320, h = 100, px = 30, py = 15
  const pts = data.map((d, i) => ({ x: px + i * ((w - 2 * px) / 5), y: h - py - (d.count / max) * (h - 2 * py) }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
      <defs><linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D97757" stopOpacity="0.3" /><stop offset="100%" stopColor="#D97757" stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L ${pts[5].x} ${h - py} L ${pts[0].x} ${h - py} Z`} fill="url(#spGrad)" />
      <path d={line} fill="none" stroke="#D97757" strokeWidth="2.5" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#D97757" />)}
      {data.map((d, i) => <text key={i} x={pts[i].x} y={h - 2} textAnchor="middle" style={{ fontSize: '9px', fill: 'var(--text-light)' }}>{d.month}</text>)}
    </svg>
  )
}

/* ── Kanban Card ────────────────────────────────────────────── */
function KanbanCard({ project }: { project: Project }) {
  const pw = PATHWAY_COLORS[project.pathway] || { label: project.pathway, bg: '#F3F4F6', color: '#6B7280' }
  const daysAgo = Math.floor((Date.now() - new Date(project.updated_at).getTime()) / 86400000)
  return (
    <Link href={`/project/${project.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div className="card-hover" style={{ background: 'var(--bg-cream)', borderRadius: '8px', padding: '12px', marginBottom: '8px', border: '1px solid var(--border)', cursor: 'pointer' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>{project.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: pw.bg, color: 'var(--text)', fontWeight: 500 }}>{pw.label}</span>
          {project.agree_ii_score != null && <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>AGREE II: {project.agree_ii_score}%</span>}
        </div>
        {project.target_date && <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '6px' }}>Target: {new Date(project.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>}
        <div style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '4px' }}>Updated {daysAgo}d ago</div>
      </div>
    </Link>
  )
}

/* ── Create Project Modal ──────────────────────────────────── */
function CreateProjectModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (p: Project) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pathway, setPathway] = useState<ProjectPathway>('de_novo')
  const [targetPop, setTargetPop] = useState('')
  const [targetDate, setTargetDate] = useState('')
  if (!open) return null
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const p: Project = { id: String(Date.now()), title: title.trim(), description: description.trim() || null, status: 'planning', pathway, lead_author_id: null, icd_codes: null, target_population: targetPop.trim() || null, agree_ii_score: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), target_date: targetDate || null, published_at: null }
    onCreated(p)
    logAudit('project.created', 'project', p.id, { title: p.title, pathway: p.pathway })
    setTitle(''); setDescription(''); setPathway('de_novo'); setTargetPop(''); setTargetDate('')
    onClose()
  }
  const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '13px', background: '#FAF9F6', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'white', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>New Guideline Project</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}><label style={lbl}>Guideline Title *</label><input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Type 2 Diabetes Management in Primary Care" required /></div>
          <div style={{ marginBottom: '14px' }}><label style={lbl}>Description</label><textarea style={{ ...inp, minHeight: '60px', resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><label style={lbl}>Development Pathway</label><select style={inp} value={pathway} onChange={e => setPathway(e.target.value as ProjectPathway)}><option value="de_novo">De Novo</option><option value="adaptation">Adaptation</option><option value="adoption">Adoption</option></select></div>
            <div><label style={lbl}>Target Date</label><input type="date" style={inp} value={targetDate} onChange={e => setTargetDate(e.target.value)} /></div>
          </div>
          <div style={{ marginBottom: '20px' }}><label style={lbl}>Target Population</label><input style={inp} value={targetPop} onChange={e => setTargetPop(e.target.value)} placeholder="e.g., Adults aged 18+ with hypertension" /></div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid #E5E5E0', background: 'white', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Create Project</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Main Dashboard ────────────────────────────────────────── */
export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState({ total: 0, published: 0, inDevelopment: 0, avgAgree: 0 })
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(true)
  const [overdueOpen, setOverdueOpen] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [p, s] = await Promise.all([getProjects(), getProjectStats()])
        setProjects(p); setStats(s)
      } catch {
        setProjects(SEED_PROJECTS)
        setStats({ total: SEED_PROJECTS.length, published: 4, inDevelopment: 10, avgAgree: 83 })
      } finally { setLoading(false) }
    }
    load()
  }, [])

  function handleProjectCreated(project: Project) {
    setProjects(prev => [project, ...prev])
    setStats(prev => ({ ...prev, total: prev.total + 1, inDevelopment: prev.inDevelopment + 1 }))
  }

  const overdueProjects = useMemo(() => {
    const today = new Date()
    return projects.filter(p => p.target_date && p.status !== 'published' && p.status !== 'archived' && new Date(p.target_date) < today)
  }, [projects])

  const kanbanStatuses: ProjectStatus[] = ['scoping', 'evidence_search', 'grade_appraisal', 'etr_consensus', 'external_review']

  if (loading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Loading..." />
        <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '10px' }} />)}
        </div>
        <div style={{ padding: '0 32px', display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px' }}>
          <div className="skeleton" style={{ height: '250px', borderRadius: '10px' }} />
          <div className="skeleton" style={{ height: '250px', borderRadius: '10px' }} />
        </div>
      </>
    )
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <>
      <Header title="Dashboard" subtitle={`${stats.total} guidelines across all stages`} />
      <div className="fade-in" style={{ padding: '24px 32px' }}>

        {/* Welcome Banner */}
        <div role="button" tabIndex={0} aria-expanded={welcomeOpen} aria-label="Toggle welcome banner" onClick={() => setWelcomeOpen(!welcomeOpen)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setWelcomeOpen(!welcomeOpen) }}} style={{ background: 'linear-gradient(135deg, #FAF9F6, #F0EDE8)', borderRadius: '10px', padding: '20px 24px', border: '1px solid var(--border)', marginBottom: '20px', cursor: 'pointer', transition: 'all 0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)' }}>{greeting}, Dr. Almadi</div>
              <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>{dateStr} · {stats.inDevelopment} guidelines in active development</div>
            </div>
            <span aria-hidden="true" style={{ color: 'var(--text-light)', transform: welcomeOpen ? 'rotate(0)' : 'rotate(180deg)', transition: 'transform 0.2s' }}>▼</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <button onClick={() => setShowCreate(true)} aria-label="Create new guideline" style={{ padding: '12px', borderRadius: '8px', border: 'none', background: '#D97757', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ New Guideline</button>
          <Link href="/evidence" style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: '13px', fontWeight: 600, textDecoration: 'none', textAlign: 'center', display: 'block' }}>Search Evidence</Link>
          <Link href="/grade" style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: '13px', fontWeight: 600, textDecoration: 'none', textAlign: 'center', display: 'block' }}>Start GRADE</Link>
          <Link href="/reports" style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: '13px', fontWeight: 600, textDecoration: 'none', textAlign: 'center', display: 'block' }}>View Reports</Link>
        </div>

        {/* Stats Row */}
        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <StatCard label="Total Guidelines" value={stats.total} sub="All projects" trend="up" />
          <StatCard label="Published" value={stats.published} color="#10B981" sub={`${stats.total > 0 ? Math.round(stats.published / stats.total * 100) : 0}% completion rate`} trend="up" />
          <StatCard label="In Development" value={stats.inDevelopment} color="#D97757" sub={`${overdueProjects.length} overdue`} />
          <StatCard label="Avg AGREE II" value={`${stats.avgAgree}%`} color="#6366F1" sub="Quality score" />
        </div>

        {/* Charts Row 1: Pipeline + Pathway */}
        <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '20px', border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px' }}>Pipeline Status</h2>
            <PipelineFunnel projects={projects} />
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '20px', border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px' }}>Pathway Distribution</h2>
            <PathwayDonut projects={projects} />
          </div>
        </div>

        {/* Charts Row 2: AGREE II + Monthly Activity */}
        <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '20px', border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px' }}>AGREE II Score Distribution</h2>
            <AgreeDistribution projects={projects} />
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '20px', border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px' }}>Monthly Activity</h2>
            <MonthlySparkline projects={projects} />
          </div>
        </div>

        {/* Overdue Alerts */}
        {overdueProjects.length > 0 && (
          <div style={{ background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA', marginBottom: '24px', overflow: 'hidden' }}>
            <div onClick={() => setOverdueOpen(!overdueOpen)} style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>⚠</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#DC2626' }}>Overdue Projects</div>
                  <div style={{ fontSize: '11px', color: '#991B1B' }}>{overdueProjects.length} guideline{overdueProjects.length > 1 ? 's' : ''} past target date</div>
                </div>
              </div>
              <span style={{ color: '#DC2626', transform: overdueOpen ? 'rotate(0)' : 'rotate(180deg)', transition: 'transform 0.2s' }}>▼</span>
            </div>
            {overdueOpen && (
              <div style={{ borderTop: '1px solid #FECACA' }}>
                {overdueProjects.map(p => {
                  const days = Math.floor((Date.now() - new Date(p.target_date!).getTime()) / 86400000)
                  return (
                    <Link key={p.id} href={`/project/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FECACA' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{p.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{STATUS_LABELS[p.status]}</div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '4px', background: '#FEE2E2', color: '#DC2626' }}>{days}d overdue</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Kanban Pipeline */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Development Pipeline</h2>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${kanbanStatuses.length}, 1fr)`, gap: '12px' }}>
            {kanbanStatuses.map(status => {
              const items = projects.filter(p => p.status === status)
              return (
                <div key={status} style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '14px', border: '1px solid var(--border)', minHeight: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[status] }} />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{STATUS_LABELS[status]}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)', marginLeft: 'auto' }}>{items.length}</span>
                  </div>
                  {items.map(p => <KanbanCard key={p.id} project={p} />)}
                  {items.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-light)', textAlign: 'center', padding: '20px 0' }}>No projects</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Recent Activity</h2>
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {projects.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 8).map(p => (
              <Link key={p.id} href={`/project/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: STATUS_COLORS[p.status] }} />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{p.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: `${STATUS_COLORS[p.status]}20`, color: STATUS_COLORS[p.status], fontWeight: 500 }}>{STATUS_LABELS[p.status]}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>{new Date(p.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleProjectCreated} />
    </>
  )
}
