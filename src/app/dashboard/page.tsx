'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import { getProjects, getProjectStats, SEED_PROJECTS } from '@/lib/projects'
import { sanitizeText } from '@/lib/sanitize'
import type { Project, ProjectStatus } from '@/types/database'

const STATUS_LABELS: Record<string, string> = {
  scoping: 'Scoping',
  evidence_search: 'Evidence Search',
  grade_appraisal: 'GRADE Appraisal',
  etr_consensus: 'EtR & Consensus',
  external_review: 'External Review',
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
    <div style={{
      background: 'var(--bg-cream)', borderRadius: '8px', padding: '12px', marginBottom: '8px',
      border: '1px solid var(--border)', cursor: 'pointer', transition: 'box-shadow 0.15s',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
        {sanitizeText(project.title)}
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
  )
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState({ total: 0, published: 0, inDevelopment: 0, avgAgree: 0 })
  const [loading, setLoading] = useState(true)

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
        {/* Stats Row */}
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
                <div key={p.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: STATUS_COLORS[p.status] || '#9CA3AF' }} />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{sanitizeText(p.title)}</span>
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
              ))}
          </div>
        </div>
      </div>
    </>
  )
}
