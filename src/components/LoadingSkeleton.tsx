'use client'

export function DashboardSkeleton() {
  return (
    <div className="fade-in" style={{ padding: '24px 32px' }}>
      <div className="skeleton" style={{ height: '60px', marginBottom: '20px', maxWidth: '400px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: '90px' }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px', marginBottom: '28px' }}>
        <div className="skeleton" style={{ height: '250px' }} />
        <div className="skeleton" style={{ height: '250px' }} />
      </div>
      <div className="skeleton" style={{ height: '300px' }} />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="fade-in" style={{ padding: '24px 32px' }}>
      <div className="skeleton" style={{ height: '40px', marginBottom: '16px', maxWidth: '300px' }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px' }} />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return <div className="skeleton" style={{ height: '120px', borderRadius: '10px' }} />
}

export function StatCardSkeleton() {
  return (
    <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px' }}>
      <div className="skeleton" style={{ width: '50%', height: '12px', marginBottom: '12px' }} />
      <div className="skeleton" style={{ width: '40%', height: '28px', marginBottom: '8px' }} />
      <div className="skeleton" style={{ width: '60%', height: '10px' }} />
    </div>
  )
}

export function PageSkeleton() {
  return <DashboardSkeleton />
}

export default function LoadingSkeleton() {
  return <DashboardSkeleton />
}
