'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Header from '@/components/Header'
import { type AuditEntry, type AuditAction, type EntityType, getSeedAuditLogs, getAuditLogs } from '@/lib/audit'

const ACTION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  'project.created': { bg: '#ECFDF5', text: '#059669', label: 'Created' },
  'project.updated': { bg: '#EFF6FF', text: '#2563EB', label: 'Updated' },
  'project.status_changed': { bg: '#FFF7ED', text: '#D97757', label: 'Status Change' },
  'project.deleted': { bg: '#FEF2F2', text: '#DC2626', label: 'Deleted' },
  'recommendation.created': { bg: '#ECFDF5', text: '#059669', label: 'Recommendation' },
  'recommendation.updated': { bg: '#EFF6FF', text: '#2563EB', label: 'Rec. Updated' },
  'grade.assessed': { bg: '#F5F3FF', text: '#7C3AED', label: 'GRADE' },
  'etr.completed': { bg: '#FDF4FF', text: '#A855F7', label: 'EtR Complete' },
  'delphi.round_opened': { bg: '#FFF7ED', text: '#EA580C', label: 'Delphi Open' },
  'delphi.round_closed': { bg: '#FFF1F2', text: '#E11D48', label: 'Delphi Closed' },
  'delphi.vote_cast': { bg: '#F0FDF4', text: '#16A34A', label: 'Vote' },
  'committee.member_added': { bg: '#ECFDF5', text: '#059669', label: 'Member Added' },
  'committee.member_removed': { bg: '#FEF2F2', text: '#DC2626', label: 'Member Removed' },
  'export.generated': { bg: '#F0F9FF', text: '#0284C7', label: 'Export' },
  'auth.login': { bg: '#F5F5F4', text: '#57534E', label: 'Login' },
  'auth.logout': { bg: '#F5F5F4', text: '#57534E', label: 'Logout' },
  'search.pubmed': { bg: '#EFF6FF', text: '#2563EB', label: 'Search' },
  'ai.query': { bg: '#FDF4FF', text: '#9333EA', label: 'AI Query' },
}

const ENTITY_ICONS: Record<string, string> = {
  project: '◉',
  recommendation: '⬆',
  delphi_round: '↻',
  vote: '✓',
  committee_member: '◈',
  export: '▤',
  session: '⚙',
  search: '⊕',
  ai_command: '✦',
}

const ACTION_OPTIONS: { value: AuditAction | ''; label: string }[] = [
  { value: '', label: 'All Actions' },
  { value: 'project.created', label: 'Project Created' },
  { value: 'project.updated', label: 'Project Updated' },
  { value: 'project.status_changed', label: 'Status Changed' },
  { value: 'recommendation.created', label: 'Recommendation Created' },
  { value: 'grade.assessed', label: 'GRADE Assessed' },
  { value: 'etr.completed', label: 'EtR Completed' },
  { value: 'delphi.round_opened', label: 'Delphi Round Opened' },
  { value: 'delphi.round_closed', label: 'Delphi Round Closed' },
  { value: 'delphi.vote_cast', label: 'Vote Cast' },
  { value: 'export.generated', label: 'Export Generated' },
  { value: 'auth.login', label: 'Login' },
  { value: 'search.pubmed', label: 'PubMed Search' },
  { value: 'ai.query', label: 'AI Query' },
]

const ENTITY_OPTIONS: { value: EntityType | ''; label: string }[] = [
  { value: '', label: 'All Entities' },
  { value: 'project', label: 'Projects' },
  { value: 'recommendation', label: 'Recommendations' },
  { value: 'delphi_round', label: 'Delphi Rounds' },
  { value: 'vote', label: 'Votes' },
  { value: 'committee_member', label: 'Committee' },
  { value: 'export', label: 'Exports' },
  { value: 'session', label: 'Sessions' },
  { value: 'search', label: 'Searches' },
  { value: 'ai_command', label: 'AI Commands' },
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDetails(details: Record<string, unknown> | null): string {
  if (!details) return ''
  const parts: string[] = []
  for (const [key, val] of Object.entries(details)) {
    if (val === null || val === undefined) continue
    const label = key.replace(/_/g, ' ')
    parts.push(`${label}: ${String(val)}`)
  }
  return parts.join(' · ')
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('')
  const [entityFilter, setEntityFilter] = useState<EntityType | ''>('')
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const pageSize = 20

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getAuditLogs(pageSize, page * pageSize, {
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
      })
      if (result.logs.length > 0) {
        setLogs(result.logs)
        setTotal(result.total)
      } else {
        // Use seed data for demo
        let seeds = getSeedAuditLogs()
        if (actionFilter) seeds = seeds.filter((s) => s.action === actionFilter)
        if (entityFilter) seeds = seeds.filter((s) => s.entity_type === entityFilter)
        setTotal(seeds.length)
        setLogs(seeds.slice(page * pageSize, (page + 1) * pageSize))
      }
    } catch {
      const seeds = getSeedAuditLogs()
      setLogs(seeds.slice(0, pageSize))
      setTotal(seeds.length)
    }
    setLoading(false)
  }, [actionFilter, entityFilter, page])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // Stats from current logs (memoized to avoid hydration issues with Date)
  const allSeeds = useMemo(() => getSeedAuditLogs(), [])
  const { todayLogs, projectActions, uniqueEntities } = useMemo(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    return {
      todayLogs: allSeeds.filter((l) => new Date(l.created_at) >= todayStart),
      projectActions: allSeeds.filter((l) => l.entity_type === 'project'),
      uniqueEntities: new Set(allSeeds.map((l) => l.entity_id).filter(Boolean)),
    }
  }, [allSeeds])

  const card: React.CSSProperties = { background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px' }
  const select: React.CSSProperties = { padding: '6px 10px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '12px', background: '#FAF9F6', cursor: 'pointer' }

  // Activity heatmap data (last 7 days) — memoized for hydration safety
  const { heatmapDays, maxCount } = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999)
      const count = allSeeds.filter((l) => { const t = new Date(l.created_at); return t >= dayStart && t <= dayEnd }).length
      return { day: d.toLocaleDateString('en-US', { weekday: 'short' }), count }
    })
    return { heatmapDays: days, maxCount: Math.max(...days.map((d) => d.count), 1) }
  }, [allSeeds])

  return (
    <>
      <Header title="Audit Trail" subtitle="Complete activity log — every action tracked for compliance and governance" />
      <div className="fade-in" style={{ padding: '0' }}>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Events', value: allSeeds.length, color: '#D97757', icon: '◉' },
          { label: 'Today', value: todayLogs.length, color: '#059669', icon: '◎' },
          { label: 'Project Actions', value: projectActions.length, color: '#2563EB', icon: '⬡' },
          { label: 'Entities Tracked', value: uniqueEntities.size, color: '#7C3AED', icon: '◈' },
        ].map((stat) => (
          <div key={stat.label} className="card-hover" style={{ ...card, display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: stat.color }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Heatmap */}
      <div style={{ ...card, marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>7-Day Activity</h3>
          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{allSeeds.length} total events</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '80px' }}>
          {heatmapDays.map((d) => {
            const pct = d.count / maxCount
            return (
              <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>{d.count}</span>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  height: `${Math.max(pct * 60, 4)}px`,
                  background: pct > 0.7 ? '#D97757' : pct > 0.3 ? '#E8956F' : '#F3D5C8',
                  transition: 'height 0.6s ease, background 0.3s',
                }} />
                <span style={{ fontSize: '10px', color: '#9CA3AF' }}>{d.day}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div style={{ ...card, marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E1E2E' }}>Filters</div>
        <select
          aria-label="Filter by action type"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value as AuditAction | ''); setPage(0) }}
          style={select}
        >
          {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          aria-label="Filter by entity type"
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value as EntityType | ''); setPage(0) }}
          style={select}
        >
          {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {(actionFilter || entityFilter) && (
          <button
            onClick={() => { setActionFilter(''); setEntityFilter(''); setPage(0) }}
            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#F5F5F0', color: '#6B7280', fontSize: '12px', cursor: 'pointer' }}
          >
            Clear Filters
          </button>
        )}
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#9CA3AF' }}>
          {total} event{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Timeline */}
      <div style={card}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF', fontSize: '13px' }}>Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF', fontSize: '13px' }}>No audit events found</div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Vertical timeline line */}
            <div style={{ position: 'absolute', left: '19px', top: '12px', bottom: '12px', width: '2px', background: '#E5E5E0' }} />

            {logs.map((entry, i) => {
              const actionInfo = ACTION_COLORS[entry.action] || { bg: '#F5F5F4', text: '#6B7280', label: entry.action }
              const icon = ENTITY_ICONS[entry.entity_type] || '•'
              const isExpanded = expandedId === entry.id

              return (
                <div
                  key={entry.id}
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  style={{
                    position: 'relative',
                    paddingLeft: '48px',
                    paddingBottom: i < logs.length - 1 ? '20px' : '0',
                    cursor: 'pointer',
                  }}
                >
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute', left: '10px', top: '4px',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: actionInfo.bg, border: `2px solid ${actionInfo.text}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', zIndex: 1,
                  }}>
                    {icon}
                  </div>

                  {/* Content */}
                  <div style={{
                    padding: '10px 14px', borderRadius: '8px',
                    border: `1px solid ${isExpanded ? actionInfo.text + '40' : '#F3F4F6'}`,
                    background: isExpanded ? actionInfo.bg + '40' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                        background: actionInfo.bg, color: actionInfo.text,
                        fontSize: '11px', fontWeight: 600,
                      }}>
                        {actionInfo.label}
                      </span>
                      {entry.entity_id && (
                        <span style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace' }}>
                          {entry.entity_id}
                        </span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                        {timeAgo(entry.created_at)}
                      </span>
                    </div>

                    {entry.details && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#6B7280', lineHeight: 1.5 }}>
                        {formatDetails(entry.details)}
                      </div>
                    )}

                    {isExpanded && (
                      <div style={{ marginTop: '10px', padding: '10px', borderRadius: '6px', background: '#FAF9F6', fontSize: '11px', fontFamily: 'monospace', color: '#374151', lineHeight: 1.6 }}>
                        <div><strong>ID:</strong> {entry.id}</div>
                        <div><strong>Action:</strong> {entry.action}</div>
                        <div><strong>Entity:</strong> {entry.entity_type}{entry.entity_id ? ` / ${entry.entity_id}` : ''}</div>
                        <div><strong>User:</strong> {entry.user_id || 'system / demo'}</div>
                        <div><strong>Timestamp:</strong> {new Date(entry.created_at).toLocaleString()}</div>
                        {entry.details && (
                          <div style={{ marginTop: '6px' }}>
                            <strong>Details:</strong>
                            <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: '10px', color: '#6B7280' }}>
                              {JSON.stringify(entry.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {total > pageSize && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #E5E5E0', background: 'white', fontSize: '12px', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}
            >
              ← Previous
            </button>
            <span style={{ padding: '6px 14px', fontSize: '12px', color: '#6B7280' }}>
              Page {page + 1} of {Math.ceil(total / pageSize)}
            </span>
            <button
              onClick={() => setPage(Math.min(Math.ceil(total / pageSize) - 1, page + 1))}
              disabled={page >= Math.ceil(total / pageSize) - 1}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #E5E5E0', background: 'white', fontSize: '12px', cursor: page >= Math.ceil(total / pageSize) - 1 ? 'default' : 'pointer', opacity: page >= Math.ceil(total / pageSize) - 1 ? 0.4 : 1 }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
      </div>
    </>
  )
}
