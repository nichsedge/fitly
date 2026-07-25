'use client';

import { useState, useEffect } from 'react';
import { useApp } from './AppProvider';
import { CATEGORIES, Category, ClothingItem } from '../lib/types';
import Toast from './Toast';
import { triggerHaptic } from '../lib/haptics';

const DEFAULT_LAUNDRY_CATEGORIES: Category[] = ['top', 'bottom', 'underwear', 'outerwear'];

export default function LaundryView() {
  const { items, updateItem, t, formatPrice } = useApp();
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
    const now = Date.now();
    await updateItem({
      ...item,
      lastWashedAt: now,
      status: 'ready'
    });
    setToast(`✓ ${item.name} marked washed & clean`);
  };

  const handleWashAll = async () => {
    triggerHaptic(15);
    const now = Date.now();
    await Promise.all(wornItems.map(({ item }) => updateItem({
      ...item,
      lastWashedAt: now,
      status: 'ready'
    })));
    setToast(`✓ All ${wornItems.length} item(s) marked washed & clean!`);
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
            <button
              onClick={() => setShowCategorySettings(!showCategorySettings)}
              style={{
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-pill)',
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--accent)',
                cursor: 'pointer'
              }}
            >
              ⚙️ Customize
            </button>
          </p>
        </div>

        {wornItems.length > 0 && (
          <button
            onClick={handleWashAll}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
            }}
          >
            {t('washAll')}
          </button>
        )}
      </div>

      {/* Customize Laundry Categories Panel */}
      {showCategorySettings && (
        <div 
          className="animate-in" 
          style={{
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)'
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
            🧺 Laundry Basket Categories
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Select which categories automatically count towards your routine laundry when worn:
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {CATEGORIES.map(cat => {
              const isSelected = laundryCategories.includes(cat.value);
              return (
                <button
                  key={cat.value}
                  type="button"
                  className={`pill ${isSelected ? 'active' : ''}`}
                  onClick={() => toggleLaundryCategory(cat.value)}
                  style={{ fontSize: 12, padding: '4px 12px' }}
                >
                  {cat.emoji} {cat.label} {isSelected ? '✓' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`pill ${!showAllItems ? 'active' : ''}`}
            onClick={() => setShowAllItems(false)}
            style={{ fontSize: 12, padding: '4px 12px' }}
          >
            👕 Laundry Basket
          </button>
          <button
            className={`pill ${showAllItems ? 'active' : ''}`}
            onClick={() => setShowAllItems(true)}
            style={{ fontSize: 12, padding: '4px 12px' }}
          >
            👟 All Worn Gear ({allWornItems.length})
          </button>
        </div>
      </div>

      {/* List View */}
      {wornItems.length === 0 ? (
        <div className="empty-state animate-in" style={{ padding: 'var(--space-10) var(--space-4)', textAlign: 'center' }}>
          <div className="empty-state__emoji" style={{ fontSize: 64, marginBottom: 16 }}>🧺</div>
          <div className="empty-state__title" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            {t('cleanNoWornTitle')}
          </div>
          <p className="empty-state__desc" style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto' }}>
            {!showAllItems && allWornItems.length > 0 
              ? `Your customized laundry basket is empty! (${allWornItems.length} items from non-laundry categories worn)` 
              : t('cleanNoWornDesc')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
          {wornItems.map(({ item, wearsSinceWash }) => {
            const cat = CATEGORIES.find(c => c.value === item.category);
            
            // Wash recommendation thresholds:
            // Underwear: 1 wear
            // Tops: 2 wears
            // Accessories / Shoes / Bags: 3 wears
            // Bottoms / Outerwear: 4 wears
            const maxThreshold = 
              item.category === 'underwear' ? 1 : 
              (item.category === 'top' ? 2 : 
              (item.category === 'shoes' || item.category === 'accessory' || item.category === 'bag' ? 3 : 4));

            const isThresholdExceeded = wearsSinceWash >= maxThreshold;

            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-2)',
                  border: isThresholdExceeded ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  transition: 'transform 0.2s ease, border 0.2s ease'
                }}
              >
                {/* Photo / Thumbnail */}
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-3)',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center'
                }}>
                  {item.images && item.images.length > 0 ? (
                    <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 32 }}>{cat?.emoji}</span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {/* Wears Counter Pill */}
                    <span style={{
                      background: isThresholdExceeded ? 'rgba(245, 158, 11, 0.15)' : 'var(--accent-subtle)',
                      color: isThresholdExceeded ? 'var(--warning)' : 'var(--accent)',
                      border: isThresholdExceeded ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: 11,
                      fontWeight: 700
                    }}>
                      🔥 {wearsSinceWash} {wearsSinceWash === 1 ? t('wearSinceWash') : t('wearsSinceWash')}
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

                  {item.price !== undefined && item.price > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      CPW: {formatPrice(item.price / Math.max(1, item.wearLogs?.length || 1))}
                    </div>
                  )}
                </div>

                {/* Individual Reset (Mark Washed) Button */}
                <button
                  onClick={() => handleWashSingleItem(item)}
                  style={{
                    background: 'var(--bg-3)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.2s ease'
                  }}
                  title="Mark washed and reset counter to 0"
                >
                  {t('washItem')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
