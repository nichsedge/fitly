'use client';

import { useMemo, useState } from 'react';
import { useApp } from './AppProvider';
import { ClothingItem, Outfit, CATEGORIES } from '../lib/types';
import ItemDetailModal from './ItemDetailModal';
import OutfitDetailModal from './OutfitDetailModal';
import OutfitBuilderModal from './OutfitBuilderModal';
import Toast from './Toast';

// Group logic
export default function CalendarTab() {
  const { items, outfits, plans, updateOutfit, updateItem, deletePlan, updatePlan } = useApp();
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [selectedLogDateKey, setSelectedLogDateKey] = useState<string | null>(null);
  const [editingOutfit, setEditingOutfit] = useState<Outfit | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [toast, setToast] = useState('');

  const getDayKey = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const handleRemoveOutfitLog = async (outfit: Outfit, dayKey: string) => {
    const updatedOutfitLogs = (outfit.wearLogs || []).filter(ts => getDayKey(ts) !== dayKey);
    const newOutfitLastWorn = updatedOutfitLogs.length > 0 ? Math.max(...updatedOutfitLogs) : undefined;

    await updateOutfit({
      ...outfit,
      wearLogs: updatedOutfitLogs,
      lastWornAt: newOutfitLastWorn
    });

    for (const itemId of outfit.itemIds) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        const updatedItemLogs = (item.wearLogs || []).filter(ts => getDayKey(ts) !== dayKey);
        const newItemLastWorn = updatedItemLogs.length > 0 ? Math.max(...updatedItemLogs) : undefined;
        await updateItem({
          ...item,
          wearLogs: updatedItemLogs,
          lastWornAt: newItemLastWorn
        });
      }
    }

    const matchingPlan = plans.find(p => p.date === dayKey && p.outfitId === outfit.id);
    if (matchingPlan) {
      await deletePlan(matchingPlan.id);
    }

    setToast(`✓ Removed log for ${dayKey}`);
  };

  const handleRemoveItemLog = async (item: ClothingItem, dayKey: string) => {
    const updatedItemLogs = (item.wearLogs || []).filter(ts => getDayKey(ts) !== dayKey);
    const newItemLastWorn = updatedItemLogs.length > 0 ? Math.max(...updatedItemLogs) : undefined;

    await updateItem({
      ...item,
      wearLogs: updatedItemLogs,
      lastWornAt: newItemLastWorn
    });

    const matchingPlan = plans.find(p => p.date === dayKey && p.itemIds.includes(item.id));
    if (matchingPlan) {
      if (matchingPlan.itemIds.length === 1 && !matchingPlan.outfitId) {
        await deletePlan(matchingPlan.id);
      } else {
        await updatePlan({
          ...matchingPlan,
          itemIds: matchingPlan.itemIds.filter(id => id !== item.id)
        });
      }
    }

    setToast(`✓ Removed log for ${dayKey}`);
  };

  const handleRemoveWashLogForDay = async (dayKey: string, washedItems: ClothingItem[]) => {
    for (const item of washedItems) {
      const updatedWashLogs = (item.washLogs || []).filter(ts => getDayKey(ts) !== dayKey);
      const newLastWashedAt = updatedWashLogs.length > 0 ? Math.max(...updatedWashLogs) : undefined;
      await updateItem({
        ...item,
        washLogs: updatedWashLogs,
        lastWashedAt: newLastWashedAt
      });
    }
    setToast(`✓ Removed laundry log for ${dayKey}`);
  };

  // Group by date string: YYYY-MM-DD
  const days = useMemo(() => {
    const map: Record<string, { dateObj: Date, outfits: Outfit[], items: ClothingItem[], washedItems: ClothingItem[] }> = {};

    // 1. Collect all outfits
    outfits.forEach(outfit => {
      const logs = outfit.wearLogs || (outfit.lastWornAt ? [outfit.lastWornAt] : []);
      logs.forEach(ts => {
        const key = getDayKey(ts);
        if (!map[key]) map[key] = { dateObj: new Date(ts), outfits: [], items: [], washedItems: [] };
        if (!map[key].outfits.find(o => o.id === outfit.id)) {
          map[key].outfits.push(outfit);
        }
      });
    });

    // 2. Collect all items
    items.forEach(item => {
      const logs = item.wearLogs || (item.lastWornAt ? [item.lastWornAt] : []);
      logs.forEach(ts => {
        const key = getDayKey(ts);
        if (!map[key]) map[key] = { dateObj: new Date(ts), outfits: [], items: [], washedItems: [] };
        
        const isInOutfitToday = map[key].outfits.some(o => o.itemIds.includes(item.id));
        if (!isInOutfitToday) {
          if (!map[key].items.find(i => i.id === item.id)) {
            map[key].items.push(item);
          }
        }
      });
    });

    // 3. Collect all wash logs (Laundry Audit History)
    items.forEach(item => {
      const washLogs = item.washLogs || (item.lastWashedAt ? [item.lastWashedAt] : []);
      washLogs.forEach(ts => {
        const key = getDayKey(ts);
        if (!map[key]) map[key] = { dateObj: new Date(ts), outfits: [], items: [], washedItems: [] };
        if (!map[key].washedItems) map[key].washedItems = [];
        if (!map[key].washedItems.find(i => i.id === item.id)) {
          map[key].washedItems.push(item);
        }
      });
    });

    // 4. Collect all plans
    plans.forEach(plan => {
      const key = plan.date; // YYYY-MM-DD
      if (!map[key]) {
        map[key] = { dateObj: new Date(key + 'T12:00:00'), outfits: [], items: [], washedItems: [] };
      }
      
      if (plan.outfitId) {
        const outfit = outfits.find(o => o.id === plan.outfitId);
        if (outfit && !map[key].outfits.find(o => o.id === outfit.id)) {
          map[key].outfits.push(outfit);
        }
      }
      
      plan.itemIds.forEach(itemId => {
        const item = items.find(i => i.id === itemId);
        if (item) {
          const isInOutfitToday = map[key].outfits.some(o => o.itemIds.includes(item.id));
          if (!isInOutfitToday && !map[key].items.find(i => i.id === item.id)) {
            map[key].items.push(item);
          }
        }
      });
    });

    // Convert map to sorted array (newest first)
    return Object.entries(map)
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [items, outfits, plans]);

  const formatDateLabel = (dateObj: Date) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const d = new Date(dateObj);
    d.setHours(0,0,0,0);

    const isToday = today.getTime() === d.getTime();
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = yesterday.getTime() === d.getTime();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = tomorrow.getTime() === d.getTime();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    if (isTomorrow) return 'Tomorrow';
    return dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <div className="page-content animate-fade-in">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 className="section-title">Style Log</h1>
        <button 
          className="btn btn-primary" 
          style={{ padding: '4px 12px', fontSize: 13, height: 'auto', minHeight: 'auto' }}
          onClick={() => setIsPlanning(true)}
        >
          📅 Plan Outfit
        </button>
      </div>

      {days.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__emoji">📅</div>
          <div className="empty-state__title">No history yet</div>
          <div className="empty-state__desc">Tap &quot;Wearing this today&quot; on any item to start building your style log.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {days.map(day => (
            <div key={day.key}>
              <div style={{ 
                fontSize: 14, 
                fontWeight: 700, 
                color: 'var(--text-secondary)',
                borderBottom: '1px solid var(--border)',
                paddingBottom: 'var(--space-2)',
                marginBottom: 'var(--space-4)',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{formatDateLabel(day.dateObj)}</span>
                {/* eslint-disable-next-line react-hooks/purity */}
                {day.dateObj.getTime() > Date.now() && (
                  <span style={{ fontSize: 10, color: 'var(--accent)', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: 4 }}>PLANNED</span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {/* Outfits first */}
                {day.outfits.map(outfit => (
                  <div 
                    key={`outfit-${outfit.id}`} 
                    className="outfit-card" 
                    style={{ padding: 'var(--space-3)', cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedOutfit(outfit);
                      setSelectedLogDateKey(day.key);
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                        Outfit: {outfit.name}
                      </div>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '2px 8px', fontSize: 11, color: 'var(--text-muted)', height: 'auto', minHeight: 'auto' }}
                        title="Remove log for this day"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveOutfitLog(outfit, day.key);
                        }}
                      >
                        🗑 Remove log
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', scrollbarWidth: 'none' }}>
                      {outfit.itemIds.map(itemId => {
                        const item = items.find(i => i.id === itemId);
                        if (!item) return null;
                        const cat = CATEGORIES.find(c => c.value === item.category);
                        return (
                          <div 
                            key={itemId} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                              setSelectedLogDateKey(day.key);
                            }}
                            style={{ width: 64, flexShrink: 0, cursor: 'pointer' }}
                          >
                            <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', background: 'var(--bg-3)', overflow: 'hidden', marginBottom: 4 }}>
                              {item.images && item.images.length > 0 ? (
                                <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', fontSize: 24 }}>{cat?.emoji}</div>
                              )}
                            </div>
                            <div style={{ fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{item.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Individual Items */}
                {day.items.length > 0 && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {day.items.map(item => {
                      const cat = CATEGORIES.find(c => c.value === item.category);
                      return (
                        <div 
                          key={`single-${item.id}`}
                          onClick={() => {
                            setSelectedItem(item);
                            setSelectedLogDateKey(day.key);
                          }}
                          style={{ width: 84, flexShrink: 0, cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)', position: 'relative' }}
                        >
                          <button
                            style={{
                              position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)', 
                              color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, 
                              fontSize: 10, cursor: 'pointer', display: 'grid', placeItems: 'center', zIndex: 2
                            }}
                            title="Remove log for this day"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItemLog(item, day.key);
                            }}
                          >
                            ✕
                          </button>
                          <div style={{ width: '100%', aspectRatio: '1', borderRadius: 'calc(var(--radius-md) - 4px)', background: 'var(--bg-3)', overflow: 'hidden', marginBottom: 6 }}>
                            {item.images && item.images.length > 0 ? (
                              <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', fontSize: 28 }}>{cat?.emoji}</div>
                            )}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{item.name}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', textTransform: 'capitalize' }}>Single item</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Laundry Audit Log */}
                {day.washedItems && day.washedItems.length > 0 && (
                  <div style={{
                    background: 'var(--bg-2)',
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>🧺</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                          Laundry Audit — Washed {day.washedItems.length} item(s)
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {day.washedItems.map(i => i.name).join(', ')}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: 10 }}>
                        Cleaned
                      </span>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '2px 6px', fontSize: 11, color: 'var(--text-muted)', height: 'auto' }}
                        title="Delete wash log entry for this day"
                        onClick={() => handleRemoveWashLogForDay(day.key, day.washedItems)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <ItemDetailModal 
          item={items.find(i => i.id === selectedItem.id) || selectedItem} 
          onClose={() => {
            setSelectedItem(null);
            setSelectedLogDateKey(null);
          }} 
          logDateKey={selectedLogDateKey || undefined}
          onRemoveLogFromDate={(dateKey) => handleRemoveItemLog(selectedItem, dateKey)}
        />
      )}

      {selectedOutfit && (
        <OutfitDetailModal
          outfit={selectedOutfit}
          items={items}
          onClose={() => {
            setSelectedOutfit(null);
            setSelectedLogDateKey(null);
          }}
          onEdit={() => {
            setEditingOutfit(selectedOutfit);
            setSelectedOutfit(null);
          }}
          logDateKey={selectedLogDateKey || undefined}
          onRemoveLogFromDate={(dateKey) => handleRemoveOutfitLog(selectedOutfit, dateKey)}
        />
      )}

      {editingOutfit && (
        <OutfitBuilderModal
          initialOutfit={editingOutfit}
          onClose={() => setEditingOutfit(null)}
        />
      )}

      {isPlanning && (
        <div className="modal-overlay" onClick={() => setIsPlanning(false)}>
          <div className="modal-sheet animate-scale" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <span className="modal-title">Plan an Outfit</span>
              <button className="modal-close" onClick={() => setIsPlanning(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={planDate} 
                  onChange={e => setPlanDate(e.target.value)} 
                />
              </div>
              
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                To plan an outfit, go to the <b>Outfits</b> tab and select a future date when logging, or pick items from there. 
                This view shows what you&apos;ve planned across your calendar.
              </p>

              <button 
                className="btn btn-primary btn-full" 
                onClick={() => setIsPlanning(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
