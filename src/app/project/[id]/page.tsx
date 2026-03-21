'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import AIAssistant from '@/components/AIAssistant'
import { SEED_PROJECTS } from '@/lib/projects'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import type { Project, ProjectStatus } from '@/types/database'

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
const LIFECYCLE_ORDER: ProjectStatus[] = ['planning', 'scoping', 'evidence_search', 'grade_appraisal', 'etr_consensus', 'external_review', 'published']

interface Milestone {
  id: string; label: string; date: string; status: 'completed' | 'current' | 'upcoming'; note: string
}

interface Recommendation {
  id: string; text: string; strength: 'strong' | 'conditional'; direction: 'for' | 'against'; certainty: 'high' | 'moderate' | 'low' | 'very_low'
}

function getMilestones(project: Project): Milestone[] {
  const created = new Date(project.created_at)
  const idx = LIFECYCLE_ORDER.indexOf(project.status)
  return LIFECYCLE_ORDER.map((s, i) => {
    const d = new Date(created)
    d.setDate(d.getDate() + i * 30)
    return {
      id: s, label: STATUS_LABELS[s],
      date: i <= idx ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Planned',
      status: i < idx ? 'completed' as const : i === idx ? 'current' as const : 'upcoming' as const,
      note: i < idx ? 'Completed' : i === idx ? 'In progress' : `Step ${i + 1} of 7`,
    }
  })
}

function getSeedRecommendations(project: Project): Recommendation[] {
  const recs: Record<string, Recommendation[]> = {
    '1': [{ id: 'r1', text: 'Inhaled corticosteroids as first-line controller therapy for persistent asthma', strength: 'strong', direction: 'for', certainty: 'high' }, { id: 'r2', text: 'Step-up to ICS/LABA combination if symptoms not controlled on low-dose ICS', strength: 'strong', direction: 'for', certainty: 'moderate' }],
    '2': [{ id: 'r1', text: 'Metformin as first-line pharmacotherapy for T2DM', strength: 'strong', direction: 'for', certainty: 'high' }, { id: 'r2', text: 'GLP-1 RA for patients with established CVD and inadequate control on metformin', strength: 'conditional', direction: 'for', certainty: 'moderate' }],
    '4': [{ id: 'r1', text: 'Colonoscopy screening beginning at age 45 for average-risk adults', strength: 'strong', direction: 'for', certainty: 'moderate' }],
  }
  return recs[project.id] || [{ id: 'r0', text: `Draft recommendation for ${project.title} — pending evidence synthesis`, strength: 'conditional', direction: 'for', certainty: 'low' }]
}

const CERTAINTY_COLORS: Record<string, { bg: string; color: string }> = {
  high: { bg: '#D1FAE5', color: '#065F46' }, moderate: { bg: '#DBEAFE', color: '#1E40AF' },
  low: { bg: '#FEF3C7', color: '#92400E' }, very_low: { bg: '#FEE2E2', color: '#991B1B' },
}
const STRENGTH_ICON: Record<string, string> = { strong: '⬆⬆', conditional: '⬆?' }

export default function ProjectDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Project>>({})
  const [activeTab, setActiveTab] = useState<'overview' | 'recommendations' | 'timeline'>('overview')

  useEffect(() => {
    async function load() {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()
          if (!error && data) { setProject(data); setLoading(false); return }
        } catch { /* fall through */ }
      }
      setProject(SEED_PROJECTS.find(p => p.id === id) || null)
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
    setProject(updated); setEditing(false)
    const changedFields: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(editForm)) {
      if (val !== (project as unknown as Record<string, unknown>)[key]) changedFields[key] = val
    }
    logAudit(changedFields.status ? 'project.status_changed' as any : 'project.updated' as any, 'project', project.id, changedFields)
    if (isSupabaseConfigured) { try { await supabase.from('projects').update(editForm).eq('id', project.id) } catch {} }
  }

  if (loading) return (<><Header title="Loading..." subtitle="" /><div style={{ padding: '32px' }}><div className="skeleton" style={{ height: '200px', borderRadius: '10px' }} /></div></>)
  if (!project) return (<><Header title="Not Found" subtitle="" /><div style={{ padding: '60px', textAlign: 'center' }}><div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠</div><p style={{ color: '#6B7280', marginBottom: '20px' }}>Project not found.</p><Link href="/dashboard" style={{ color: '#D97757', fontWeight: 600, textDecoration: 'none' }}>Back to Dashboard</Link></div></>)

  const currentIdx = LIFECYCLE_ORDER.indexOf(project.status)
  const progress = project.status === 'published' ? 100 : Math.round(((currentIdx + 1) / 7) * 100)
  const milestones = getMilestones(project)
  const recommendations = getSeedRecommendations(project)
  const card: React.CSSProperties = { background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px' }
  const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '13px', background: '#FAF9F6', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }

  return (
    <>
      <Header title={project.title} subtitle={project.description || 'Clinical Practice Guideline'} />
      <div className="fade-in" style={{ padding: '24px 32px' }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: '16px', fontSize: '13px' }}>
          <Link href="/dashboard" style={{ color: '#D97757', textDecoration: 'none' }}>Dashboard</Link>
          <span style={{ color: '#9CA3AF', margin: '0 8px' }}>/</span>
          <span style={{ color: '#6B7280' }}>{project.title}</span>
        </div>

        {/* Status Bar */}
        <div style={{ ...card, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_COLORS[project.status] }} />
            <span style={{ fontSize: '15px', fontWeight: 600, color: STATUS_COLORS[project.status] }}>{STATUS_LABELS[project.status]}</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: '200px' }}>
            <div style={{ flex: 1, height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: STATUS_COLORS[project.status], borderRadius: '4px', transition: 'width 0.5s' }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-light)' }}>{progress}%</span>
          </div>
          <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '4px', background: '#FEF3C7', color: '#92400E', fontWeight: 500 }}>{project.pathway.replace(/_/g, ' ')}</span>
          {project.agree_ii_score != null && (
            <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '4px', background: project.agree_ii_score >= 80 ? '#D1FAE5' : '#FEF3C7', color: project.agree_ii_score >= 80 ? '#065F46' : '#92400E', fontWeight: 600 }}>AGREE II: {project.agree_ii_score}%</span>
          )}
        </div>

        {/* Lifecycle Progress Steps */}
        <div style={{ ...card, marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {LIFECYCLE_ORDER.map((status, i) => {
              const done = i <= currentIdx
              const isCurrent = i === currentIdx
              return (
                <div key={status} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    {i > 0 && <div style={{ flex: 1, height: '2px', background: done ? STATUS_COLORS[status] : '#E5E5E0' }} />}
                    <div style={{
                      width: isCurrent ? '28px' : '22px', height: isCurrent ? '28px' : '22px', borderRadius: '50%',
                      background: done ? STATUS_COLORS[status] : '#E5E5E0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 700, color: done ? 'white' : '#9CA3AF',
                      flexShrink: 0, transition: 'all 0.2s',
                      boxShadow: isCurrent ? `0 0 0 4px ${STATUS_COLORS[status]}30` : 'none',
                    }}>{done ? '✓' : i + 1}</div>
                    {i < LIFECYCLE_ORDER.length - 1 && <div style={{ flex: 1, height: '2px', background: i < currentIdx ? STATUS_COLORS[LIFECYCLE_ORDER[i + 1]] : '#E5E5E0' }} />}
                  </div>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? STATUS_COLORS[status] : done ? '#374151' : '#9CA3AF', textAlign: 'center', lineHeight: 1.2 }}>
                    {STATUS_LABELS[status]?.split(' ')[0]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #E5E5E0', paddingBottom: '0' }}>
          {(['overview', 'recommendations', 'timeline'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '10px 20px', border: 'none', borderBottom: activeTab === tab ? '2px solid #D97757' : '2px solid transparent',
              background: 'transparent', fontSize: '13px', fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? '#D97757' : '#6B7280', cursor: 'pointer', textTransform: 'capitalize', marginBottom: '-2px',
            }}>{tab}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* Main Content */}
          <div>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
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
                    <div><label style={lbl}>Title</label><input style={inp} value={editForm.title || ''} onChange={e => setEditForm({ ...editForm, title: e.target.value })} /></div>
                    <div><label style={lbl}>Description</label><textarea style={{ ...inp, minHeight: '60px' }} value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div><label style={lbl}>Status</label><select style={inp} value={editForm.status || ''} onChange={e => setEditForm({ ...editForm, status: e.target.value as ProjectStatus })}>{LIFECYCLE_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></div>
                      <div><label style={lbl}>Target Date</label><input type="date" style={inp} value={editForm.target_date || ''} onChange={e => setEditForm({ ...editForm, target_date: e.target.value })} /></div>
                    </div>
                    <div><label style={lbl}>Target Population</label><input style={inp} value={editForm.target_population || ''} onChange={e => setEditForm({ ...editForm, target_population: e.target.value })} /></div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '14px' }}>
                    <div><div style={lbl}>Description</div><div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{project.description || 'No description.'}</div></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div><div style={lbl}>Pathway</div><div style={{ fontSize: '13px' }}>{project.pathway.replace(/_/g, ' ')}</div></div>
                      <div><div style={lbl}>Target Population</div><div style={{ fontSize: '13px' }}>{project.target_population || 'Not specified'}</div></div>
                      <div><div style={lbl}>ICD Codes</div><div style={{ fontSize: '13px' }}>{project.icd_codes?.join(', ') || 'None'}</div></div>
                      <div><div style={lbl}>Target Date</div><div style={{ fontSize: '13px' }}>{project.target_date ? new Date(project.target_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not set'}</div></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>Created: {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>Updated: {new Date(project.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      {project.published_at && <div style={{ fontSize: '11px', color: '#10B981' }}>Published: {new Date(project.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recommendations Tab */}
            {activeTab === 'recommendations' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Draft Recommendations ({recommendations.length})</h3>
                  <Link href="/grade" style={{ fontSize: '12px', color: '#D97757', fontWeight: 600, textDecoration: 'none' }}>Open GRADE →</Link>
                </div>
                {recommendations.map((rec, i) => {
                  const cert = CERTAINTY_COLORS[rec.certainty]
                  return (
                    <div key={rec.id} style={card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-light)' }}>Rec. {i + 1}</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: rec.strength === 'strong' ? '#D1FAE5' : '#FEF3C7', color: rec.strength === 'strong' ? '#065F46' : '#92400E', fontWeight: 600 }}>{STRENGTH_ICON[rec.strength]} {rec.strength} {rec.direction}</span>
                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: cert.bg, color: cert.color, fontWeight: 600 }}>{rec.certainty.replace('_', ' ')} certainty</span>
                        </div>
                      </div>
                      <p style={{ fontSize: '13px', lineHeight: 1.6, margin: 0, color: 'var(--text)' }}>{rec.text}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div style={card}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 20px' }}>Development Milestones</h3>
                <div style={{ position: 'relative', paddingLeft: '24px' }}>
                  {/* Vertical line */}
                  <div style={{ position: 'absolute', left: '7px', top: '8px', bottom: '8px', width: '2px', background: '#E5E5E0' }} />
                  {milestones.map((m, i) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: i < milestones.length - 1 ? '24px' : 0, position: 'relative' }}>
                      {/* Dot */}
                      <div style={{
                        position: 'absolute', left: '-20px', top: '4px',
                        width: m.status === 'current' ? '16px' : '12px', height: m.status === 'current' ? '16px' : '12px',
                        borderRadius: '50%', flexShrink: 0,
                        background: m.status === 'completed' ? '#10B981' : m.status === 'current' ? '#D97757' : '#E5E5E0',
                        border: m.status === 'current' ? '3px solid #D9775740' : 'none',
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: m.status === 'current' ? 700 : 500, color: m.status === 'upcoming' ? '#9CA3AF' : 'var(--text)' }}>{m.label}</div>
                        <div style={{ fontSize: '11px', color: m.status === 'completed' ? '#10B981' : m.status === 'current' ? '#D97757' : '#9CA3AF', marginTop: '2px' }}>{m.note}</div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{m.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Quick Actions */}
            <div style={card}>
              <div style={lbl}>Quick Actions</div>
              <div style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>
                {[
                  { href: '/grade', label: 'GRADE Workflow', icon: '⬆' },
                  { href: '/evidence', label: 'Evidence Search', icon: '⊕' },
                  { href: '/delphi', label: 'Delphi Voting', icon: '◎' },
                  { href: '/reports', label: 'Generate Report', icon: '⊟' },
                  { href: '/committee', label: 'Committee', icon: '⊡' },
                ].map(a => (
                  <Link key={a.href} href={a.href} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', background: 'white', fontSize: '12px', color: '#374151', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{a.icon}</span>{a.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* AGREE II Score */}
            <div style={card}>
              <div style={lbl}>AGREE II Score</div>
              {project.agree_ii_score != null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: `3px solid ${project.agree_ii_score >= 80 ? '#10B981' : project.agree_ii_score >= 60 ? '#F59E0B' : '#EF4444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: project.agree_ii_score >= 80 ? '#10B981' : project.agree_ii_score >= 60 ? '#F59E0B' : '#EF4444' }}>{project.agree_ii_score}%</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{project.agree_ii_score >= 80 ? 'High Quality' : project.agree_ii_score >= 60 ? 'Moderate' : 'Needs Improvement'}</div>
                </div>
              ) : <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>Not yet assessed</div>}
            </div>

            {/* AI Assistant */}
            <AIAssistant
              context={`Project "${project.title}" (ID: ${project.id}). Status: ${STATUS_LABELS[project.status]}. Pathway: ${project.pathway}. Population: ${project.target_population || 'not set'}. Description: ${project.description || 'none'}. AGREE II: ${project.agree_ii_score ?? 'not assessed'}. Target: ${project.target_date || 'not set'}. Recommendations: ${recommendations.length}.`}
              placeholder="Ask about this project..."
              compact
              quickActions={[
                { label: 'Next steps', prompt: `This guideline "${project.title}" is in "${STATUS_LABELS[project.status]}". What concrete tasks are needed to complete this phase and advance?` },
                { label: 'Improve scope', prompt: `Help refine the scope for "${project.title}". Description: "${project.description || 'not set'}". Population: "${project.target_population || 'not set'}". Make it clearer and more actionable.` },
                { label: 'Timeline', prompt: `"${project.title}" created ${project.created_at}, target ${project.target_date || 'not set'}, currently in "${STATUS_LABELS[project.status]}". Is this timeline realistic? What milestones should we set?` },
                { label: 'Saudi context', prompt: `For "${project.title}" targeting "${project.target_population || 'general population'}", what Saudi-specific factors matter? Vision 2030, MOH, local epidemiology, SCFHS, cultural factors.` },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  )
}
