'use client';

import { KonMariStats, DuplicateCluster } from '../../services/KonMariService';
import { Sparkles, CategoryIcon, AlertTriangle } from '../AppIcon';

interface OverviewTabProps {
  stats: KonMariStats;
  duplicateClusters: DuplicateCluster[];
  t: (key: string) => string;
  onGoAudit: () => void;
}

export default function OverviewTab({ stats, duplicateClusters, t, onGoAudit }: OverviewTabProps) {
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Main Joy & Minimalism Score Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
          border: '1px solid rgba(236, 72, 153, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          alignItems: 'center',
        }}
      >
        {/* Left: Joy Index */}
        <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)', paddingRight: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#ec4899', letterSpacing: '0.05em' }}>
            {t('joyScore')}
          </div>
          <div style={{ fontSize: 38, fontWeight: 900, color: 'var(--text-primary)', margin: '4px 0' }}>
            {stats.joyIndex}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {stats.joyCount} of {stats.totalItems - stats.unratedCount} rated spark joy
          </div>
        </div>

        {/* Right: Wardrobe Health / Minimalism */}
        <div style={{ textAlign: 'center', paddingLeft: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em' }}>
            {t('minimalismStage')}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
            {stats.minimalismStage}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>
            Score: {stats.minimalismScore}/100
          </div>
        </div>
      </div>

      {/* Audit Progress CTA Card */}
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('auditCompletion')}
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: stats.auditCompletionRate === 100 ? 'var(--success)' : 'var(--accent)' }}>
            {stats.auditCompletionRate}% ({stats.totalItems - stats.unratedCount}/{stats.totalItems})
          </span>
        </div>

        <div style={{ height: 8, background: 'var(--bg-3)', borderRadius: 'var(--radius-pill)', overflow: 'hidden', marginBottom: 12 }}>
          <div
            style={{
              height: '100%',
              width: `${stats.auditCompletionRate}%`,
              background: 'linear-gradient(90deg, #ec4899, #6366f1)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={onGoAudit}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px' }}
        >
          <Sparkles size={16} />
          <span>{stats.auditCompletionRate < 100 ? t('startAudit') : 'Review Joy Ratings'}</span>
        </button>
      </div>

      {/* Tokimeki Breakdown Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <StatCard emoji="💖" value={stats.joyCount} label="Sparks Joy" color="#ec4899" />
        <StatCard emoji="🧺" value={stats.essentialCount} label="Essential" color="#3b82f6" />
        <StatCard emoji="🍂" value={stats.noJoyCount} label="Let Go" color="#f59e0b" />
        <StatCard emoji="❓" value={stats.unratedCount} label="Unrated" color="var(--text-muted)" />
      </div>

      {/* Duplicate Alerts if any */}
      {duplicateClusters.length > 0 && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            <AlertTriangle size={16} />
            <span>{t('duplicateAlert')} ({duplicateClusters.length})</span>
          </div>
          {duplicateClusters.map(cluster => (
            <p key={cluster.id} style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 4, lineHeight: 1.4 }}>
              • {cluster.suggestion}
            </p>
          ))}
        </div>
      )}

      {/* Category Harmony Meters */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
          {t('konmariCategoryOrder')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.categories.map(cat => {
            const pct = Math.min(100, Math.round((cat.count / Math.max(1, cat.targetMax)) * 100));
            return (
              <div key={cat.category} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--text-primary)' }}>
                    <CategoryIcon category={cat.category} size={14} />
                    {cat.label}
                  </span>
                  <span style={{ fontSize: 11, color: cat.isOverTarget ? '#f59e0b' : 'var(--text-muted)' }}>
                    {cat.count} items (Ideal: {cat.targetMin}–{cat.targetMax})
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: cat.isOverTarget ? '#f59e0b' : 'var(--accent)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

function StatCard({ emoji, value, label, color }: { emoji: string; value: number; label: string; color: string }) {
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '10px 8px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
      <div style={{ fontSize: 18 }}>{emoji}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  );
}
