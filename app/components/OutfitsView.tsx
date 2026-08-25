'use client';

import React, { useState } from 'react';
import { useOutfits } from '../contexts/OutfitContext';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useSettings } from '../contexts/SettingsContext';
import OutfitCard from './OutfitCard';
import OutfitDetailModal from './OutfitDetailModal';
import OutfitBuilderModal from './OutfitBuilderModal';
import { uuidv4 } from '../lib/id';
import { Outfit } from '../lib/types';
import Toast from './Toast';
import { triggerHaptic } from '../lib/haptics';
import { Sparkles, RefreshCw, CategoryIcon, Grid, List, CheckCircle2 } from './AppIcon';
import { ResolvedImage } from './ResolvedImage';
import { usePersistentState } from '../lib/hooks/usePersistentState';

type SortOption = 'newest' | 'oldest' | 'name' | 'most-worn' | 'recently-worn' | 'items-count';

const OUTFIT_SORT_OPTIONS: SortOption[] = [
  'newest', 'oldest', 'name', 'most-worn', 'recently-worn', 'items-count'
];

export default function OutfitsView() {
  const { outfits, addOutfit } = useOutfits();
  const { items } = useWardrobe();
  const { t } = useSettings();

  const [buildingOutfit, setBuildingOutfit] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<Outfit | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [sortBy, setSortBy] = usePersistentState<SortOption>('fitly_outfits_sort_by', 'newest', OUTFIT_SORT_OPTIONS);
  const [viewMode, setViewMode] = usePersistentState<'grid' | 'list'>('fitly_outfits_view_mode', 'grid', ['grid', 'list']);
  const [toast, setToast] = useState('');

  // Daily suggestion state
  const [suggestionSeed, setSuggestionSeed] = useState(0);

  // Generate a outfit suggestion from available wardrobe items
  const currentSuggestion = React.useMemo(() => {
    if (items.length < 2) return [];

    // Pick 1 top, 1 bottom, 1 shoes or outerwear
    const tops = items.filter(i => i.category === 'top');
    const bottoms = items.filter(i => i.category === 'bottom');
    const shoes = items.filter(i => i.category === 'shoes');
    const outer = items.filter(i => i.category === 'outerwear');

    const picked: typeof items = [];
    if (tops.length > 0) picked.push(tops[(suggestionSeed + 1) % tops.length]);
    if (bottoms.length > 0) picked.push(bottoms[(suggestionSeed + 2) % bottoms.length]);
    if (shoes.length > 0) picked.push(shoes[(suggestionSeed + 3) % shoes.length]);
    else if (outer.length > 0) picked.push(outer[(suggestionSeed + 4) % outer.length]);

    return picked;
  }, [items, suggestionSeed]);

  const handleShuffleSuggestion = () => {
    triggerHaptic(10);
    setSuggestionSeed(prev => prev + 1);
  };

  const handleSaveSuggestion = async () => {
    if (currentSuggestion.length === 0) return;
    triggerHaptic(15);
    await addOutfit({
      id: uuidv4(),
      name: `Daily Look ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
      note: 'Auto-generated suggestion',
      itemIds: currentSuggestion.map(i => i.id),
      createdAt: Date.now()
    });
    setToast('✓ Outfit saved!');
  };

  const sortedOutfits = React.useMemo(() => {
    const list = [...outfits];
    switch (sortBy) {
      case 'newest':
        return list.sort((a, b) => b.createdAt - a.createdAt);
      case 'oldest':
        return list.sort((a, b) => a.createdAt - b.createdAt);
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'most-worn':
        return list.sort((a, b) => (b.wearLogs?.length || 0) - (a.wearLogs?.length || 0));
      case 'recently-worn':
        return list.sort((a, b) => (b.lastWornAt || 0) - (a.lastWornAt || 0));
      case 'items-count':
        return list.sort((a, b) => b.itemIds.length - a.itemIds.length);
      default:
        return list;
    }
  }, [outfits, sortBy]);

  return (
    <div className="page-content">
      {/* Build Button & Generator */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1, padding: 'var(--space-4)', fontSize: 'var(--font-base)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={() => setBuildingOutfit(true)}
        >
          <Sparkles size={18} />
          <span>{t('buildOutfit')}</span>
        </button>
      </div>

      {/* Outfit Suggestion Generator */}
      {items.length >= 2 && (
        <div
          className="animate-in"
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} color="var(--accent)" />
                <span>Daily Outfit Suggestion</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Fresh combination based on your wardrobe & wear history
              </div>
            </div>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '4px 10px', height: 30, display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={handleShuffleSuggestion}
              aria-label="Shuffle suggestion"
            >
              <RefreshCw size={13} />
              <span>Shuffle</span>
            </button>
          </div>

          {currentSuggestion.length > 0 ? (
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fit, minmax(76px, 1fr))`,
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
              }}>
                {currentSuggestion.map(item => {
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 6,
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        position: 'relative'
                      }}
                    >
                      {/* Image Container with 1:1 Aspect Ratio */}
                      <div style={{
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: 'calc(var(--radius-lg) - 4px)',
                        background: 'var(--bg-3)',
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <ResolvedImage
                          src={item.images && item.images[0]}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          fallback={<CategoryIcon category={item.category} size={24} />}
                        />
                        <span style={{
                          position: 'absolute',
                          bottom: 3,
                          left: 3,
                          background: 'rgba(0, 0, 0, 0.65)',
                          backdropFilter: 'blur(4px)',
                          color: '#fff',
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 4,
                          textTransform: 'capitalize',
                          lineHeight: 1.2
                        }}>
                          {item.category}
                        </span>
                      </div>
                      
                      <div style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%',
                        padding: '0 2px'
                      }}>
                        {item.name}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                className="btn btn-ghost"
                style={{ width: '100%', padding: '10px', fontSize: 13, fontWeight: 700, background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={handleSaveSuggestion}
              >
                <CheckCircle2 size={16} />
                <span>Save Suggestion as Outfit</span>
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Add more items to get daily AI suggestions!
            </div>
          )}
        </div>
      )}

      {/* Outfits List Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <h2 className="section-title">{t('savedOutfits')}</h2>
          <span className="section-count">{sortedOutfits.length}</span>
        </div>

        {outfits.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort outfits"
              style={{
                padding: '4px 8px',
                fontSize: 12,
                height: 30,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-2)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                fontWeight: 600
              }}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
              <option value="most-worn">Most Worn</option>
              <option value="recently-worn">Recently Worn</option>
              <option value="items-count">Most Items</option>
            </select>

            <div role="group" aria-label="View mode toggle" style={{ display: 'flex', gap: 2, background: 'var(--bg-3)', padding: 2, borderRadius: 'var(--radius-md)' }}>
              <button
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                style={{
                  background: viewMode === 'grid' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'grid' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Grid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
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
                  alignItems: 'center'
                }}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid or List of Outfits */}
      {outfits.length === 0 ? (
        <div className="empty-state animate-in" style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
          <div className="empty-state__emoji" style={{ fontSize: 48, marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <Sparkles size={48} color="var(--accent)" />
          </div>
          <div className="empty-state__title" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            No Saved Outfits Yet
          </div>
          <p className="empty-state__desc" style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 20px auto' }}>
            Combine clothing items into stylish looks for any occasion.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setBuildingOutfit(true)}
            style={{ padding: '12px 20px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Sparkles size={16} />
            <span>Build Your First Outfit</span>
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'item-grid animate-in' : 'item-list animate-in'}>
          {sortedOutfits.map(outfit => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              items={items}
              viewMode={viewMode}
              onClick={() => setSelectedOutfit(outfit)}
            />
          ))}
        </div>
      )}

      {/* Builder Modal */}
      {buildingOutfit && (
        <OutfitBuilderModal
          onClose={() => setBuildingOutfit(false)}
        />
      )}

      {/* Edit Modal */}
      {editingOutfit && (
        <OutfitBuilderModal
          initialOutfit={editingOutfit}
          onClose={() => setEditingOutfit(null)}
        />
      )}

      {/* Detail Modal */}
      {selectedOutfit && (
        <OutfitDetailModal
          outfit={outfits.find(o => o.id === selectedOutfit.id) || selectedOutfit}
          items={items}
          onClose={() => setSelectedOutfit(null)}
          onEdit={() => {
            setEditingOutfit(selectedOutfit);
            setSelectedOutfit(null);
          }}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
