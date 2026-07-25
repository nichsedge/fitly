'use client';

interface Props {
  viewMode?: 'grid' | 'list';
}

export default function SkeletonCard({ viewMode = 'grid' }: Props) {
  if (viewMode === 'list') {
    return (
      <div
        className="item-card item-card--list"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 10,
          background: 'var(--bg-2)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          opacity: 0.7,
          animation: 'pulse 1.5s infinite ease-in-out'
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-3)',
            flexShrink: 0
          }}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ width: '60%', height: 14, background: 'var(--bg-3)', borderRadius: 4 }} />
          <div style={{ width: '40%', height: 10, background: 'var(--bg-3)', borderRadius: 4 }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="item-card item-card--grid"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        aspectRatio: '3/4',
        padding: 8,
        opacity: 0.7,
        animation: 'pulse 1.5s infinite ease-in-out'
      }}
    >
      <div
        style={{
          width: '100%',
          flex: 1,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-3)',
          marginBottom: 8
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ width: '70%', height: 12, background: 'var(--bg-3)', borderRadius: 4 }} />
        <div style={{ width: '40%', height: 10, background: 'var(--bg-3)', borderRadius: 4 }} />
      </div>
    </div>
  );
}
