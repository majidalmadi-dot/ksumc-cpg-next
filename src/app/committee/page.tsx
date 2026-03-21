'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import { logAudit } from '@/lib/audit'

interface CommitteeMember {
  id: string
  name: string
  role: 'Chair' | 'Methodologist' | 'Clinical Expert' | 'Patient Rep' | 'Health Economist' | 'Epidemiologist' | 'External Reviewer' | 'Librarian'
  specialty: string
  institution: string
  email: string
  status: 'active' | 'inactive'
  coiStatus: 'none' | 'disclosed' | 'pending'
  recentActivity: string
  expertiseAreas: string[]
}

const ROLE_COLORS: Record<CommitteeMember['role'], string> = {
  Chair: '#D97757',
  Methodologist: '#6366F1',
  'Clinical Expert': '#10B981',
  'Patient Rep': '#F59E0B',
  'Health Economist': '#8B5CF6',
  Epidemiologist: '#06B6D4',
  'External Reviewer': '#EC4899',
  Librarian: '#14B8A6',
}

const CLINICAL_AREAS = ['Diabetes', 'Cardiology', 'Oncology', 'Respiratory', 'Pediatrics', 'GI/Hepatology', 'Nephrology', 'Public Health']

const SEED_MEMBERS: CommitteeMember[] = [
  { id: '1', name: 'Dr. Mohammed Al-Rashid', role: 'Chair', specialty: 'Cardiology', institution: 'KSUMC', email: 'm.rashid@ksumc.edu.sa', status: 'active', coiStatus: 'none', recentActivity: '3 votes cast, 2 reviews', expertiseAreas: ['Cardiology'] },
  { id: '2', name: 'Dr. Fatima Al-Dosari', role: 'Methodologist', specialty: 'Biostatistics & Evidence Synthesis', institution: 'KFSH&RC', email: 'f.dosari@kfshrc.edu.sa', status: 'active', coiStatus: 'disclosed', recentActivity: '5 reviews completed', expertiseAreas: ['Diabetes', 'Cardiology', 'Oncology'] },
  { id: '3', name: 'Dr. Ahmed Al-Harbi', role: 'Clinical Expert', specialty: 'Endocrinology', institution: 'NGHA', email: 'a.harbi@ngha.med.sa', status: 'active', coiStatus: 'none', recentActivity: '2 votes cast', expertiseAreas: ['Diabetes'] },
  { id: '4', name: 'Mona Al-Subaie', role: 'Patient Rep', specialty: 'Patient Advocacy', institution: 'KAU', email: 'm.subaie@kau.edu.sa', status: 'active', coiStatus: 'pending', recentActivity: '1 review completed', expertiseAreas: ['Diabetes', 'Cardiology'] },
  { id: '5', name: 'Dr. Sarah Al-Otaibi', role: 'Health Economist', specialty: 'Health Economics & HTA', institution: 'KSAU-HS', email: 's.otaibi@ksau-hs.edu.sa', status: 'active', coiStatus: 'none', recentActivity: '4 votes cast, 1 CEA review', expertiseAreas: ['Diabetes', 'Nephrology'] },
  { id: '6', name: 'Dr. Khalid Al-Jabri', role: 'Epidemiologist', specialty: 'Public Health & Epidemiology', institution: 'MOH', email: 'k.jabri@moh.gov.sa', status: 'inactive', coiStatus: 'none', recentActivity: 'No recent activity', expertiseAreas: ['Public Health', 'Oncology'] },
  { id: '7', name: 'Dr. Layla Al-Zamil', role: 'External Reviewer', specialty: 'Pulmonology', institution: 'KFSH&RC', email: 'l.zamil@kfshrc.edu.sa', status: 'active', coiStatus: 'disclosed', recentActivity: '3 reviews completed', expertiseAreas: ['Respiratory', 'Pediatrics'] },
  { id: '8', name: 'Dr. Noor Al-Ghamdi', role: 'Librarian', specialty: 'Medical Librarianship', institution: 'NGHA', email: 'n.ghamdi@ngha.med.sa', status: 'active', coiStatus: 'none', recentActivity: '6 searches executed', expertiseAreas: ['GI/Hepatology', 'Respiratory'] },
]

function getInitials(name: string) {
  return name.split(' ').filter(n => n.length > 2).map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const COI_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  none: { bg: '#D1FAE5', color: '#065F46', label: 'None' },
  disclosed: { bg: '#FEF3C7', color: '#92400E', label: 'Disclosed' },
  pending: { bg: '#FEE2E2', color: '#991B1B', label: 'Pending' },
}

export default function CommitteePage() {
  const [members, setMembers] = useState<CommitteeMember[]>(SEED_MEMBERS)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', role: 'Clinical Expert' as CommitteeMember['role'], specialty: '', institution: '', email: '', orcid: '' })

  const activeCount = members.filter(m => m.status === 'active').length
  const coiClear = members.filter(m => m.coiStatus === 'none').length
  const roles = Object.entries(ROLE_COLORS)

  function handleAddMember() {
    if (!formData.name.trim() || !formData.email.trim()) return
    const newMember: CommitteeMember = {
      id: String(Date.now()),
      name: formData.name.trim(),
      role: formData.role,
      specialty: formData.specialty.trim(),
      institution: formData.institution.trim(),
      email: formData.email.trim(),
      status: 'active',
      coiStatus: 'pending',
      recentActivity: 'New member',
      expertiseAreas: [],
    }
    setMembers(prev => [...prev, newMember])
    logAudit('committee_member.added' as any, 'committee_member' as any, newMember.id, { name: newMember.name, role: newMember.role })
    setShowModal(false)
    setFormData({ name: '', role: 'Clinical Expert', specialty: '', institution: '', email: '', orcid: '' })
  }

  const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '13px', background: '#FAF9F6', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }

  // Donut chart math
  const total = roles.length
  const circumference = 2 * Math.PI * 55

  return (
    <>
      <Header title="Committee Management" subtitle={`${members.length} members across ${roles.length} roles`} />
      <div className="fade-in" style={{ padding: '24px 32px' }}>
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '20px', border: '1px solid var(--border)', borderLeft: '4px solid #D97757' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Members</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{members.length}</div>
            <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px' }}>{activeCount} active</div>
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '20px', border: '1px solid var(--border)', borderLeft: '4px solid #10B981' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>COI Clear</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#10B981' }}>{coiClear}/{members.length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>No conflicts disclosed</div>
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '20px', border: '1px solid var(--border)', borderLeft: '4px solid #6366F1' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Roles Filled</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#6366F1' }}>8/8</div>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>All positions assigned</div>
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '20px', border: '1px solid var(--border)', borderLeft: '4px solid #F59E0B' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Institutions</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#F59E0B' }}>{new Set(members.map(m => m.institution)).size}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>Represented</div>
          </div>
        </div>

        {/* Role Distribution + Add Member */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '20px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', margin: '0 0 16px' }}>Role Distribution</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <svg width="130" height="130" viewBox="0 0 130 130">
                {roles.map(([role, color], i) => {
                  const segLen = circumference / total
                  const offset = -circumference / 4 + i * segLen
                  return <circle key={role} cx="65" cy="65" r="55" fill="none" stroke={color} strokeWidth="12" strokeDasharray={`${segLen - 2} ${circumference - segLen + 2}`} strokeDashoffset={-offset} />
                })}
                <circle cx="65" cy="65" r="42" fill="white" />
                <text x="65" y="65" textAnchor="middle" dy="0.35em" style={{ fontSize: '13px', fontWeight: 600, fill: 'var(--text)' }}>{total}</text>
                <text x="65" y="80" textAnchor="middle" style={{ fontSize: '9px', fill: 'var(--text-light)' }}>Roles</text>
              </svg>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                {roles.map(([role, color]) => (
                  <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-light)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span>{role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-card)', borderRadius: '10px', padding: '20px', border: '1px solid var(--border)' }}>
            <button onClick={() => setShowModal(true)} style={{ padding: '14px 28px', borderRadius: '8px', border: 'none', background: '#D97757', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '12px' }}>
              + Add Committee Member
            </button>
            <p style={{ fontSize: '12px', color: 'var(--text-light)', textAlign: 'center', margin: 0 }}>
              Add clinical experts, methodologists, patient representatives, and other roles.
            </p>
          </div>
        </div>

        {/* Expertise Matrix */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '20px', border: '1px solid var(--border)', marginBottom: '28px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px' }}>Expertise Coverage Matrix</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--text-light)', fontWeight: 600 }}>Member</th>
                  {CLINICAL_AREAS.map(area => (
                    <th key={area} style={{ textAlign: 'center', padding: '10px 6px', color: 'var(--text-light)', fontWeight: 600, fontSize: '11px' }}>{area}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #F0EDE8' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 500 }}>{m.name.replace('Dr. ', '')}</td>
                    {CLINICAL_AREAS.map(area => (
                      <td key={area} style={{ textAlign: 'center', padding: '10px 6px' }}>
                        {m.expertiseAreas.includes(area) ? (
                          <div style={{ display: 'inline-flex', width: '22px', height: '22px', borderRadius: '4px', background: '#10B981', color: 'white', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>✓</div>
                        ) : (
                          <div style={{ display: 'inline-block', width: '22px', height: '22px', borderRadius: '4px', background: '#F3F4F6' }} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Members Table */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px' }}>All Committee Members</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Member', 'Role', 'Specialty', 'Institution', 'Status', 'COI', 'Activity'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--text-light)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map(m => {
                  const coi = COI_BADGE[m.coiStatus]
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #F0EDE8' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: ROLE_COLORS[m.role], color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>{getInitials(m.name)}</div>
                          <div>
                            <div style={{ fontWeight: 500, color: 'var(--text)' }}>{m.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: ROLE_COLORS[m.role], color: 'white' }}>{m.role}</span>
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text)' }}>{m.specialty}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text)', fontWeight: 500 }}>{m.institution}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: m.status === 'active' ? '#D1FAE5' : '#FEE2E2', color: m.status === 'active' ? '#065F46' : '#991B1B' }}>{m.status === 'active' ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: coi.bg, color: coi.color }}>{coi.label}</span>
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-light)', fontSize: '11px' }}>{m.recentActivity}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowModal(false)} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Add Committee Member</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div><label style={lbl}>Full Name *</label><input style={inp} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Dr. First Last" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div><label style={lbl}>Role *</label><select style={inp} value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as any })}>{Object.keys(ROLE_COLORS).map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                <div><label style={lbl}>Institution</label><input style={inp} value={formData.institution} onChange={e => setFormData({ ...formData, institution: e.target.value })} placeholder="KSUMC, NGHA, etc." /></div>
              </div>
              <div><label style={lbl}>Specialty</label><input style={inp} value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value })} placeholder="e.g., Cardiology" /></div>
              <div><label style={lbl}>Email *</label><input style={inp} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="member@institution.edu.sa" /></div>
              <div><label style={lbl}>ORCID (optional)</label><input style={inp} value={formData.orcid} onChange={e => setFormData({ ...formData, orcid: e.target.value })} placeholder="XXXX-XXXX-XXXX-XXXX" /></div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid #E5E5E0', background: 'white', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddMember} style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Add Member</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
