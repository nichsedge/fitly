'use client';

import React, { useState, useMemo } from 'react';
import { useOutfits } from '../contexts/OutfitContext';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useSettings } from '../contexts/SettingsContext';
import { Outfit, ClothingItem, CATEGORIES } from '../lib/types';
import { outfitService } from '../services/OutfitService';
import OutfitCard from './OutfitCard';
import OutfitBuilderModal from './OutfitBuilderModal';
import OutfitDetailModal from './OutfitDetailModal';
import Toast from './Toast';

type SortOption = 'newest' | 'oldest' | 'name' | 'most-worn' | 'recently-worn' | 'items-count';

export default function OutfitsView() {
  const { outfits, addOutfit, getSuggestion } = useOutfits();
  const { items } = useWardrobe();
  const { t } = useSettings();

  const [buildingOutfit, setBuildingOutfit] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<Outfit | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [toast, setToast] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [currentSuggestion, setCurrentSuggestion] = useState<ClothingItem[]>(() => getSuggestion(items));

  const handleShuffleSuggestion = () => {
    setCurrentSuggestion(getSuggestion(items));
  };

  const handleSaveSuggestion = async () => {
    if (currentSuggestion.length < 2) return;
    const outfit = outfitService.createOutfit(
      `Look: ${currentSuggestion.map(i => i.name).join(' + ')}`,
      currentSuggestion.map(i => i.id),
      'Auto-generated look'
    );
    await addOutfit(outfit);
    setToast('✓ Outfit saved!');
  };

  const sortedOutfits = useMemo(() => {
    const list = [...outfits];
    switch (sortBy) {
      case 'newest':
        return list.sort((a, b) => b.createdAt - a.createdAt);
      case 'oldest':
        return list.sort((a, b) => a.createdAt - b.createdAt);
      case 'name':
        return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'most-worn':
        return list.sort((a, b) => (b.wearLogs?.length || 0) - (a.wearLogs?.length || 0));
      case 'recently-worn':
        return list.sort((a, b) => {
          const aLast = a.wearLogs && a.wearLogs.length > 0 ? Math.max(...a.wearLogs) : 0;
          const bLast = b.wearLogs && b.wearLogs.length > 0 ? Math.max(...b.wearLogs) : 0;
          return bLast - aLast;
        });
      case 'items-count':
        return list.sort((a, b) => (b.itemIds?.length || 0) - (a.itemIds?.length || 0));
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
          style={{ flex: 1, padding: 'var(--space-4)', fontSize: 'var(--font-base)', fontWeight: 700 }}
          onClick={() => setBuildingOutfit(true)}
        >
          ✨ {t('buildOutfit')}
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
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                🎲 Daily Outfit Suggestion
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Fresh combination based on your wardrobe & wear history
              </div>
            </div>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '4px 10px', height: 30 }}
              onClick={handleShuffleSuggestion}
              aria-label="Shuffle suggestion"
            >
              🔄 Shuffle
            </button>
          </div>

          {currentSuggestion.length > 0 ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${currentSuggestion.length}, 1fr)`, gap: 8, marginBottom: 12 }}>
                {currentSuggestion.map(item => {
                  const cat = CATEGORIES.find(c => c.value === item.category);
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: 'var(--bg-3)',
                        borderRadius: 'var(--radius-md)',
                        padding: 8,
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        {item.images && item.images.length > 0 ? (
                          <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          cat?.emoji || '👕'
                        )}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                        {item.name}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                className="btn btn-ghost"
                style={{ width: '100%', padding: '8px', fontSize: 12, fontWeight: 700, background: 'var(--accent-subtle)', color: 'var(--accent)', border: 'none' }}
                onClick={handleSaveSuggestion}
              >
                💾 Save Suggestion as Outfit
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
              <option value="newest">📅 Newest</option>
              <option value="oldest">⌛ Oldest</option>
              <option value="name">🔤 Name</option>
              <option value="most-worn">🔥 Most Worn</option>
              <option value="recently-worn">🕒 Recently Worn</option>
              <option value="items-count">👕 Most Items</option>
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
                  padding: '2px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ⊞
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                style={{
                  background: viewMode === 'list' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ☰
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid or List of Outfits */}
      {outfits.length === 0 ? (
        <div className="empty-state animate-in" style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
          <div className="empty-state__emoji" style={{ fontSize: 56, marginBottom: 12 }}>✨</div>
          <div className="empty-state__title" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            No Saved Outfits Yet
          </div>
          <p className="empty-state__desc" style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 20px auto' }}>
            Combine clothing items into stylish looks for any occasion.
          </p>
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
