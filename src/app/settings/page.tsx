'use client'

import { useState } from 'react'
import Header from '@/components/Header'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'editor' | 'reviewer' | 'viewer'
  institution: string
  specialty: string
  lastActive: string
}

const TEAM_MEMBERS: TeamMember[] = [
  { id: '1', name: 'Dr. Majid Almadi', email: 'majid.almadi@ksumc.edu.sa', role: 'admin', institution: 'KSUMC', specialty: 'Gastroenterology', lastActive: '2026-03-21' },
  { id: '2', name: 'Dr. Sara Al-Dosari', email: 's.aldosari@ksumc.edu.sa', role: 'editor', institution: 'KSUMC', specialty: 'Public Health', lastActive: '2026-03-20' },
  { id: '3', name: 'Dr. Ahmed Al-Rashid', email: 'a.alrashid@ksumc.edu.sa', role: 'editor', institution: 'KSUMC', specialty: 'Health Economics', lastActive: '2026-03-19' },
  { id: '4', name: 'Dr. Fatimah Al-Zahrani', email: 'f.alzahrani@ksumc.edu.sa', role: 'reviewer', institution: 'KAU', specialty: 'Epidemiology', lastActive: '2026-03-18' },
  { id: '5', name: 'Dr. Khalid Al-Otaibi', email: 'k.alotaibi@moh.gov.sa', role: 'reviewer', institution: 'MOH', specialty: 'Healthcare Quality', lastActive: '2026-03-17' },
  { id: '6', name: 'Dr. Nora Al-Shammari', email: 'n.alshammari@ngha.med.sa', role: 'viewer', institution: 'NGHA', specialty: 'Internal Medicine', lastActive: '2026-03-15' },
]

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  admin: { bg: '#FEE2E2', color: '#DC2626' },
  editor: { bg: '#EDE9FE', color: '#7C3AED' },
  reviewer: { bg: '#FEF3C7', color: '#D97706' },
  viewer: { bg: '#F3F4F6', color: '#6B7280' },
}

const INTEGRATIONS = [
  { name: 'Supabase', description: 'Database and authentication backend', status: 'connected', icon: '⚡' },
  { name: 'PubMed E-utilities', description: 'NCBI literature search API', status: 'connected', icon: '📚' },
  { name: 'Gemini AI', description: 'Google Gemini for guideline assistance', status: 'pending', icon: '✦' },
  { name: 'ORCID', description: 'Author identification and verification', status: 'disconnected', icon: '🆔' },
  { name: 'CrossRef', description: 'DOI resolution and citation metadata', status: 'disconnected', icon: '🔗' },
  { name: 'Cochrane Library', description: 'Systematic review database access', status: 'disconnected', icon: '🔬' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'integrations' | 'platform'>('profile')
  const [profile, setProfile] = useState({
    name: 'Dr. Majid Almadi',
    email: 'majid.almadi@ksumc.edu.sa',
    institution: 'King Saud University Medical City',
    specialty: 'Gastroenterology',
    orcid: '0000-0002-1234-5678',
  })
  const [platformSettings, setPlatformSettings] = useState({
    idleTimeout: 15,
    sessionLength: 480,
    requireMFA: false,
    auditLogging: true,
    autoSave: true,
    darkMode: false,
    language: 'en',
    defaultPathway: 'de_novo',
    gradeDefault: 'rct',
    notifyOverdue: true,
    notifyReview: true,
    notifyPublish: true,
  })
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const card: React.CSSProperties = { background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px' }
  const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '13px', background: '#FAF9F6', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }

  const tabs = [
    { key: 'profile' as const, label: 'Profile' },
    { key: 'team' as const, label: 'Team Members' },
    { key: 'integrations' as const, label: 'Integrations' },
    { key: 'platform' as const, label: 'Platform' },
  ]

  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
    connected: { bg: '#D1FAE5', color: '#059669', label: 'Connected' },
    pending: { bg: '#FEF3C7', color: '#D97706', label: 'Pending Setup' },
    disconnected: { bg: '#F3F4F6', color: '#6B7280', label: 'Not Connected' },
  }

  return (
    <>
      <Header title="Settings" subtitle="Platform configuration, team management, and integrations" />
      <div style={{ padding: '24px 32px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#F3F4F6', borderRadius: '8px', padding: '4px' }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              flex: 1, padding: '10px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: activeTab === t.key ? 'white' : 'transparent',
              color: activeTab === t.key ? '#1A1A1A' : '#6B7280',
              fontWeight: activeTab === t.key ? 600 : 400, fontSize: '13px',
              boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div style={{ maxWidth: '640px' }}>
            <div style={card}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>Your Profile</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div><label style={lbl}>Full Name</label><input style={inp} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
                <div><label style={lbl}>Email</label><input style={inp} value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></div>
                <div><label style={lbl}>Institution</label><input style={inp} value={profile.institution} onChange={(e) => setProfile({ ...profile, institution: e.target.value })} /></div>
                <div><label style={lbl}>Specialty</label><input style={inp} value={profile.specialty} onChange={(e) => setProfile({ ...profile, specialty: e.target.value })} /></div>
                <div style={{ gridColumn: 'span 2' }}><label style={lbl}>ORCID</label><input style={inp} value={profile.orcid} onChange={(e) => setProfile({ ...profile, orcid: e.target.value })} /></div>
              </div>
              <button onClick={handleSave} style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {saved ? 'Saved!' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Team Members ({TEAM_MEMBERS.length})</h3>
              <button style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Invite Member</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E5E0' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Member</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Role</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Institution</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Last Active</th>
                  <th style={{ padding: '10px 12px' }}></th>
                </tr>
              </thead>
              <tbody>
                {TEAM_MEMBERS.map((m) => {
                  const rc = ROLE_COLORS[m.role]
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #D97757, #E8956F)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '11px', fontWeight: 600,
                          }}>
                            {m.name.split(' ').filter((_, i) => i === 0 || i === m.name.split(' ').length - 1).map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{m.name}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: rc.bg, color: rc.color, fontWeight: 600 }}>
                          {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6B7280' }}>{m.institution}</td>
                      <td style={{ padding: '10px 12px', color: '#6B7280' }}>
                        {new Date(m.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <button style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #E5E5E0', background: 'white', fontSize: '11px', cursor: 'pointer', color: '#374151' }}>Edit</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {INTEGRATIONS.map((int) => {
              const sc = statusColors[int.status]
              return (
                <div key={int.name} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ fontSize: '24px', width: '40px', height: '40px', borderRadius: '8px', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {int.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{int.name}</div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>{int.description}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '10px', background: sc.bg, color: sc.color, fontWeight: 600, marginBottom: '6px' }}>{sc.label}</div>
                    {int.status !== 'connected' && (
                      <button style={{ padding: '4px 12px', borderRadius: '4px', border: 'none', background: '#D97757', color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Connect</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Platform Tab */}
        {activeTab === 'platform' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Security */}
            <div style={card}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Security & Sessions</h3>
              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Idle Timeout (minutes)</label>
                <input type="number" style={inp} value={platformSettings.idleTimeout} onChange={(e) => setPlatformSettings({ ...platformSettings, idleTimeout: parseInt(e.target.value) || 15 })} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Max Session Length (minutes)</label>
                <input type="number" style={inp} value={platformSettings.sessionLength} onChange={(e) => setPlatformSettings({ ...platformSettings, sessionLength: parseInt(e.target.value) || 480 })} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '8px' }}>
                <input type="checkbox" checked={platformSettings.requireMFA} onChange={(e) => setPlatformSettings({ ...platformSettings, requireMFA: e.target.checked })} />
                Require Multi-Factor Authentication
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={platformSettings.auditLogging} onChange={(e) => setPlatformSettings({ ...platformSettings, auditLogging: e.target.checked })} />
                Enable Audit Logging
              </label>
            </div>

            {/* Defaults */}
            <div style={card}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Guideline Defaults</h3>
              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Default Pathway</label>
                <select style={inp} value={platformSettings.defaultPathway} onChange={(e) => setPlatformSettings({ ...platformSettings, defaultPathway: e.target.value })}>
                  <option value="de_novo">De Novo</option>
                  <option value="adaptation">Adaptation</option>
                  <option value="adoption">Adoption</option>
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Default Study Design</label>
                <select style={inp} value={platformSettings.gradeDefault} onChange={(e) => setPlatformSettings({ ...platformSettings, gradeDefault: e.target.value })}>
                  <option value="rct">Randomized Controlled Trial</option>
                  <option value="observational">Observational Study</option>
                  <option value="case_series">Case Series</option>
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Language</label>
                <select style={inp} value={platformSettings.language} onChange={(e) => setPlatformSettings({ ...platformSettings, language: e.target.value })}>
                  <option value="en">English</option>
                  <option value="ar">Arabic (العربية)</option>
                  <option value="both">Bilingual (English + Arabic)</option>
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={platformSettings.autoSave} onChange={(e) => setPlatformSettings({ ...platformSettings, autoSave: e.target.checked })} />
                Auto-save drafts every 30 seconds
              </label>
            </div>

            {/* Notifications */}
            <div style={card}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Notifications</h3>
              {[
                { key: 'notifyOverdue', label: 'Overdue milestone alerts' },
                { key: 'notifyReview', label: 'External review requests' },
                { key: 'notifyPublish', label: 'Publication notifications' },
              ].map((n) => (
                <label key={n.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '8px' }}>
                  <input type="checkbox" checked={(platformSettings as Record<string, boolean | string | number>)[n.key] as boolean} onChange={(e) => setPlatformSettings({ ...platformSettings, [n.key]: e.target.checked })} />
                  {n.label}
                </label>
              ))}
            </div>

            {/* Data */}
            <div style={card}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Data & Export</h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                <button style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #E5E5E0', background: 'white', fontSize: '13px', cursor: 'pointer', color: '#374151', textAlign: 'left' }}>
                  Export All Guidelines (JSON)
                </button>
                <button style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #E5E5E0', background: 'white', fontSize: '13px', cursor: 'pointer', color: '#374151', textAlign: 'left' }}>
                  Export Audit Logs (CSV)
                </button>
                <button style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #E5E5E0', background: 'white', fontSize: '13px', cursor: 'pointer', color: '#374151', textAlign: 'left' }}>
                  Download AGREE II Reports (PDF)
                </button>
                <button style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #E5E5E0', background: 'white', fontSize: '13px', cursor: 'pointer', color: '#374151', textAlign: 'left' }}>
                  Database Backup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Button (Platform) */}
        {activeTab === 'platform' && (
          <div style={{ marginTop: '20px' }}>
            <button onClick={handleSave} style={{ padding: '10px 32px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              {saved ? 'Settings Saved!' : 'Save All Settings'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
