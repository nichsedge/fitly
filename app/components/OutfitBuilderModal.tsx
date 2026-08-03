'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useOutfits } from '../contexts/OutfitContext';
import { ClothingItem, CATEGORIES, Category, Outfit } from '../lib/types';
import ItemCard from './ItemCard';
import Toast from './Toast';
import { CategoryIcon } from './AppIcon';
import { ResolvedImage } from './ResolvedImage';

interface Props {
  initialOutfit?: Outfit | null;
  onClose: () => void;
}

export default function OutfitBuilderModal({ initialOutfit, onClose }: Props) {
  const { items } = useWardrobe();
  const { addOutfit, updateOutfit } = useOutfits();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialOutfit ? initialOutfit.itemIds : []);
  const [name, setName] = useState(initialOutfit ? initialOutfit.name : '');
  const [note, setNote] = useState(initialOutfit ? initialOutfit.note : '');
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const toggleItem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredItems = items.filter(i => {
    const isCatMatch = filterCat === 'all' || i.category === filterCat;
    const isReady = i.status === 'ready';
    const isAlreadySelected = selectedIds.includes(i.id);
    return isCatMatch && (isReady || isAlreadySelected);
  });

  const selectedItems = selectedIds
    .map(id => items.find(i => i.id === id))
    .filter(Boolean) as ClothingItem[];

  const handleSave = async () => {
    if (selectedIds.length < 2) return;
    setSaving(true);
    
    if (initialOutfit) {
      await updateOutfit({
        ...initialOutfit,
        name: name.trim() || `Outfit ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        note: note.trim(),
        itemIds: selectedIds,
      });
      setToast('✓ Outfit updated!');
    } else {
      await addOutfit({
        id: uuidv4(),
        name: name.trim() || `Outfit ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        note: note.trim(),
        itemIds: selectedIds,
        createdAt: Date.now(),
      });
      setToast('✓ Outfit saved!');
    }
    
    setTimeout(onClose, 800);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-sheet"
          style={{ maxHeight: '92dvh' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <span className="modal-title">{initialOutfit ? 'Edit Outfit' : 'Build Outfit'}</span>
            <button id="builder-close" className="modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="modal-body">
            {/* Selected preview with Layered Outfit Canvas */}
            {selectedItems.length > 0 && (
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <div className="build-section__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Visual Canvas ({selectedItems.length})</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Layered Preview</span>
                </div>

                {/* Layered Canvas Box */}
                <div
                  style={{
                    background: 'var(--bg-3)',
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  {/* Outerwear Layer */}
                  {selectedItems.filter((i) => i.category === 'outerwear').length > 0 && (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                      {selectedItems
                        .filter((i) => i.category === 'outerwear')
                        .map((item) => (
                          <div key={item.id} style={{ position: 'relative', textAlign: 'center' }}>
                            <ResolvedImage
                              src={item.images && item.images[0]}
                              alt={item.name}
                              style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '2px solid #8b5cf6' }}
                              fallback={
                                <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontSize: 24 }}>
                                  🧥
                                </div>
                              }
                            />
                            <span style={{ fontSize: 10, display: 'block', fontWeight: 600, marginTop: 2, color: 'var(--text-secondary)' }}>{item.name}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Top Layer */}
                  {selectedItems.filter((i) => i.category === 'top').length > 0 && (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                      {selectedItems
                        .filter((i) => i.category === 'top')
                        .map((item) => (
                          <div key={item.id} style={{ position: 'relative', textAlign: 'center' }}>
                            <ResolvedImage
                              src={item.images && item.images[0]}
                              alt={item.name}
                              style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--accent)' }}
                              fallback={
                                <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontSize: 24 }}>
                                  👕
                                </div>
                              }
                            />
                            <span style={{ fontSize: 10, display: 'block', fontWeight: 600, marginTop: 2, color: 'var(--text-secondary)' }}>{item.name}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Bottom Layer */}
                  {selectedItems.filter((i) => i.category === 'bottom' || i.category === 'underwear').length > 0 && (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                      {selectedItems
                        .filter((i) => i.category === 'bottom' || i.category === 'underwear')
                        .map((item) => (
                          <div key={item.id} style={{ position: 'relative', textAlign: 'center' }}>
                            <ResolvedImage
                              src={item.images && item.images[0]}
                              alt={item.name}
                              style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '2px solid #3b82f6' }}
                              fallback={
                                <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontSize: 24 }}>
                                  👖
                                </div>
                              }
                            />
                            <span style={{ fontSize: 10, display: 'block', fontWeight: 600, marginTop: 2, color: 'var(--text-secondary)' }}>{item.name}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Shoes & Accessories */}
                  {selectedItems.filter((i) => i.category === 'shoes' || i.category === 'accessory' || i.category === 'bag').length > 0 && (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                      {selectedItems
                        .filter((i) => i.category === 'shoes' || i.category === 'accessory' || i.category === 'bag')
                        .map((item) => (
                          <div key={item.id} style={{ position: 'relative', textAlign: 'center' }}>
                            <ResolvedImage
                              src={item.images && item.images[0]}
                              alt={item.name}
                              style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, border: '2px solid #10b981' }}
                              fallback={
                                <div style={{ width: 52, height: 52, borderRadius: 8, background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontSize: 20 }}>
                                  👟
                                </div>
                              }
                            />
                            <span style={{ fontSize: 10, display: 'block', fontWeight: 600, marginTop: 2, color: 'var(--text-secondary)' }}>{item.name}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Category filter */}
            <div className="filter-bar" style={{ marginBottom: 'var(--space-4)' }}>
              <button
                id="builder-filter-all"
                className={`filter-chip ${filterCat === 'all' ? 'active' : ''}`}
                onClick={() => setFilterCat('all')}
              >
                All
              </button>
              {CATEGORIES.map(cat => (
                <button
                  id={`builder-filter-${cat.value}`}
                  key={cat.value}
                  className={`filter-chip ${filterCat === cat.value ? 'active' : ''}`}
                  onClick={() => setFilterCat(cat.value)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <CategoryIcon category={cat.value} size={14} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Item grid */}
            <div className="item-grid" style={{ marginBottom: 'var(--space-5)' }}>
              {filteredItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  selected={selectedIds.includes(item.id)}
                  selectable
                  onSelect={() => toggleItem(item.id)}
                />
              ))}
            </div>

            {/* Outfit details */}
            <div className="divider" />

            <div className="form-group">
              <label className="form-label" htmlFor="outfit-name">Outfit Name</label>
              <input
                id="outfit-name"
                className="form-input"
                type="text"
                placeholder="e.g. Date Night, Office Monday…"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="outfit-note">Notes <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
              <textarea
                id="outfit-note"
                className="form-input form-textarea"
                placeholder="Occasion, weather, mood…"
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={200}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button id="builder-cancel" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                id="btn-save-outfit"
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={handleSave}
                disabled={selectedIds.length < 2 || saving}
              >
                {saving ? 'Saving…' : `Save Outfit (${selectedIds.length})`}
              </button>
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}
