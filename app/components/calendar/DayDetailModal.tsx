'use client';

import { ClothingItem, Outfit, PlannedOutfit } from '../../lib/types';
import { ResolvedImage } from '../ResolvedImage';
import { getDayLogSummary, formatDateDisplay } from '../../lib/domain/calendar';
import {
  Sparkles,
  WashingMachine,
  CategoryIcon,
} from '../AppIcon';

/* ─── Day Log Inspector Modal ─── */
interface DayDetailModalProps {
  dateKey: string;
  isOpen: boolean;
  onClose: () => void;
  plans: PlannedOutfit[];
  outfits: Outfit[];
  items: ClothingItem[];
  onMarkPlanWorn: (plan: PlannedOutfit) => Promise<void>;
  onRemoveOutfitLog: (outfit: Outfit, dateKey: string) => Promise<void>;
  onRemoveItemLog: (item: ClothingItem, dateKey: string) => Promise<void>;
  onRemoveWashLog: (dateKey: string, washedItems: ClothingItem[]) => Promise<void>;
  onCancelPlan: (planId: string) => Promise<void>;
  onOpenLogWear: (dateKey: string) => void;
  onOpenLogWash: (dateKey: string) => void;
}

export default function DayDetailModal({
  dateKey,
  isOpen,
  onClose,
  plans,
  outfits,
  items,
  onMarkPlanWorn,
  onRemoveOutfitLog,
  onRemoveItemLog,
  onRemoveWashLog,
  onCancelPlan,
  onOpenLogWear,
  onOpenLogWash,
}: DayDetailModalProps) {
  if (!isOpen) return null;

  const summary = getDayLogSummary(dateKey, plans, outfits, items);
  const formattedDate = formatDateDisplay(summary.dateObj);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 110 }}>
      <div className="modal-sheet animate-scale" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Style & Activity Log</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formattedDate}</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 'var(--space-4)', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Action Quick Bar */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1, padding: '8px 12px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => onOpenLogWear(dateKey)}>
              <Sparkles size={14} /> + Log Wear
            </button>
            <button className="btn btn-ghost" style={{ flex: 1, padding: '8px 12px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid var(--border)' }} onClick={() => onOpenLogWash(dateKey)}>
              <WashingMachine size={14} /> + Log Laundry
            </button>
          </div>

          {/* Worn Outfits */}
          {summary.wornOutfits.length > 0 && (
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                ✓ Outfits Worn
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {summary.wornOutfits.map(outfit => (
                  <div key={outfit.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{outfit.name}</span>
                      <button className="btn btn-ghost" style={{ fontSize: 11, color: '#ef4444', padding: '2px 6px' }} onClick={() => onRemoveOutfitLog(outfit, dateKey)}>
                        Remove
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                      {outfit.itemIds.map(itemId => {
                        const item = items.find(i => i.id === itemId);
                        if (!item) return null;
                        return (
                          <div key={item.id} style={{ width: 48, flexShrink: 0, textAlign: 'center' }}>
                            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden' }}>
                              <ResolvedImage src={item.images?.[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} fallback={<CategoryIcon category={item.category} size={20} />} />
                            </div>
                            <div style={{ fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{item.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Worn Individual Items */}
          {summary.wornItems.length > 0 && (
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                ✓ Single Items Worn
              </h4>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {summary.wornItems.map(item => (
                  <div key={item.id} style={{ width: 72, padding: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', position: 'relative' }}>
                    <button
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, fontSize: 9, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                      onClick={() => onRemoveItemLog(item, dateKey)}
                    >
                      ✕
                    </button>
                    <div style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden', marginBottom: 4 }}>
                      <ResolvedImage src={item.images?.[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} fallback={<CategoryIcon category={item.category} size={20} />} />
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{item.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Planned Outfits */}
          {summary.plannedOutfits.length > 0 && (
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                📅 Planned for this day
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {summary.plannedOutfits.map(plan => {
                  const outfit = outfits.find(o => o.id === plan.outfitId);
                  return (
                    <div key={plan.id} style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: 'var(--radius-md)', padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {outfit ? outfit.name : `Custom (${plan.itemIds.length} items)`}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Planned outfit</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => onMarkPlanWorn(plan)}>
                          ✓ Mark Worn
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11, color: 'var(--text-muted)' }} onClick={() => onCancelPlan(plan.id)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Washed Laundry */}
          {summary.washedItems.length > 0 && (
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                🧺 Washed Laundry
              </h4>
              <div style={{ background: 'var(--bg-2)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Washed {summary.washedItems.length} item(s)</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{summary.washedItems.map(i => i.name).join(', ')}</div>
                </div>
                <button className="btn btn-ghost" style={{ fontSize: 11, color: '#ef4444' }} onClick={() => onRemoveWashLog(dateKey, summary.washedItems)}>
                  Remove
                </button>
              </div>
            </div>
          )}

          {summary.wornOutfits.length === 0 && summary.wornItems.length === 0 && summary.plannedOutfits.length === 0 && summary.washedItems.length === 0 && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 13 }}>No activity logged for this date yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
