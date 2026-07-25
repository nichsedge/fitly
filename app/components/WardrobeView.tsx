'use client';

import { useState } from 'react';
import { useApp } from './AppProvider';
import { CATEGORIES, Category } from '../lib/types';
import ItemCard from './ItemCard';
import ItemDetailModal from './ItemDetailModal';
import { ClothingItem } from '../lib/types';
import Toast from './Toast';
import { triggerHaptic } from '../lib/haptics';

interface Props {
  onNavigateToAdd?: () => void;
}

export default function WardrobeView({ onNavigateToAdd }: Props) {
  const { items, tags, locations, activeLocationId, loadSampleData, updateItem, batchMoveItemsLocation, t } = useApp();
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [activeTag, setActiveTag] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [toast, setToast] = useState('');
  
  // Batch Selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const dirtyItems = items.filter(i => i.status === 'dirty' || i.status === 'cleaning');

  const activeLocation = locations.find(l => l.id === activeLocationId);

  const filtered = items.filter(i => {
    // Location Filter
    const matchLocation = activeLocationId === 'all' || (i.locationId || 'loc-home') === activeLocationId;
    const matchCat = activeCategory === 'all' || i.category === activeCategory;
    const matchTag = activeTag === 'all' || i.tags.includes(activeTag);
    const matchStatus = activeStatus === 'all' || i.status === activeStatus;
    const matchSearch = !searchQuery || 
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.material?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchLocation && matchCat && matchTag && matchStatus && matchSearch;
  });

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchStatus = async (status: ClothingItem['status']) => {
    const itemsToUpdate = items.filter(i => selectedIds.has(i.id));
    await Promise.all(itemsToUpdate.map(i => updateItem({ ...i, status })));
    setSelectionMode(false);
    setSelectedIds(new Set());
    setToast(`✓ Updated ${itemsToUpdate.length} item(s)`);
  };

  const handleBatchMoveLocation = async (locId: string) => {
    const targetLoc = locations.find(l => l.id === locId);
    await batchMoveItemsLocation(Array.from(selectedIds), locId);
    setSelectionMode(false);
    setSelectedIds(new Set());
    setToast(`✓ Relocated ${selectedIds.size} item(s) to ${targetLoc?.name || 'Location'}`);
  };

  const handleBatchTag = async (tag: string) => {
    const itemsToUpdate = items.filter(i => selectedIds.has(i.id));
    await Promise.all(itemsToUpdate.map(i => {
      if (i.tags.includes(tag)) return Promise.resolve();
      return updateItem({ ...i, tags: [...i.tags, tag] });
    }));
    setSelectionMode(false);
    setSelectedIds(new Set());
    setToast(`✓ Tagged ${itemsToUpdate.length} item(s)`);
  };

  const handleLoadSample = async () => {
    setLoadingSample(true);
    await loadSampleData();
    setLoadingSample(false);
    setToast('✓ Sample wardrobe loaded');
  };

  const handleCleanAllLaundry = async () => {
    await Promise.all(dirtyItems.map(item => updateItem({ ...item, status: 'ready' })));
    setToast(`✓ Reset ${dirtyItems.length} item(s) to Ready!`);
  };

  return (
    <div className="page-content" style={{ position: 'relative', paddingBottom: 'calc(var(--space-12) + 20px)' }}>
      {/* Header with Search and Actions */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <h2 className="section-title">{t('wardrobe')}</h2>
          <span className="section-count">{filtered.length}</span>
          {activeLocationId !== 'all' && (
            <span style={{ fontSize: 11, background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 600 }}>
              {activeLocation?.icon} {activeLocation?.name}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {onNavigateToAdd && (
            <button
              className="btn btn-primary"
              style={{ padding: '5px 12px', fontSize: 13, height: 'auto', minHeight: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => { triggerHaptic(10); onNavigateToAdd(); }}
            >
              <span>+</span> <span>{t('add')}</span>
            </button>
          )}
          {items.length > 0 && (
            <button 
              className={`btn ${selectionMode ? 'btn-primary' : 'btn-ghost'}`} 
              style={{ padding: '4px 12px', fontSize: 13, height: 'auto', minHeight: 'auto' }}
              onClick={() => {
                setSelectionMode(!selectionMode);
                setSelectedIds(new Set());
              }}
            >
              {selectionMode ? t('done') : t('selectMode')}
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container animate-in">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}
          >
            ×
          </button>
        )}
      </div>

      {/* Stats Mini Bar */}
      {items.length > 0 && (
        <div className="stats-row animate-in" style={{ display: searchQuery ? 'none' : 'flex' }}>
          <div className="stat-card">
            <span className="stat-card__value">{filtered.length}</span>
            <span className="stat-card__label">{activeLocationId !== 'all' ? 'Here' : t('items')}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__value">
              {new Set(filtered.map(i => i.category)).size}
            </span>
            <span className="stat-card__label">{t('categories')}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__value">
              {new Set(filtered.flatMap(i => i.tags)).size}
            </span>
            <span className="stat-card__label">{t('styles')}</span>
          </div>
        </div>
      )}

      {/* Filter Chips */}
      {items.length > 0 && (
        <>
          <div className="filter-bar" style={{ marginBottom: 'var(--space-2)' }}>
            <button
              id="filter-cat-all"
              className={`filter-chip ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              {t('all')}
            </button>
            {CATEGORIES.map(cat => (
              <button
                id={`filter-cat-${cat.value}`}
                key={cat.value}
                className={`filter-chip ${activeCategory === cat.value ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.value)}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
          
          <div className="filter-bar">
            <button
              id="filter-tag-all"
              className={`filter-chip ${activeTag === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTag('all')}
            >
              🏷️ {t('allStyles')}
            </button>
            {tags.map(tag => (
              <button
                id={`filter-tag-${tag.id}`}
                key={tag.id}
                className={`filter-chip ${activeTag === tag.label ? 'active' : ''}`}
                onClick={() => setActiveTag(tag.label)}
              >
                {tag.label}
              </button>
            ))}
          </div>

          <div className="filter-bar">
            <button
              id="filter-status-all"
              className={`filter-chip ${activeStatus === 'all' ? 'active' : ''}`}
              onClick={() => setActiveStatus('all')}
            >
              ✨ {t('allStatus')}
            </button>
            <button
              id="filter-status-ready"
              className={`filter-chip ${activeStatus === 'ready' ? 'active' : ''}`}
              onClick={() => setActiveStatus('ready')}
            >
              ✅ {t('ready')}
            </button>
            <button
              id="filter-status-dirty"
              className={`filter-chip ${activeStatus === 'dirty' ? 'active' : ''}`}
              onClick={() => setActiveStatus('dirty')}
            >
              🧺 {t('dirty')}
            </button>
            <button
              id="filter-status-cleaning"
              className={`filter-chip ${activeStatus === 'cleaning' ? 'active' : ''}`}
              onClick={() => setActiveStatus('cleaning')}
            >
              🧼 {t('cleaning')}
            </button>
          </div>

          {/* Quick Laundry Reset Banner */}
          {dirtyItems.length > 0 && (
            <div style={{
              marginTop: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 13
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🧺</span>
                <span><strong>{dirtyItems.length} {t('laundryBanner')}</strong></span>
              </div>
              <button
                onClick={handleCleanAllLaundry}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {t('cleanAllReady')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Grid */}
      {items.length === 0 ? (
        <div className="empty-state animate-in" style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
          <div className="empty-state__emoji" style={{ fontSize: 56, marginBottom: 12 }}>🧥</div>
          <div className="empty-state__title" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{t('emptyWardrobeTitle')}</div>
          <p className="empty-state__desc" style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 20px auto' }}>
            {t('emptyWardrobeDesc')}
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 280, margin: '0 auto' }}>
            {onNavigateToAdd && (
              <button
                className="btn btn-primary"
                onClick={onNavigateToAdd}
                style={{ padding: '12px 20px', fontSize: 14, fontWeight: 700 }}
              >
                {t('addFirstItem')}
              </button>
            )}
            <button
              className="btn btn-ghost"
              onClick={handleLoadSample}
              disabled={loadingSample}
              style={{ fontSize: 13, color: 'var(--text-muted)' }}
            >
              {loadingSample ? '...' : t('loadSampleWardrobe')}
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state animate-in">
          <div className="empty-state__emoji">📍</div>
          <div className="empty-state__title">No items found</div>
          <div className="empty-state__desc">
            {activeLocationId !== 'all' 
              ? `No clothing items currently at ${activeLocation?.name || 'this location'}.` 
              : `Try adjusting your search or filters.`}
          </div>
        </div>
      ) : (
        <>
          <div className="item-grid animate-in">
            {filtered.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onClick={() => selectionMode ? toggleSelection(item.id) : setSelectedItem(item)}
                selectable={selectionMode}
                selected={selectedIds.has(item.id)}
                onSelect={() => toggleSelection(item.id)}
              />
            ))}
          </div>

          {selectionMode && selectedIds.size > 0 && (
            <div className="batch-actions-bar animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>
                  {selectedIds.size} selected
                </div>
                {/* Batch Move Location Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Move to:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleBatchMoveLocation(e.target.value);
                    }}
                    defaultValue=""
                    style={{
                      background: 'var(--bg-3)',
                      color: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-pill)',
                      padding: '2px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <option value="" disabled>Select Location...</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.icon || '📍'} {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', paddingBottom: 4 }}>
                <button className="btn btn-ghost" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: 11, border: 'none' }} onClick={() => handleBatchStatus('ready')}>✅ Set Ready</button>
                <button className="btn btn-ghost" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: 11, border: 'none' }} onClick={() => handleBatchStatus('dirty')}>🧺 Set Dirty</button>
                {tags.slice(0, 4).map(tag => (
                  <button key={tag.id} className="btn btn-ghost" style={{ background: 'rgba(255,255,255,0.1)', fontSize: 11, border: 'none' }} onClick={() => handleBatchTag(tag.label)}>🏷️ +{tag.label}</button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating Action Button (FAB) for Wardrobe Page */}
      {onNavigateToAdd && items.length > 0 && (
        <button
          onClick={() => { triggerHaptic(12); onNavigateToAdd(); }}
          style={{
            position: 'fixed',
            bottom: 'calc(var(--nav-height) + max(24px, env(safe-area-inset-bottom)))',
            right: 20,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--accent-gradient)',
            color: 'white',
            border: 'none',
            fontSize: 28,
            fontWeight: 400,
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)',
            cursor: 'pointer',
            zIndex: 45,
            transition: 'transform 0.2s ease, boxShadow 0.2s ease'
          }}
          aria-label="Add item to wardrobe"
          title="Add clothing item"
        >
          +
        </button>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={items.find(i => i.id === selectedItem.id) || selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
