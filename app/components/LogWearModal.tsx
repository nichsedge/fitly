'use client';

import React, { useState, useEffect } from 'react';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useOutfits } from '../contexts/OutfitContext';
import { ClothingItem, Outfit } from '../lib/types';
import { ResolvedImage } from './ResolvedImage';
import { 
  formatDateKey, 
  timestampToDateKey, 
  dateKeyToTimestamp 
} from '../lib/domain/calendar';
import { Sparkles, Shirt, Search, CategoryIcon } from './AppIcon';

export interface LogWearModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDateKey?: string;
  outfits?: Outfit[];
  items?: ClothingItem[];
  onSaveWear?: (dateKey: string, outfitId?: string, itemIds?: string[]) => Promise<void>;
  onSaveSuccess?: (message: string) => void;
}

export default function LogWearModal({
  isOpen,
  onClose,
  initialDateKey,
  outfits: propOutfits,
  items: propItems,
  onSaveWear,
  onSaveSuccess,
}: LogWearModalProps) {
  const { items: contextItems, updateItem } = useWardrobe();
  const { outfits: contextOutfits, updateOutfit } = useOutfits();

  const items = propItems || contextItems;
  const outfits = propOutfits || contextOutfits;

  const [dateKey, setDateKey] = useState(initialDateKey || formatDateKey(new Date()));
  const [mode, setMode] = useState<'outfit' | 'items'>('outfit');
  const [selectedOutfitId, setSelectedOutfitId] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDateKey(initialDateKey || formatDateKey(new Date()));
      setSelectedOutfitId('');
      setSelectedItemIds([]);
      setSearch('');
      setFilterCategory('all');
      setMode('outfit');
    }
  }, [isOpen, initialDateKey]);

  if (!isOpen) return null;

  const todayKey = formatDateKey(new Date());
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterdayObj);

  const filteredItems = items.filter(i => {
    const matchesCategory = filterCategory === 'all' || i.category === filterCategory;
    const matchesSearch = search === '' || i.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredOutfits = outfits
    .filter(o => 
      search === '' || (o.name || 'Untitled Outfit').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const nameA = (a.name || 'Untitled Outfit').toLowerCase();
      const nameB = (b.name || 'Untitled Outfit').toLowerCase();
      return nameA.localeCompare(nameB);
    });

  const handleToggleItem = (id: string) => {
    setSelectedItemIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (mode === 'outfit' && !selectedOutfitId) return;
    if (mode === 'items' && selectedItemIds.length === 0) return;

    const targetDateKey = dateKey && dateKey.trim() !== '' ? dateKey : (initialDateKey || formatDateKey(new Date()));
    const ts = dateKeyToTimestamp(targetDateKey);

    setIsSubmitting(true);
    try {
      if (onSaveWear) {
        if (mode === 'outfit') {
          await onSaveWear(targetDateKey, selectedOutfitId, undefined);
        } else {
          await onSaveWear(targetDateKey, undefined, selectedItemIds);
        }
      } else {
        if (mode === 'outfit') {
          const outfit = outfits.find(o => o.id === selectedOutfitId);
          if (outfit) {
            const existingLogs = outfit.wearLogs || (outfit.lastWornAt ? [outfit.lastWornAt] : []);
            const hasLogForDate = existingLogs.some(logTs => timestampToDateKey(logTs) === targetDateKey);
            const updatedLogs = hasLogForDate ? existingLogs : [...existingLogs, ts];
            const newLastWorn = Math.max(...updatedLogs, outfit.lastWornAt || 0);
            await updateOutfit({ ...outfit, wearLogs: updatedLogs, lastWornAt: newLastWorn });

            for (const id of outfit.itemIds) {
              const item = items.find(i => i.id === id);
              if (item) {
                const existingItemLogs = item.wearLogs || (item.lastWornAt ? [item.lastWornAt] : []);
                const hasItemLog = existingItemLogs.some(logTs => timestampToDateKey(logTs) === targetDateKey);
                const itemLogs = hasItemLog ? existingItemLogs : [...existingItemLogs, ts];
                const newItemLastWorn = Math.max(...itemLogs, item.lastWornAt || 0);
                await updateItem({ ...item, wearLogs: itemLogs, lastWornAt: newItemLastWorn, status: 'dirty' });
              }
            }
            if (onSaveSuccess) onSaveSuccess(`✓ Logged wear for ${outfit.name}`);
          }
        } else {
          for (const id of selectedItemIds) {
            const item = items.find(i => i.id === id);
            if (item) {
              const existingItemLogs = item.wearLogs || (item.lastWornAt ? [item.lastWornAt] : []);
              const hasItemLog = existingItemLogs.some(logTs => timestampToDateKey(logTs) === targetDateKey);
              const itemLogs = hasItemLog ? existingItemLogs : [...existingItemLogs, ts];
              const newItemLastWorn = Math.max(...itemLogs, item.lastWornAt || 0);
              await updateItem({ ...item, wearLogs: itemLogs, lastWornAt: newItemLastWorn, status: 'dirty' });
            }
          }
          if (onSaveSuccess) onSaveSuccess(`✓ Logged wear for ${selectedItemIds.length} item(s)`);
        }
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 120 }}>
      <div className="modal-sheet animate-scale" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={20} color="var(--accent)" />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Log Wear Entry</h3>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 'var(--space-4)', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Select Wear Date
            </label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className={`btn ${dateKey === todayKey ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => setDateKey(todayKey)}
              >
                Today
              </button>
              <button
                className={`btn ${dateKey === yesterdayKey ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => setDateKey(yesterdayKey)}
              >
                Yesterday
              </button>
              <input
                type="date"
                value={dateKey}
                onChange={e => setDateKey(e.target.value)}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          <div className="log-segmented-tabs">
            <button
              className={`log-seg-btn ${mode === 'outfit' ? 'active' : ''}`}
              onClick={() => setMode('outfit')}
            >
              <Sparkles size={14} /> Outfit
            </button>
            <button
              className={`log-seg-btn ${mode === 'items' ? 'active' : ''}`}
              onClick={() => setMode('items')}
            >
              <Shirt size={14} /> Individual Items
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={mode === 'outfit' ? 'Search outfits...' : 'Search items...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="log-search-input"
            />
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 10 }} />
          </div>

          {mode === 'outfit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
              {filteredOutfits.map(outfit => {
                const isSelected = selectedOutfitId === outfit.id;
                const outfitItems = outfit.itemIds
                  .map(id => items.find(i => i.id === id))
                  .filter(Boolean) as ClothingItem[];

                return (
                  <div
                    key={outfit.id}
                    onClick={() => setSelectedOutfitId(outfit.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      padding: 10,
                      background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface)',
                      border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{outfit.name || 'Untitled Outfit'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{outfitItems.length} item{outfitItems.length !== 1 ? 's' : ''}</div>
                      </div>
                      {isSelected && <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 16 }}>✓</span>}
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {outfitItems.map((item, idx) => (
                        <div
                          key={`${item.id}-${idx}`}
                          title={item.name}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-3)',
                            overflow: 'hidden',
                            flexShrink: 0,
                            border: '1px solid var(--border)',
                          }}
                        >
                          <ResolvedImage
                            src={item.images && item.images.length > 0 ? item.images[0] : undefined}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            fallback={
                              <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', color: 'var(--text-muted)' }}>
                                <CategoryIcon category={item.category} size={18} />
                              </div>
                            }
                          />
                        </div>
                      ))}
                      {outfitItems.length === 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No items in this outfit</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredOutfits.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  No outfits found
                </div>
              )}
            </div>
          )}

          {mode === 'items' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
              {filteredItems.map(item => {
                const isSelected = selectedItemIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleItem(item.id)}
                    style={{
                      width: 76,
                      padding: 6,
                      background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface)',
                      border: `1.5px solid ${isSelected ? '#10b981' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden', marginBottom: 4 }}>
                      <ResolvedImage
                        src={item.images && item.images[0]}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        fallback={<CategoryIcon category={item.category} size={22} />}
                      />
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  </div>
                );
              })}
              {filteredItems.length === 0 && (
                <div style={{ textAlign: 'center', width: '100%', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  No items found
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary btn-full"
            disabled={isSubmitting || (mode === 'outfit' ? !selectedOutfitId : selectedItemIds.length === 0)}
            onClick={handleSave}
          >
            {isSubmitting ? 'Saving...' : 'Save Wear Log'}
          </button>
        </div>
      </div>
    </div>
  );
}
