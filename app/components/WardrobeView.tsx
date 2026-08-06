'use client';

import React, { useState, useMemo } from 'react';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useSettings } from '../contexts/SettingsContext';
import { CATEGORIES, Category, ClothingItem, COLORS, getColorLabel } from '../lib/types';
import { itemService, WardrobeSortOption } from '../services/ItemService';
import { usePersistentState } from '../lib/hooks/usePersistentState';
import ItemCard from './ItemCard';
import SkeletonCard from './SkeletonCard';
import ItemDetailModal from './ItemDetailModal';
import VirtualizedGrid from './VirtualizedGrid';
import Toast from './Toast';
import { CategoryIcon, LocationIcon, Shirt, Search, Grid, List, CheckCircle2, WashingMachine, Tag, MapPin, Palette, LayoutGrid } from './AppIcon';

interface Props {
  onNavigateToAdd?: () => void;
}

const WARDROBE_SORT_OPTIONS: WardrobeSortOption[] = [
  'newest', 'oldest', 'most-worn', 'least-worn', 'price-high', 'price-low', 'cpw-low', 'cpw-high', 'name', 'last-worn'
];

export default function WardrobeView({ onNavigateToAdd }: Props) {
  const { items, tags, locations, activeLocationId, loadSampleData, updateItem, batchMoveItemsLocation } = useWardrobe();
  const { t } = useSettings();

  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [activeTag, setActiveTag] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [activeCondition, setActiveCondition] = useState<string>('all');
  const [activeColor, setActiveColor] = useState<string>('all');
  const [gridDensity, setGridDensity] = useState<'normal' | 'compact'>('normal');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = usePersistentState<WardrobeSortOption>('fitly_wardrobe_sort_by', 'newest', WARDROBE_SORT_OPTIONS);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [toast, setToast] = useState('');

  // Batch Selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const dirtyItems = useMemo(() => items.filter(i => i.status === 'dirty' || i.status === 'cleaning'), [items]);
  const activeLocation = useMemo(() => locations.find(l => l.id === activeLocationId), [locations, activeLocationId]);

  // Filter & Sort using ItemService
  const filtered = useMemo(() => {
    const baseFiltered = itemService.filterItems(items, {
      category: activeCategory,
      tag: activeTag,
      status: activeStatus,
      condition: activeCondition,
      locationId: activeLocationId,
      searchQuery,
    });
    if (activeColor === 'all') return baseFiltered;
    return baseFiltered.filter(i => {
      if (!i.color) return false;
      return i.color.toLowerCase() === activeColor.toLowerCase() ||
        getColorLabel(i.color).toLowerCase().includes(activeColor.toLowerCase());
    });
  }, [items, activeCategory, activeTag, activeStatus, activeCondition, activeColor, activeLocationId, searchQuery]);

  const sorted = useMemo(() => {
    return itemService.sortItems(filtered, sortBy);
  }, [filtered, sortBy]);

  const hasActiveFilters = activeCategory !== 'all' || activeTag !== 'all' || activeStatus !== 'all' || activeCondition !== 'all' || activeColor !== 'all' || searchQuery !== '';

  const handleResetFilters = () => {
    setActiveCategory('all');
    setActiveTag('all');
    setActiveStatus('all');
    setActiveCondition('all');
    setActiveColor('all');
    setSearchQuery('');
  };

  const handleToggleItemStatus = async (item: ClothingItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus: ClothingItem['status'] = item.status === 'dirty' ? 'ready' : 'dirty';
    await updateItem({ ...item, status: nextStatus });
    setToast(nextStatus === 'ready' ? `✓ ${item.name} marked Clean 🧼` : `✓ ${item.name} moved to Laundry 🧺`);
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
            <span style={{ fontSize: 11, background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <LocationIcon icon={activeLocation?.icon} size={13} />
              <span>{activeLocation?.name}</span>
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
              aria-pressed={selectionMode}
            >
              {selectionMode ? t('done') : t('selectMode')}
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container animate-in">
        <span className="search-icon" style={{ display: 'flex', alignItems: 'center' }}>
          <Search size={16} />
        </span>
        <input
          type="text"
          className="search-input"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search items"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}
            aria-label="Clear search query"
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
              aria-label="Sort items"
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
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="most-worn">Most Worn</option>
              <option value="least-worn">Least Worn</option>
              <option value="price-high">Price: High → Low</option>
              <option value="price-low">Price: Low → High</option>
              <option value="cpw-low">Best Value (Lowest CPW)</option>
              <option value="cpw-high">Highest CPW</option>
            </select>
          </div>

          <div className="view-toggle" role="group" aria-label="View toggle" style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', padding: 3, borderRadius: 'var(--radius-md)' }}>
            <button
              id="view-toggle-wardrobe-grid"
              className={`btn-icon-toggle ${viewMode === 'grid' && gridDensity === 'normal' ? 'active' : ''}`}
              onClick={() => { setViewMode('grid'); setGridDensity('normal'); }}
              title="Grid View"
              aria-pressed={viewMode === 'grid' && gridDensity === 'normal'}
              style={{
                background: viewMode === 'grid' && gridDensity === 'normal' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'grid' && gridDensity === 'normal' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Grid size={14} />
              <span>Grid</span>
            </button>
            <button
              id="view-toggle-wardrobe-compact"
              className={`btn-icon-toggle ${viewMode === 'grid' && gridDensity === 'compact' ? 'active' : ''}`}
              onClick={() => { setViewMode('grid'); setGridDensity('compact'); }}
              title="Compact View"
              aria-pressed={viewMode === 'grid' && gridDensity === 'compact'}
              style={{
                background: viewMode === 'grid' && gridDensity === 'compact' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'grid' && gridDensity === 'compact' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <LayoutGrid size={14} />
              <span>Compact</span>
            </button>
            <button
              id="view-toggle-wardrobe-list"
              className={`btn-icon-toggle ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
              aria-pressed={viewMode === 'list'}
              style={{
                background: viewMode === 'list' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <List size={14} />
              <span>List</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Chips */}
      {items.length > 0 && (
        <>
          {/* Color Swatches */}
          <div className="filter-bar color-swatch-bar" role="tablist" aria-label="Color filters" style={{ marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, paddingRight: 4, flexShrink: 0 }}>
              <Palette size={13} />
              <span>Color:</span>
            </span>
            <button
              role="tab"
              aria-selected={activeColor === 'all'}
              className={`filter-chip ${activeColor === 'all' ? 'active' : ''}`}
              onClick={() => setActiveColor('all')}
              style={{ fontSize: 11, padding: '2px 8px' }}
            >
              All
            </button>
            {COLORS.map(c => (
              <button
                key={c.value}
                role="tab"
                aria-selected={activeColor === c.value}
                className={`color-swatch-chip ${activeColor === c.value ? 'active' : ''}`}
                onClick={() => setActiveColor(activeColor === c.value ? 'all' : c.value)}
                title={c.label}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  backgroundColor: c.value,
                  border: activeColor === c.value ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: activeColor === c.value ? '0 0 8px var(--accent-glow)' : 'none',
                  transition: 'transform 0.15s ease'
                }}
              />
            ))}
          </div>
          <div className="filter-bar" role="tablist" aria-label="Category filters" style={{ marginBottom: 'var(--space-2)' }}>
            <button
              id="filter-cat-all"
              role="tab"
              aria-selected={activeCategory === 'all'}
              className={`filter-chip ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              {t('all')}
            </button>
            {CATEGORIES.map(cat => (
              <button
                id={`filter-cat-${cat.value}`}
                key={cat.value}
                role="tab"
                aria-selected={activeCategory === cat.value}
                className={`filter-chip ${activeCategory === cat.value ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.value)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <CategoryIcon category={cat.value} size={14} />
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="filter-bar" role="tablist" aria-label="Tag filters" style={{ marginBottom: 'var(--space-2)' }}>
            <button
              id="filter-tag-all"
              role="tab"
              aria-selected={activeTag === 'all'}
              className={`filter-chip ${activeTag === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTag('all')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Tag size={14} />
              <span>{t('allStyles')}</span>
            </button>
            {tags.map(tag => (
              <button
                id={`filter-tag-${tag.id}`}
                key={tag.id}
                role="tab"
                aria-selected={activeTag === tag.label}
                className={`filter-chip ${activeTag === tag.label ? 'active' : ''}`}
                onClick={() => setActiveTag(tag.label)}
              >
                {tag.label}
              </button>
            ))}
          </div>

          <div className="filter-bar" role="tablist" aria-label="Status filters" style={{ marginBottom: 'var(--space-3)' }}>
            <button
              id="filter-status-all"
              role="tab"
              aria-selected={activeStatus === 'all'}
              className={`filter-chip ${activeStatus === 'all' ? 'active' : ''}`}
              onClick={() => setActiveStatus('all')}
            >
              ✨ {t('allStatus')}
            </button>
            <button
              id="filter-status-ready"
              role="tab"
              aria-selected={activeStatus === 'ready'}
              className={`filter-chip ${activeStatus === 'ready' ? 'active' : ''}`}
              onClick={() => setActiveStatus('ready')}
            >
              ✅ {t('ready')}
            </button>
            <button
              id="filter-status-dirty"
              role="tab"
              aria-selected={activeStatus === 'dirty'}
              className={`filter-chip ${activeStatus === 'dirty' ? 'active' : ''}`}
              onClick={() => setActiveStatus('dirty')}
            >
              🧺 {t('dirty')}
            </button>
            <button
              id="filter-status-cleaning"
              role="tab"
              aria-selected={activeStatus === 'cleaning'}
              className={`filter-chip ${activeStatus === 'cleaning' ? 'active' : ''}`}
              onClick={() => setActiveStatus('cleaning')}
            >
              🧼 {t('cleaning')}
            </button>
          </div>

          {/* Active Filter Indicators */}
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

      {/* Grid or List View with Virtualization */}
      {loadingSample ? (
        <div className={viewMode === 'grid' ? 'item-grid animate-in' : 'item-list animate-in'}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} viewMode={viewMode} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state animate-in" style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
          <div className="empty-state__emoji" style={{ fontSize: 48, marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <Shirt size={48} color="var(--accent)" />
          </div>
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
          <div className="empty-state__emoji" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <MapPin size={48} color="var(--accent)" />
          </div>
          <div className="empty-state__title">No items found</div>
          <div className="empty-state__desc">
            {activeLocationId !== 'all' 
              ? `No clothing items currently at ${activeLocation?.name || 'this location'}.` 
              : `Try adjusting your search or filters.`}
          </div>
        </div>
      ) : (
        <>
          <VirtualizedGrid
            items={sorted}
            keyExtractor={(item) => item.id}
            itemHeight={viewMode === 'grid' ? (gridDensity === 'compact' ? 170 : 240) : 80}
            columns={viewMode === 'grid' ? (gridDensity === 'compact' ? 3 : 2) : 1}
            className={viewMode === 'grid' ? (gridDensity === 'compact' ? 'item-grid item-grid--compact animate-in' : 'item-grid animate-in') : 'item-list animate-in'}
            renderItem={(item) => (
              <ItemCard
                key={item.id}
                item={item}
                viewMode={viewMode}
                density={gridDensity}
                onToggleStatus={handleToggleItemStatus}
                onClick={() => selectionMode ? toggleSelection(item.id) : setSelectedItem(item)}
                selectable={selectionMode}
                selected={selectedIds.has(item.id)}
                onSelect={() => toggleSelection(item.id)}
              />
            )}
          />

          {selectionMode && selectedIds.size > 0 && (
            <div className="batch-actions-bar animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>
                  {selectedIds.size} selected
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Move to:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleBatchMoveLocation(e.target.value);
                    }}
                    defaultValue=""
                    aria-label="Move selected items to location"
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
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', paddingBottom: 4 }}>
                <button className="btn btn-ghost" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: 11, border: 'none', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleBatchStatus('ready')}>
                  <CheckCircle2 size={12} />
                  <span>Set Ready</span>
                </button>
                <button className="btn btn-ghost" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: 11, border: 'none', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleBatchStatus('dirty')}>
                  <WashingMachine size={12} />
                  <span>Set Dirty</span>
                </button>
                {tags.slice(0, 4).map(tag => (
                  <button key={tag.id} className="btn btn-ghost" style={{ background: 'rgba(255,255,255,0.1)', fontSize: 11, border: 'none', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleBatchTag(tag.label)}>
                    <Tag size={12} />
                    <span>+{tag.label}</span>
                  </button>
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
