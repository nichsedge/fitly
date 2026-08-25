'use client';

import React, { useState, useMemo } from 'react';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useSettings } from '../contexts/SettingsContext';
import { Category, ClothingItem, getColorLabel } from '../lib/types';
import { itemService, WardrobeSortOption } from '../services/ItemService';
import { usePersistentState } from '../lib/hooks/usePersistentState';
import ItemCard from './ItemCard';
import SkeletonCard from './SkeletonCard';
import ItemDetailModal from './ItemDetailModal';
import VirtualizedGrid from './VirtualizedGrid';
import Toast from './Toast';
import FilterSheetModal from './FilterSheetModal';
import { LocationIcon, Shirt, Search, Grid, List, CheckCircle2, WashingMachine, Tag, MapPin, LayoutGrid, Sliders } from './AppIcon';

interface Props {
  onNavigateToAdd?: () => void;
}

const WARDROBE_SORT_OPTIONS: WardrobeSortOption[] = [
  'newest', 'oldest', 'most-worn', 'least-worn', 'price-high', 'price-low', 'cpw-low', 'cpw-high'
];

export default function WardrobeView({ onNavigateToAdd }: Props) {
  const { items, tags, locations, activeLocationId, loadSampleData, updateItem, addItem, batchMoveItemsLocation } = useWardrobe();
  const { t } = useSettings();

  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [activeTag, setActiveTag] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [activeCondition, setActiveCondition] = useState<string>('all');
  const [activeColor, setActiveColor] = useState<string>('all');
  const [activeSparkJoy, setActiveSparkJoy] = useState<string>('all');
  const [gridDensity, setGridDensity] = usePersistentState<'normal' | 'compact'>('fitly_wardrobe_grid_density', 'normal', ['normal', 'compact']);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = usePersistentState<WardrobeSortOption>('fitly_wardrobe_sort_by', 'newest', WARDROBE_SORT_OPTIONS);
  const [viewMode, setViewMode] = usePersistentState<'grid' | 'list'>('fitly_wardrobe_view_mode', 'grid', ['grid', 'list']);
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [toast, setToast] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [deletedItemForUndo, setDeletedItemForUndo] = useState<ClothingItem | null>(null);

  // Batch Selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleUndoDelete = async () => {
    if (!deletedItemForUndo) return;
    const restored = deletedItemForUndo;
    setDeletedItemForUndo(null);
    await addItem(restored);
    setToast(`✓ Restored "${restored.name}"`);
  };

  // Filter & Sort using ItemService
  const filtered = useMemo(() => {
    const baseFiltered = itemService.filterItems(items, {
      category: activeCategory,
      tag: activeTag,
      status: activeStatus,
      condition: activeCondition,
      locationId: activeLocationId,
      sparkJoy: activeSparkJoy,
      searchQuery,
    });
    if (activeColor === 'all') return baseFiltered;
    return baseFiltered.filter(i => {
      if (!i.color) return false;
      return i.color.toLowerCase() === activeColor.toLowerCase() ||
        getColorLabel(i.color).toLowerCase().includes(activeColor.toLowerCase());
    });
  }, [items, activeCategory, activeTag, activeStatus, activeCondition, activeColor, activeSparkJoy, activeLocationId, searchQuery]);

  const sorted = useMemo(() => {
    return itemService.sortItems(filtered, sortBy);
  }, [filtered, sortBy]);

  const hasActiveFilters = activeCategory !== 'all' || activeTag !== 'all' || activeStatus !== 'all' || activeCondition !== 'all' || activeColor !== 'all' || activeSparkJoy !== 'all' || searchQuery !== '';

  const handleResetFilters = () => {
    setActiveCategory('all');
    setActiveTag('all');
    setActiveStatus('all');
    setActiveCondition('all');
    setActiveColor('all');
    setActiveSparkJoy('all');
    setSearchQuery('');
  };

  const dirtyItems = useMemo(() => items.filter(i => i.status === 'dirty' || i.status === 'cleaning'), [items]);
  const activeLocation = useMemo(() => locations.find(l => l.id === activeLocationId), [locations, activeLocationId]);

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

      {/* Filter Button & Active Filter Indicators */}
      {items.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
            <button
              className={`btn ${hasActiveFilters ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setIsFilterOpen(true)}
              style={{ padding: '6px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              aria-expanded={isFilterOpen}
            >
              <Sliders size={14} />
              <span>{t('filters')}</span>
              {hasActiveFilters && (
                <span style={{ background: 'var(--bg-0)', color: 'var(--accent)', borderRadius: 'var(--radius-pill)', padding: '0 6px', fontSize: 11, fontWeight: 800 }}>
                  {[activeCategory !== 'all', activeTag !== 'all', activeStatus !== 'all', activeCondition !== 'all', activeColor !== 'all'].filter(Boolean).length}
                </span>
              )}
            </button>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                style={{ fontSize: 12, background: 'none', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer' }}
              >
                {t('clearAll')}
              </button>
            )}
          </div>

          {/* Active Filter Indicators */}
          {hasActiveFilters && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
              {activeCategory !== 'all' && (
                <span style={{ fontSize: 11, background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {activeCategory} <button onClick={() => setActiveCategory('all')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>✕</button>
                </span>
              )}
              {activeTag !== 'all' && (
                <span style={{ fontSize: 11, background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {activeTag} <button onClick={() => setActiveTag('all')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>✕</button>
                </span>
              )}
              {activeStatus !== 'all' && (
                <span style={{ fontSize: 11, background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {activeStatus} <button onClick={() => setActiveStatus('all')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>✕</button>
                </span>
              )}
              {activeCondition !== 'all' && (
                <span style={{ fontSize: 11, background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {activeCondition} <button onClick={() => setActiveCondition('all')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>✕</button>
                </span>
              )}
              {activeColor !== 'all' && (
                <span style={{ fontSize: 11, background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {activeColor} <button onClick={() => setActiveColor('all')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>✕</button>
                </span>
              )}
              {searchQuery && (
                <span style={{ fontSize: 11, background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  &quot;{searchQuery}&quot; <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>✕</button>
                </span>
              )}
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

      {/* Filter Sheet Modal */}
      <FilterSheetModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        activeCategory={activeCategory}
        activeTag={activeTag}
        activeStatus={activeStatus}
        activeCondition={activeCondition}
        activeColor={activeColor}
        activeSparkJoy={activeSparkJoy}
        tags={tags}
        onCategoryChange={setActiveCategory}
        onTagChange={setActiveTag}
        onStatusChange={setActiveStatus}
        onConditionChange={setActiveCondition}
        onColorChange={setActiveColor}
        onSparkJoyChange={setActiveSparkJoy}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={items.find(i => i.id === selectedItem.id) || selectedItem}
          onClose={() => setSelectedItem(null)}
          onDeleted={(deletedItem) => {
            setDeletedItemForUndo(deletedItem);
            setToast(`"${deletedItem.name}" deleted`);
          }}
        />
      )}
      {toast && (
        <Toast
          message={toast}
          onDone={() => {
            setToast('');
            setDeletedItemForUndo(null);
          }}
          actionLabel={deletedItemForUndo && toast === `✓ Restored "${deletedItemForUndo.name}"` ? undefined : deletedItemForUndo ? t('undo') : undefined}
          onAction={handleUndoDelete}
        />
      )}
    </div>
  );
}
