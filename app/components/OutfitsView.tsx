'use client';

import { useState } from 'react';
import { useApp } from './AppProvider';
import { Outfit, ClothingItem, CATEGORIES } from '../lib/types';
import OutfitCard from './OutfitCard';
import OutfitBuilderModal from './OutfitBuilderModal';
import OutfitDetailModal from './OutfitDetailModal';
import { v4 as uuidv4 } from 'uuid';
import Toast from './Toast';

export default function OutfitsView() {
  const { outfits, items, addOutfit } = useApp();
  const [buildingOutfit, setBuildingOutfit] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<Outfit | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [toast, setToast] = useState('');

  // Improved suggestion: pick a random item from each core category,
  // prioritizing items worn less recently.
  const getSuggestion = () => {
    const categories: ('top' | 'bottom' | 'shoes')[] = ['top', 'bottom', 'shoes'];
    const result: ClothingItem[] = [];

    categories.forEach(cat => {
      const candidates = items.filter(i => i.category === cat && i.status === 'ready');
      if (candidates.length > 0) {
        // Sort by last worn date (oldest first or never worn)
        const sorted = [...candidates].sort((a, b) => {
          const aLogs = a.wearLogs || (a.lastWornAt ? [a.lastWornAt] : []);
          const bLogs = b.wearLogs || (b.lastWornAt ? [b.lastWornAt] : []);
          const aLast = aLogs.length > 0 ? Math.max(...aLogs) : 0;
          const bLast = bLogs.length > 0 ? Math.max(...bLogs) : 0;
          return aLast - bLast;
        });
        
        // Take one from the top few (randomize slightly among least worn)
        const pool = sorted.slice(0, Math.min(3, sorted.length));
        result.push(pool[Math.floor(Math.random() * pool.length)]);
      }
    });

    return result;
  };

  const [currentSuggestion, setCurrentSuggestion] = useState<ClothingItem[]>(getSuggestion());

  const handleShuffleSuggestion = () => {
    setCurrentSuggestion(getSuggestion());
  };

  const handleSaveSuggestion = async () => {
    if (currentSuggestion.length < 2) return;
    const now = Date.now();
    const outfitName = `Look: ${currentSuggestion.map(i => i.name).join(' + ')}`;
    await addOutfit({
      id: uuidv4(),
      name: outfitName,
      note: 'Auto-generated look',
      itemIds: currentSuggestion.map(i => i.id),
      createdAt: now,
    });
    setToast('✓ Outfit saved!');
  };

  type SortOption = 'newest' | 'oldest' | 'name' | 'most-worn' | 'recently-worn' | 'items-count';
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const sortedOutfits = [...outfits].sort((a, b) => {
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
    if (sortBy === 'recently-worn') {
      const aLast = a.wearLogs && a.wearLogs.length > 0 ? Math.max(...a.wearLogs) : (a.lastWornAt || 0);
      const bLast = b.wearLogs && b.wearLogs.length > 0 ? Math.max(...b.wearLogs) : (b.lastWornAt || 0);
      return bLast - aLast;
    }
    if (sortBy === 'items-count') {
      return (b.itemIds?.length || 0) - (a.itemIds?.length || 0);
    }
    return 0;
  });

  return (
    <div className="page-content">
      {/* Build Button & Generator */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button
          id="btn-build-outfit"
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={() => setBuildingOutfit(true)}
          disabled={items.length < 2}
        >
          ✨ Build Outfit
        </button>
        {items.length >= 2 && (
          <button
            id="btn-shuffle-outfit"
            className="btn btn-ghost"
            style={{ padding: '0 16px', fontSize: 13 }}
            onClick={handleShuffleSuggestion}
            title="Randomize a look from ready wardrobe items"
          >
            🎲 Shuffle Look
          </button>
        )}
      </div>

      {items.length < 2 && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: -12, marginBottom: 20 }}>
          Add at least 2 items to your wardrobe to start building looks
        </p>
      )}

      {/* Quick Suggestion */}
      {currentSuggestion.length >= 2 && (
        <div style={{
          background: 'var(--accent-subtle)',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              💡 Smart Look Suggestion
            </div>
            <button
              onClick={handleShuffleSuggestion}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              🔄 Refresh
            </button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            {currentSuggestion.map(item => {
              const cat = CATEGORIES.find(c => c.value === item.category);
              return item.images && item.images.length > 0 ? (
                <img
                  key={item.id}
                  src={item.images[0]}
                  alt={item.name}
                  style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 12, flex: 1, maxWidth: 80 }}
                />
              ) : (
                <div key={item.id} style={{
                  width: 64, height: 64, background: 'var(--bg-3)', borderRadius: 12,
                  display: 'grid', placeItems: 'center', fontSize: 28, flex: 1, maxWidth: 80
                }}>
                  {cat?.emoji}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
              {currentSuggestion.map(i => i.name).join(' + ')}
            </p>
            <button
              onClick={handleSaveSuggestion}
              style={{
                background: 'var(--accent)', color: 'white', border: 'none',
                padding: '4px 10px', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 600, cursor: 'pointer'
              }}
            >
              + Save Look
            </button>
          </div>
        </div>
      )}

      {/* Outfits List Header, Sorting & Toggle */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span className="section-title">Saved Outfits</span>
          <span className="section-count">{outfits.length}</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Sort:</span>
            <select
              id="select-outfit-sort"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              style={{
                padding: '4px 8px',
                fontSize: 12,
                height: 30,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-3)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                outline: 'none',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              <option value="newest">📅 Newest</option>
              <option value="oldest">⌛ Oldest</option>
              <option value="name">🔤 Name (A-Z)</option>
              <option value="most-worn">🔥 Most Worn</option>
              <option value="recently-worn">🕒 Recently Worn</option>
              <option value="items-count">🛍️ Most Items</option>
            </select>
          </div>

          <div className="view-toggle" style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', padding: 3, borderRadius: 'var(--radius-md)' }}>
            <button
              id="view-toggle-grid"
              className={`btn-icon-toggle ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View (4 photos)"
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
                gap: 4,
                transition: 'all 0.2s ease'
              }}
            >
              <span>⊞</span> Grid
            </button>
            <button
              id="view-toggle-list"
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
                gap: 4,
                transition: 'all 0.2s ease'
              }}
            >
              <span>☰</span> List
            </button>
          </div>
        </div>
      </div>

      {sortedOutfits.length === 0 ? (
        <div className="empty-state animate-in">
          <div className="empty-state__emoji">✨</div>
          <div className="empty-state__title">No outfits yet</div>
          <div className="empty-state__desc">
            Build your first outfit or tap <strong>Shuffle Look</strong> above
          </div>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'outfit-grid animate-in' : 'outfit-list animate-in'}>
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

      {/* Modals */}
      {(buildingOutfit || editingOutfit) && (
        <OutfitBuilderModal 
          initialOutfit={editingOutfit}
          onClose={() => {
            setBuildingOutfit(false);
            setEditingOutfit(null);
          }} 
        />
      )}
      {selectedOutfit && (
        <OutfitDetailModal
          outfit={selectedOutfit}
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
