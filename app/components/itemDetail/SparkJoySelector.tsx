'use client';

import { SparkJoyStatus } from '../../lib/types';

interface SparkJoySelectorProps {
  value: SparkJoyStatus | undefined;
  onSelect: (next: SparkJoyStatus | undefined) => void;
}

const OPTIONS: { value: SparkJoyStatus; emoji: string; label: string; shortLabel: string; color: string; bg: string }[] = [
  { value: 'joy', emoji: '💖', label: 'Sparks Joy', shortLabel: 'Joy', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.25)' },
  { value: 'essential', emoji: '🧺', label: 'Essential', shortLabel: 'Essential', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.25)' },
  { value: 'no-joy', emoji: '🍂', label: 'Let Go', shortLabel: 'Let Go', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.25)' },
];

/**
 * Reusable three-way KonMari selector (joy / essential / let-go).
 * Used in both the edit-mode form (pills) and view mode (compact buttons).
 */
export function SparkJoyPills({ value, onSelect }: SparkJoySelectorProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)' }}>
      {OPTIONS.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`pill ${active ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: active ? opt.bg : undefined,
              borderColor: active ? opt.color : undefined,
              color: active ? opt.color : undefined
            }}
            onClick={() => onSelect(active ? undefined : opt.value)}
          >
            <span>{opt.emoji}</span> <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SparkJoyCompactButtons({ value, onSelect }: SparkJoySelectorProps) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {OPTIONS.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(active ? undefined : opt.value)}
            style={{
              padding: '3px 8px', borderRadius: 'var(--radius-pill)', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', border: '1px solid',
              background: active ? opt.bg : 'var(--bg-3)',
              borderColor: active ? opt.color : 'var(--border)',
              color: active ? opt.color : 'var(--text-secondary)'
            }}
            title={`${opt.label} ${opt.emoji}`}
          >
            {opt.emoji} {opt.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
