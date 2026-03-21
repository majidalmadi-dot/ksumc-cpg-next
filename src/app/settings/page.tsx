import Header from '@/components/Header'
export default function SettingsPage() {
  return (
    <>
      <Header title="Settings" subtitle="Platform configuration and user preferences" />
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-light)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙</div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>Platform Settings</h2>
        <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>Configure your profile, team members, integrations, and platform preferences.</p>
      </div>
    </>
  )
}
