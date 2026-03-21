'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { getProjects, getProjectStats, SEED_PROJECTS } from '@/lib/projects'
import { logAudit } from '@/lib/audit'
import type { Project, ProjectStatus, ProjectPathway } from '@/types/database'

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planning',
  scoping: 'Scoping',
  evidence_search: 'Evidence Search',
  grade_appraisal: 'GRADE Appraisal',
  etr_consensus: 'EtR & Consensus',
  external_review: 'External Review',
  published: 'Published',
  archived: 'Archived',
}

const STATUS_COLORS: Record<string, string> = {
  scoping: '#6366F1',
  evidence_search: '#8B5CF6',
  grade_appraisal: '#F59E0B',
  etr_consensus: '#D97757',
  external_review: '#10B981',
  published: '#10B981',
  planning: '#9CA3AF',
  archived: '#6B7280',
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '20px', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: color || 'var(--text)' }}>{value}</div>
    </div>
  )
}

function KanbanCard({ project }: { project: Project }) {
  const pathwayBadge: Record<string, { label: string; bg: string }> = {
    de_novo: { label: 'De Novo', bg: '#EDE9FE' },
    adaptation: { label: 'Adaptation', bg: '#FEF3C7' },
    adoption: { label: 'Adoption', bg: '#D1FAE5' },
  }
  const pw = pathwayBadge[project.pathway] || { label: project.pathway, bg: '#F3F4F6' }
  const daysAgo = Math.floor((Date.now() - new Date(project.updated_at).getTime()) / 86400000)

  return (
    <Link href={`/project/${project.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div style={{
        background: 'var(--bg-cream)', borderRadius: '8px', padding: '12px', marginBottom: '8px',
        border: '1px solid var(--border)', cursor: 'pointer', transition: 'box-shadow 0.15s',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
          {project.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: pw.bg, color: 'var(--text)', fontWeight: 500 }}>{pw.label}</span>
          {project.agree_ii_score != null && (
            <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>AGREE II: {project.agree_ii_score}%</span>
          )}
        </div>
        {project.target_date && (
          <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '6px' }}>
            Target: {new Date(project.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </div>
        )}
        <div style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '4px' }}>Updated {daysAgo}d ago</div>
      </div>
    </Link>
  )
}

interface CreateModalProps {
  open: boolean
  onClose: () => void
  onCreated: (project: Project) => void
}

function CreateProjectModal({ open, onClose, onCreated }: CreateModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pathway, setPathway] = useState<ProjectPathway>('de_novo')
  const [targetPop, setTargetPop] = useState('')
  const [targetDate, setTargetDate] = useState('')

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const newProject: Project = {
      id: String(Date.now()),
      title: title.trim(),
      description: description.trim() || null,
      status: 'planning',
      pathway,
      lead_author_id: null,
      icd_codes: null,
      target_population: targetPop.trim() || null,
      agree_ii_score: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      target_date: targetDate || null,
      published_at: null,
    }

    onCreated(newProject)
    logAudit('project.created', 'project', newProject.id, { title: newProject.title, pathway: newProject.pathway })
    setTitle('')
    setDescription('')
    setPathway('de_novo')
    setTargetPop('')
    setTargetDate('')
    onClose()
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0',
    fontSize: '13px', background: '#FAF9F6', boxSizing: 'border-box',
  }
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
          <div style={{ marginBottom: '14px' }}>
            <label style={lbl}>Guideline Title *</label>
            <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Type 2 Diabetes Management in Primary Care" required />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={lbl}>Description</label>
            <textarea style={{ ...inp, minHeight: '60px', resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the guideline scope..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={lbl}>Development Pathway</label>
              <select style={inp} value={pathway} onChange={(e) => setPathway(e.target.value as ProjectPathway)}>
                <option value="de_novo">De Novo</option>
                <option value="adaptation">Adaptation</option>
                <option value="adoption">Adoption</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Target Date</label>
              <input type="date" style={inp} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={lbl}>Target Population</label>
            <input style={inp} value={targetPop} onChange={(e) => setTargetPop(e.target.value)} placeholder="e.g., Adults aged 18+ with hypertension" />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid #E5E5E0', background: 'white', fontSize: '13px', cursor: 'pointer', color: '#374151' }}>Cancel</button>
            <button type="submit" style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Create Project</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState({ total: 0, published: 0, inDevelopment: 0, avgAgree: 0 })
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [p, s] = await Promise.all([getProjects(), getProjectStats()])
        setProjects(p)
        setStats(s)
      } catch {
        setProjects(SEED_PROJECTS)
        setStats({ total: SEED_PROJECTS.length, published: 4, inDevelopment: 10, avgAgree: 83 })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleProjectCreated(project: Project) {
    setProjects((prev) => [project, ...prev])
    setStats((prev) => ({ ...prev, total: prev.total + 1, inDevelopment: prev.inDevelopment + 1 }))
  }

  const kanbanStatuses: ProjectStatus[] = ['scoping', 'evidence_search', 'grade_appraisal', 'etr_consensus', 'external_review']

  if (loading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Loading..." />
        <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '10px' }} />)}
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Dashboard" subtitle={`${stats.total} guidelines across all stages`} />
      <div style={{ padding: '24px 32px' }}>
        {/* Stats Row + Create Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div />
          <button onClick={() => setShowCreate(true)} style={{
            padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#D97757',
            color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            + New Guideline
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          <StatCard label="Total Guidelines" value={stats.total} />
          <StatCard label="Published" value={stats.published} color="var(--success)" />
          <StatCard label="In Development" value={stats.inDevelopment} color="var(--primary)" />
          <StatCard label="Avg AGREE II" value={`${stats.avgAgree}%`} color="var(--info)" />
        </div>

        {/* Kanban Pipeline */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>Development Pipeline</h2>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${kanbanStatuses.length}, 1fr)`, gap: '12px' }}>
            {kanbanStatuses.map((status) => {
              const items = projects.filter((p) => p.status === status)
              return (
                <div key={status} style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '14px', border: '1px solid var(--border)', minHeight: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[status] || '#9CA3AF' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{STATUS_LABELS[status] || status}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)', marginLeft: 'auto' }}>{items.length}</span>
                  </div>
                  {items.map((p) => <KanbanCard key={p.id} project={p} />)}
                  {items.length === 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', textAlign: 'center', padding: '20px 0' }}>No projects</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>Recent Activity</h2>
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {projects
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
              .slice(0, 8)
              .map((p) => (
                <Link key={p.id} href={`/project/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: STATUS_COLORS[p.status] || '#9CA3AF' }} />
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{p.title}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                        background: `${STATUS_COLORS[p.status] || '#9CA3AF'}20`,
                        color: STATUS_COLORS[p.status] || '#9CA3AF',
                        fontWeight: 500,
                      }}>
                        {STATUS_LABELS[p.status] || p.status.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                        {new Date(p.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
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
