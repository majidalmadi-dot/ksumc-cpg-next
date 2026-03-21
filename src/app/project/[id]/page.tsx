'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { SEED_PROJECTS } from '@/lib/projects'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import type { Project, ProjectStatus } from '@/types/database'

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
  planning: '#9CA3AF',
  scoping: '#6366F1',
  evidence_search: '#8B5CF6',
  grade_appraisal: '#F59E0B',
  etr_consensus: '#D97757',
  external_review: '#10B981',
  published: '#10B981',
  archived: '#6B7280',
}

const LIFECYCLE_ORDER: ProjectStatus[] = [
  'planning', 'scoping', 'evidence_search', 'grade_appraisal',
  'etr_consensus', 'external_review', 'published',
]

export default function ProjectDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Project>>({})

  useEffect(() => {
    async function load() {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()
          if (!error && data) { setProject(data); setLoading(false); return }
        } catch { /* fall through */ }
      }
      const seed = SEED_PROJECTS.find((p) => p.id === id) || null
      setProject(seed)
      setLoading(false)
    }
    load()
  }, [id])

  function startEdit() {
    if (!project) return
    setEditForm({ title: project.title, description: project.description, status: project.status, target_population: project.target_population, target_date: project.target_date })
    setEditing(true)
  }

  async function saveEdit() {
    if (!project) return
    const updated = { ...project, ...editForm, updated_at: new Date().toISOString() }
    setProject(updated)
    setEditing(false)

    const changedFields: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(editForm)) {
      if (val !== (project as unknown as Record<string, unknown>)[key]) changedFields[key] = val
    }
    const action = changedFields.status ? 'project.status_changed' as const : 'project.updated' as const
    logAudit(action, 'project', project.id, changedFields)

    if (isSupabaseConfigured) {
      try {
        await supabase.from('projects').update(editForm).eq('id', project.id)
      } catch { /* local only */ }
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Loading..." subtitle="" />
        <div style={{ padding: '32px' }}>
          <div className="skeleton" style={{ height: '200px', borderRadius: '10px' }} />
        </div>
      </>
    )
  }

  if (!project) {
    return (
      <>
        <Header title="Project Not Found" subtitle="" />
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠</div>
          <p style={{ color: '#6B7280', marginBottom: '20px' }}>This project does not exist.</p>
          <Link href="/dashboard" style={{ color: '#D97757', fontWeight: 600, textDecoration: 'none' }}>Back to Dashboard</Link>
        </div>
      </>
    )
  }

  const currentIdx = LIFECYCLE_ORDER.indexOf(project.status)
  const card: React.CSSProperties = { background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px' }
  const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '13px', background: '#FAF9F6', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }

  return (
    <>
      <Header title={project.title} subtitle={project.description || 'Clinical Practice Guideline'} />
      <div style={{ padding: '24px 32px' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: '20px', fontSize: '13px' }}>
          <Link href="/dashboard" style={{ color: '#D97757', textDecoration: 'none' }}>Dashboard</Link>
          <span style={{ color: '#9CA3AF', margin: '0 8px' }}>/</span>
          <span style={{ color: '#6B7280' }}>{project.title}</span>
        </div>

        {/* Lifecycle Progress */}
        <div style={{ ...card, marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Lifecycle Progress</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {LIFECYCLE_ORDER.map((status, i) => {
              const done = i <= currentIdx
              const isCurrent = i === currentIdx
              return (
                <div key={status} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    height: '6px', width: '100%', borderRadius: '3px',
                    background: done ? (STATUS_COLORS[status] || '#D97757') : '#E5E5E0',
                    opacity: isCurrent ? 1 : done ? 0.7 : 0.3,
                  }} />
                  <span style={{
                    fontSize: '9px', textTransform: 'uppercase', fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? (STATUS_COLORS[status] || '#D97757') : done ? '#374151' : '#9CA3AF',
                  }}>
                    {STATUS_LABELS[status]?.split(' ')[0] || status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* Main Details */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Project Details</h3>
              {!editing ? (
                <button onClick={startEdit} style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #E5E5E0', background: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Edit</button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setEditing(false)} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #E5E5E0', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#6B7280' }}>Cancel</button>
                  <button onClick={saveEdit} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Save</button>
                </div>
              )}
            </div>

            {editing ? (
              <div style={{ display: 'grid', gap: '14px' }}>
                <div><label style={lbl}>Title</label><input style={inp} value={editForm.title || ''} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></div>
                <div><label style={lbl}>Description</label><textarea style={{ ...inp, minHeight: '60px' }} value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={lbl}>Status</label>
                    <select style={inp} value={editForm.status || ''} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ProjectStatus })}>
                      {LIFECYCLE_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Target Date</label><input type="date" style={inp} value={editForm.target_date || ''} onChange={(e) => setEditForm({ ...editForm, target_date: e.target.value })} /></div>
                </div>
                <div><label style={lbl}>Target Population</label><input style={inp} value={editForm.target_population || ''} onChange={(e) => setEditForm({ ...editForm, target_population: e.target.value })} /></div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <div style={lbl}>Description</div>
                  <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{project.description || 'No description provided.'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><div style={lbl}>Pathway</div><div style={{ fontSize: '13px' }}>{project.pathway.replace(/_/g, ' ')}</div></div>
                  <div><div style={lbl}>Target Population</div><div style={{ fontSize: '13px' }}>{project.target_population || 'Not specified'}</div></div>
                  <div><div style={lbl}>ICD Codes</div><div style={{ fontSize: '13px' }}>{project.icd_codes?.join(', ') || 'None'}</div></div>
                  <div><div style={lbl}>Target Date</div><div style={{ fontSize: '13px' }}>{project.target_date ? new Date(project.target_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not set'}</div></div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Status */}
            <div style={card}>
              <div style={lbl}>Current Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_COLORS[project.status] || '#9CA3AF' }} />
                <span style={{ fontSize: '15px', fontWeight: 600, color: STATUS_COLORS[project.status] }}>{STATUS_LABELS[project.status]}</span>
              </div>
            </div>

            {/* AGREE II */}
            <div style={card}>
              <div style={lbl}>AGREE II Score</div>
              {project.agree_ii_score != null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    border: `3px solid ${project.agree_ii_score >= 80 ? '#10B981' : project.agree_ii_score >= 60 ? '#F59E0B' : '#EF4444'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: 700,
                    color: project.agree_ii_score >= 80 ? '#10B981' : project.agree_ii_score >= 60 ? '#F59E0B' : '#EF4444',
                  }}>
                    {project.agree_ii_score}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {project.agree_ii_score >= 80 ? 'High Quality' : project.agree_ii_score >= 60 ? 'Moderate Quality' : 'Needs Improvement'}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>Not yet assessed</div>
              )}
            </div>

            {/* Timestamps */}
            <div style={card}>
              <div style={lbl}>Timeline</div>
              <div style={{ display: 'grid', gap: '6px', marginTop: '4px', fontSize: '12px', color: '#6B7280' }}>
                <div>Created: {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <div>Updated: {new Date(project.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                {project.published_at && <div>Published: {new Date(project.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={card}>
              <div style={lbl}>Quick Actions</div>
              <div style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>
                <Link href="/grade" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#374151', textDecoration: 'none', display: 'block' }}>
                  Open GRADE Workflow
                </Link>
                <Link href="/evidence" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#374151', textDecoration: 'none', display: 'block' }}>
                  Search Evidence
                </Link>
                <Link href="/frameworks" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#374151', textDecoration: 'none', display: 'block' }}>
                  Framework Compliance
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
