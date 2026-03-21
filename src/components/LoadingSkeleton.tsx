'use client'

interface SkeletonProps {
  rows?: number
  height?: number
  style?: React.CSSProperties
}

export function CardSkeleton({ rows = 3 }: SkeletonProps) {
  return (
    <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px' }}>
      <div className="skeleton" style={{ width: '40%', height: '14px', marginBottom: '12px' }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ width: `${80 - i * 10}%`, height: '12px', marginBottom: '8px' }} />
      ))}
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px', textAlign: 'center' }}>
      <div className="skeleton" style={{ width: '50%', height: '28px', margin: '0 auto 8px' }} />
      <div className="skeleton" style={{ width: '70%', height: '12px', margin: '0 auto' }} />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: SkeletonProps) {
  return (
    <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px' }}>
      <div className="skeleton" style={{ width: '30%', height: '14px', marginBottom: '20px' }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: '16px', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
          <div className="skeleton" style={{ width: '30%', height: '12px' }} />
          <div className="skeleton" style={{ width: '20%', height: '12px' }} />
          <div className="skeleton" style={{ width: '15%', height: '12px' }} />
          <div className="skeleton" style={{ width: '25%', height: '12px' }} />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <TableSkeleton />
    </div>
  )
}
