'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp } from './AppProvider';
import { CATEGORIES, Category, ClothingItem } from '../lib/types';
import Toast from './Toast';
import { triggerHaptic } from '../lib/haptics';

const DEFAULT_LAUNDRY_CATEGORIES: Category[] = ['top', 'bottom', 'underwear', 'outerwear'];

export default function LaundryView() {
  const { items, updateItem, t } = useApp();
  const [toast, setToast] = useState('');
  const [showAllItems, setShowAllItems] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);

  // Saved customizable laundry categories
  const [laundryCategories, setLaundryCategories] = useState<Category[]>(DEFAULT_LAUNDRY_CATEGORIES);

  useEffect(() => {
    const saved = localStorage.getItem('laundryCategories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLaundryCategories(parsed);
        }
      } catch (e) {
        console.error('Failed to parse laundryCategories from localStorage', e);
      }
    }
  }, []);

  const toggleLaundryCategory = (cat: Category) => {
    const next = laundryCategories.includes(cat)
      ? laundryCategories.filter(c => c !== cat)
      : [...laundryCategories, cat];
    
    if (next.length === 0) {
      setToast('Select at least one category for laundry basket');
      return;
    }

    setLaundryCategories(next);
    localStorage.setItem('laundryCategories', JSON.stringify(next));
  };

  // Wash History audit logs grouped by day
  const washHistory = useMemo(() => {
    const historyMap: Record<string, { date: Date; items: ClothingItem[] }> = {};
    items.forEach(item => {
      const logs = item.washLogs || (item.lastWashedAt ? [item.lastWashedAt] : []);
      logs.forEach(ts => {
        const d = new Date(ts);
        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!historyMap[dayKey]) {
          historyMap[dayKey] = { date: d, items: [] };
        }
        if (!historyMap[dayKey].items.find(i => i.id === item.id)) {
          historyMap[dayKey].items.push(item);
        }
      });
    });
    return Object.entries(historyMap)
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [items]);

  // Calculate wears since last wash for each item
  const allWornItems = items.map(item => {
    const lastWash = item.lastWashedAt || 0;
    const wearsSinceWash = (item.wearLogs || []).filter(timestamp => timestamp > lastWash).length;
    return { item, wearsSinceWash };
  })
  .filter(entry => entry.wearsSinceWash > 0)
  .sort((a, b) => b.wearsSinceWash - a.wearsSinceWash);

  // Filter items based on user's customized laundry categories
  const wornItems = allWornItems.filter(({ item }) => 
    showAllItems || laundryCategories.includes(item.category)
  );

  const handleWashSingleItem = async (item: ClothingItem) => {
    triggerHaptic(12);
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const existingLogs = item.washLogs || (item.lastWashedAt ? [item.lastWashedAt] : []);
    await updateItem({
      ...item,
      lastWashedAt: now,
      washLogs: [...existingLogs, now],
      status: 'ready'
    });
    setToast(`✓ ${item.name} marked washed & clean`);
  };

  const handleWashAll = async () => {
    triggerHaptic(15);
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    await Promise.all(wornItems.map(({ item }) => {
      const existingLogs = item.washLogs || (item.lastWashedAt ? [item.lastWashedAt] : []);
      return updateItem({
        ...item,
        lastWashedAt: now,
        washLogs: [...existingLogs, now],
        status: 'ready'
      });
    }));
    setToast(`✓ All ${wornItems.length} item(s) marked washed & clean!`);
  };

  const handleDeleteWashSession = async (dayKey: string, washedItems: ClothingItem[]) => {
    triggerHaptic(10);
    const getDayKey = (ts: number) => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    for (const item of washedItems) {
      const updatedWashLogs = (item.washLogs || []).filter(ts => getDayKey(ts) !== dayKey);
      const newLastWashedAt = updatedWashLogs.length > 0 ? Math.max(...updatedWashLogs) : undefined;
      await updateItem({
        ...item,
        washLogs: updatedWashLogs,
        lastWashedAt: newLastWashedAt
      });
    }
    setToast(`✓ Deleted wash log for ${dayKey}`);
  };

  // Active category emojis for summary label
  const activeCategoryInfo = CATEGORIES.filter(c => laundryCategories.includes(c.value));
  const summaryCategoriesLabel = activeCategoryInfo.map(c => c.label).join(', ');

  return (
    <div className="page-content animate-in">
      {/* Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <h2 className="section-title">{t('laundryCounter')}</h2>
            <span className="section-count">{wornItems.length}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Tracking: {summaryCategoriesLabel}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '4px 10px', height: 32 }}
            onClick={() => setShowCategorySettings(!showCategorySettings)}
          >
            ⚙️ Categories
          </button>
          <button
            className={`btn ${showAllItems ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 12, padding: '4px 10px', height: 32 }}
            onClick={() => setShowAllItems(!showAllItems)}
          >
            {showAllItems ? 'Showing All' : 'Filter Categories'}
          </button>
        </div>
      </div>

      {showCategorySettings && (
        <div style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-4)'
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            🧺 Laundry Basket Categories
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.map(cat => {
              const active = laundryCategories.includes(cat.value);
              return (
                <button
                  key={cat.value}
                  onClick={() => toggleLaundryCategory(cat.value)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 12,
                    fontWeight: 600,
                    border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: active ? 'var(--accent-subtle)' : 'var(--bg-3)',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {cat.emoji} {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Wash All Action Header */}
      {wornItems.length > 0 && (
        <div style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
          marginBottom: 'var(--space-4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {wornItems.length} item(s) pending laundry
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Mark all worn items washed after doing laundry
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700 }}
            onClick={handleWashAll}
          >
            🧼 {t('washAll')}
          </button>
        </div>
      )}

      {/* Items List */}
      {wornItems.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
          <div className="empty-state__emoji" style={{ fontSize: 48, marginBottom: 12 }}>🧺✨</div>
          <div className="empty-state__title" style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
            {t('cleanNoWornTitle')}
          </div>
          <p className="empty-state__desc" style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320, margin: '0 auto' }}>
            {t('cleanNoWornDesc')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {wornItems.map(({ item, wearsSinceWash }) => {
            const isThresholdExceeded = wearsSinceWash >= 3;
            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-2)',
                  border: isThresholdExceeded ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                {/* Photo Thumbnail */}
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-3)',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24
                }}>
                  {item.images && item.images.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span>👕</span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isThresholdExceeded ? 'var(--danger)' : 'var(--accent)',
                      background: isThresholdExceeded ? 'rgba(239, 68, 68, 0.15)' : 'var(--accent-subtle)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)'
                    }}>
                      {wearsSinceWash} {wearsSinceWash === 1 ? t('wearSinceWash') : t('wearsSinceWash')}
                    </span>
                    {isThresholdExceeded && (
                      <span style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: 'var(--danger)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: 10,
                        fontWeight: 700
                      }}>
                        {t('washRecommended')}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleWashSingleItem(item)}
                  style={{
                    background: 'var(--bg-3)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {t('washItem')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Wash Audit History Section */}
      {washHistory.length > 0 && (
        <div style={{ marginTop: 'var(--space-8)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📜 Laundry Wash Audit Logs</span>
            <span style={{ fontSize: 11, background: 'var(--bg-3)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>
              {washHistory.length} sessions
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {washHistory.slice(0, 10).map(entry => (
              <div 
                key={entry.key} 
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    🧼 Washed {entry.items.length} item(s)
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {entry.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '2px 6px', fontSize: 11, color: 'var(--danger)', height: 'auto' }}
                      title="Undo / Delete this wash log session"
                      onClick={() => handleDeleteWashSession(entry.key, entry.items)}
                    >
                      🗑️ Undo
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {entry.items.map(item => (
                    <span 
                      key={item.id}
                      style={{
                        fontSize: 11,
                        background: 'var(--bg-3)',
                        color: 'var(--text-secondary)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        border: '1px solid var(--border)'
                      }}
                    >
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
