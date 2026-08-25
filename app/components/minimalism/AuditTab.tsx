'use client';

import { Category, ClothingItem, SparkJoyStatus } from '../../lib/types';
import { KONMARI_CATEGORY_ORDER } from '../../services/KonMariService';
import { useSettings } from '../../contexts/SettingsContext';
import { ResolvedImage } from '../ResolvedImage';
import { CategoryIcon, ChevronLeft, ChevronRight } from '../AppIcon';

interface AuditTabProps {
  items: ClothingItem[];
  auditCategory: Category | 'all';
  auditQueue: ClothingItem[];
  currentAuditIndex: number;
  currentItem: ClothingItem | null;
  onCategoryChange: (cat: Category | 'all') => void;
  onDecision: (status: SparkJoyStatus) => void;
  onIndexChange: (next: number) => void;
  onGoOverview: () => void;
}

export default function AuditTab({
  items,
  auditCategory,
  auditQueue,
  currentAuditIndex,
  currentItem,
  onCategoryChange,
  onDecision,
  onIndexChange,
  onGoOverview,
}: AuditTabProps) {
  const { formatPrice, t } = useSettings();

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Category Filter Sequence */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        <button
          className={`pill ${auditCategory === 'all' ? 'active' : ''}`}
          onClick={() => onCategoryChange('all')}
          style={{ fontSize: 11, padding: '4px 10px' }}
        >
          All ({items.filter(i => !i.retiredAt).length})
        </button>
        {KONMARI_CATEGORY_ORDER.map(cat => {
          const count = items.filter(i => !i.retiredAt && i.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              className={`pill ${auditCategory === cat ? 'active' : ''}`}
              onClick={() => onCategoryChange(cat)}
              style={{ fontSize: 11, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <CategoryIcon category={cat} size={12} />
              <span style={{ textTransform: 'capitalize' }}>{cat}</span> ({count})
            </button>
          );
        })}
      </div>

      {/* Current Audit Card */}
      {currentItem ? (
        <div
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {/* Item Image */}
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-3)',
              overflow: 'hidden',
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              marginBottom: 14,
            }}
          >
            <ResolvedImage
              src={currentItem.images && currentItem.images[0]}
              alt={currentItem.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              fallback={<CategoryIcon category={currentItem.category} size={64} />}
            />
            {currentItem.sparkJoy && (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.7)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {currentItem.sparkJoy === 'joy' ? '💖 Sparks Joy' : currentItem.sparkJoy === 'essential' ? '🧺 Essential' : '🍂 Let Go'}
              </div>
            )}
          </div>

          {/* Item Details */}
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 4 }}>
            {currentItem.name}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {currentItem.brand && <span>{currentItem.brand} •</span>}
            <span style={{ textTransform: 'capitalize' }}>{currentItem.category}</span>
            <span>• Worn {currentItem.wearLogs?.length || 0}x</span>
            {currentItem.price && <span>• {formatPrice(currentItem.price)}</span>}
          </div>

          {/* Core Question Prompt */}
          <div
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 16,
            }}
          >
            🌸 &ldquo;{t('sparkJoyPrompt')}&rdquo;
          </div>

          {/* Decision Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, width: '100%' }}>
            <DecisionButton
              status="joy"
              activeStatus={currentItem.sparkJoy}
              emoji="💖"
              label="Sparks Joy"
              color="#ec4899"
              activeBg="rgba(236, 72, 153, 0.3)"
              onClick={onDecision}
            />
            <DecisionButton
              status="essential"
              activeStatus={currentItem.sparkJoy}
              emoji="🧺"
              label="Essential"
              color="#3b82f6"
              activeBg="rgba(59, 130, 246, 0.3)"
              onClick={onDecision}
            />
            <DecisionButton
              status="no-joy"
              activeStatus={currentItem.sparkJoy}
              emoji="🍂"
              label="Let Go"
              color="#f59e0b"
              activeBg="rgba(245, 158, 11, 0.3)"
              onClick={onDecision}
            />
          </div>

          {/* Navigation Stepper */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 14 }}>
            <button
              className="btn btn-ghost"
              disabled={currentAuditIndex === 0}
              onClick={() => onIndexChange(Math.max(0, currentAuditIndex - 1))}
              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronLeft size={14} /> Back
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {currentAuditIndex + 1} of {auditQueue.length}
            </span>
            <button
              className="btn btn-ghost"
              disabled={currentAuditIndex >= auditQueue.length - 1}
              onClick={() => onIndexChange(Math.min(auditQueue.length - 1, currentAuditIndex + 1))}
              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-2)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌸</div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{t('auditCompleted')}</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{t('auditCompletedDesc')}</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onGoOverview}>
            View Scorecard
          </button>
        </div>
      )}

    </div>
  );
}

function DecisionButton({ status, activeStatus, emoji, label, color, activeBg, onClick }: {
  status: SparkJoyStatus;
  activeStatus?: SparkJoyStatus;
  emoji: string;
  label: string;
  color: string;
  activeBg: string;
  onClick: (status: SparkJoyStatus) => void;
}) {
  return (
    <button
      className="btn"
      onClick={() => onClick(status)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '12px 8px',
        borderRadius: 'var(--radius-md)',
        background: activeStatus === status ? activeBg : 'var(--bg-3)',
        border: `1px solid ${color}`,
        color,
        fontWeight: 800,
        fontSize: 12,
      }}
    >
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}
