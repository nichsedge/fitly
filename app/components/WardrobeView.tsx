'use client';

import { useState } from 'react';
import { useApp } from './AppProvider';
import { CATEGORIES, Category, getColorLabel } from '../lib/types';
import ItemCard from './ItemCard';
import SkeletonCard from './SkeletonCard';
import ItemDetailModal from './ItemDetailModal';
import { ClothingItem } from '../lib/types';
import Toast from './Toast';

interface Props {
  onNavigateToAdd?: () => void;
}

export type WardrobeSortOption = 
  | 'newest'
  | 'oldest'
  | 'name'
  | 'most-worn'
  | 'least-worn'
  | 'recently-worn'
  | 'price-high'
  | 'price-low'
  | 'cpw-best'
  | 'cpw-worst';

export default function WardrobeView({ onNavigateToAdd }: Props) {
  const { items, tags, locations, activeLocationId, loadSampleData, updateItem, batchMoveItemsLocation, t } = useApp();
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [activeTag, setActiveTag] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [activeCondition, setActiveCondition] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<WardrobeSortOption>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
    const matchCondition = activeCondition === 'all' || (i.condition || 'good') === activeCondition;
    
    const colorLabel = getColorLabel(i.color || '');
    const matchSearch = !searchQuery || 
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.material?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      colorLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchLocation && matchCat && matchTag && matchStatus && matchCondition && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') {
      return (b.createdAt || 0) - (a.createdAt || 0);
    }
    if (sortBy === 'oldest') {
      return (a.createdAt || 0) - (b.createdAt || 0);
    }
    if (sortBy === 'name') {
      return (a.name || '').localeCompare(b.name || '');
    }
    if (sortBy === 'most-worn') {
      const aWorns = a.wearLogs?.length || (a.lastWornAt ? 1 : 0);
      const bWorns = b.wearLogs?.length || (b.lastWornAt ? 1 : 0);
      return bWorns - aWorns;
    }
    if (sortBy === 'least-worn') {
      const aWorns = a.wearLogs?.length || (a.lastWornAt ? 1 : 0);
      const bWorns = b.wearLogs?.length || (b.lastWornAt ? 1 : 0);
      return aWorns - bWorns;
    }
    if (sortBy === 'recently-worn') {
      const aLast = a.wearLogs && a.wearLogs.length > 0 ? Math.max(...a.wearLogs) : (a.lastWornAt || 0);
      const bLast = b.wearLogs && b.wearLogs.length > 0 ? Math.max(...b.wearLogs) : (b.lastWornAt || 0);
      return bLast - aLast;
    }
    if (sortBy === 'price-high') {
      return (b.price || 0) - (a.price || 0);
    }
    if (sortBy === 'price-low') {
      return (a.price || 0) - (b.price || 0);
    }
    if (sortBy === 'cpw-best') {
      const getCPW = (item: ClothingItem) => {
        const wears = item.wearLogs ? item.wearLogs.length : 0;
        return (item.price && wears > 0) ? (item.price / wears) : Infinity;
      };
      return getCPW(a) - getCPW(b);
    }
    if (sortBy === 'cpw-worst') {
      const getCPW = (item: ClothingItem) => {
        const wears = item.wearLogs ? item.wearLogs.length : 0;
        return (item.price && wears > 0) ? (item.price / wears) : -1;
      };
      return getCPW(b) - getCPW(a);
    }
    return 0;
  });

  const hasActiveFilters = activeCategory !== 'all' || activeTag !== 'all' || activeStatus !== 'all' || activeCondition !== 'all' || searchQuery !== '';

  const handleResetFilters = () => {
    setActiveCategory('all');
    setActiveTag('all');
    setActiveStatus('all');
    setActiveCondition('all');
    setSearchQuery('');
  };

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
    const now = Date.now();
    await Promise.all(dirtyItems.map(item => {
      const existingLogs = item.washLogs || (item.lastWashedAt ? [item.lastWashedAt] : []);
      return updateItem({ ...item, lastWashedAt: now, washLogs: [...existingLogs, now], status: 'ready' });
    }));
    setToast(`✓ Reset ${dirtyItems.length} item(s) to Ready!`);
  };

  return (
    <div className="page-content" style={{ position: 'relative', paddingBottom: 'calc(var(--space-12) + 20px)' }}>
      {/* Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <h2 className="section-title">{t('wardrobe')}</h2>
          <span className="section-count">{sorted.length}</span>
          {activeLocationId !== 'all' && (
            <span style={{ fontSize: 11, background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 600 }}>
              {activeLocation?.icon} {activeLocation?.name}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {items.length > 0 && (
            <button 
              className={`btn ${selectionMode ? 'btn-primary' : 'btn-ghost'}`} 
              style={{ padding: '4px 12px', fontSize: 13, height: 32 }}
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

      {/* Toolbar: Sort & View Toggle */}
      {items.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Sort:</span>
            <select
              id="select-wardrobe-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as WardrobeSortOption)}
              style={{
                padding: '4px 8px',
                fontSize: 12,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-2)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                outline: 'none',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <option value="newest">📅 Newest</option>
              <option value="oldest">⌛ Oldest</option>
              <option value="name">🔤 Name (A-Z)</option>
              <option value="most-worn">🔥 Most Worn</option>
              <option value="least-worn">💤 Least Worn</option>
              <option value="recently-worn">🕒 Recently Worn</option>
              <option value="price-high">💵 Price: High → Low</option>
              <option value="price-low">🏷️ Price: Low → High</option>
              <option value="cpw-best">💎 Best Value (Lowest CPW)</option>
              <option value="cpw-worst">💸 Highest CPW</option>
            </select>
          </div>

          <div className="view-toggle" style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', padding: 3, borderRadius: 'var(--radius-md)' }}>
            <button
              id="view-toggle-wardrobe-grid"
              className={`btn-icon-toggle ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
              style={{
                background: viewMode === 'grid' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'grid' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>⊞</span> Grid
            </button>
            <button
              id="view-toggle-wardrobe-list"
              className={`btn-icon-toggle ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
              style={{
                background: viewMode === 'list' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>☰</span> List
            </button>
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

          <div className="filter-bar" style={{ marginBottom: 'var(--space-2)' }}>
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

          <div className="filter-bar" style={{ marginBottom: 'var(--space-3)' }}>
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

          {/* Active Filter Indicators & Reset Button */}
          {hasActiveFilters && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Active Filters:</span>
              {activeCategory !== 'all' && (
                <span style={{ fontSize: 11, background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Category: {activeCategory} <button onClick={() => setActiveCategory('all')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>✕</button>
                </span>
              )}
              {activeTag !== 'all' && (
                <span style={{ fontSize: 11, background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Tag: {activeTag} <button onClick={() => setActiveTag('all')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>✕</button>
                </span>
              )}
              {activeStatus !== 'all' && (
                <span style={{ fontSize: 11, background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Status: {activeStatus} <button onClick={() => setActiveStatus('all')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>✕</button>
                </span>
              )}
              {searchQuery && (
                <span style={{ fontSize: 11, background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Search: &quot;{searchQuery}&quot; <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>✕</button>
                </span>
              )}
              <button
                onClick={handleResetFilters}
                style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer', marginLeft: 4 }}
              >
                Clear All
              </button>
            </div>
          )}

          {/* Quick Laundry Reset Banner */}
          {dirtyItems.length > 0 && (
            <div style={{
              marginTop: 'var(--space-2)',
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

      {/* Grid or List View */}
      {loadingSample ? (
        <div className={viewMode === 'grid' ? 'item-grid animate-in' : 'item-list animate-in'}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} viewMode={viewMode} />
          ))}
        </div>
      ) : items.length === 0 ? (
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
      ) : sorted.length === 0 ? (
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
          <div className={viewMode === 'grid' ? 'item-grid animate-in' : 'item-list animate-in'}>
            {sorted.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                viewMode={viewMode}
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
