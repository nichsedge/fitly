'use client';

import { ClothingItem, RetirementReason } from '../../lib/types';
import { konMariService } from '../../services/KonMariService';
import { useSettings } from '../../contexts/SettingsContext';
import { ResolvedImage } from '../ResolvedImage';
import { CategoryIcon } from '../AppIcon';

interface ReleaseTabProps {
  declutterCandidates: ClothingItem[];
  gratitudeNotes: Record<string, string>;
  onGratitudeNoteChange: (itemId: string, note: string) => void;
  retiringItemId: string | null;
  onReleaseItem: (item: ClothingItem, reason: RetirementReason) => void;
  onKeepItem: (item: ClothingItem) => void;
}

export default function ReleaseTab({
  declutterCandidates,
  gratitudeNotes,
  onGratitudeNoteChange,
  retiringItemId,
  onReleaseItem,
  onKeepItem,
}: ReleaseTabProps) {
  const { t } = useSettings();

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.25)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, color: '#ec4899', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🌸</span> {t('gratitudeRitual')}
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
          In the KonMari method, we sincerely thank each piece for its service and lessons before parting ways.
        </p>
      </div>

      {declutterCandidates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-2)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✨</div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>No Items Queued for Release</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            Your wardrobe is currently free of unwanted items. Perform a Tokimeki audit anytime!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {declutterCandidates.map(item => {
            const defaultPrompt = konMariService.getGratitudePrompt(item);
            const note = gratitudeNotes[item.id] ?? defaultPrompt;

            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden', flexShrink: 0 }}>
                    <ResolvedImage
                      src={item.images && item.images[0]}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      fallback={<CategoryIcon category={item.category} size={24} />}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Worn {item.wearLogs?.length || 0} times • {item.brand || item.category}
                    </div>
                  </div>
                </div>

                {/* Gratitude Reflection Note */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#ec4899', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <span>🌸</span> {t('gratitudeNote')}
                  </label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={note}
                    onChange={(e) => onGratitudeNoteChange(item.id, e.target.value)}
                    style={{ fontSize: 11, resize: 'vertical', minHeight: 46 }}
                  />
                </div>

                {/* Release Actions */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    className="btn btn-primary"
                    disabled={retiringItemId === item.id}
                    onClick={() => onReleaseItem(item, 'donated')}
                    style={{ fontSize: 11, padding: '6px 10px', flex: 1 }}
                  >
                    🎁 {t('donate')}
                  </button>
                  <button
                    className="btn btn-ghost"
                    disabled={retiringItemId === item.id}
                    onClick={() => onReleaseItem(item, 'sold')}
                    style={{ fontSize: 11, padding: '6px 10px', flex: 1 }}
                  >
                    🏷️ {t('sell')}
                  </button>
                  <button
                    className="btn btn-ghost"
                    disabled={retiringItemId === item.id}
                    onClick={() => onReleaseItem(item, 'recycled')}
                    style={{ fontSize: 11, padding: '6px 10px', flex: 1 }}
                  >
                    ♻️ {t('recycle')}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => onKeepItem(item)}
                    style={{ fontSize: 11, padding: '6px 10px', color: 'var(--text-muted)' }}
                    title="Keep in closet"
                  >
                    ↩️ Keep
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
