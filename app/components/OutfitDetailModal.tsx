'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ClothingItem, Outfit, CATEGORIES } from '../lib/types';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useOutfits } from '../contexts/OutfitContext';
import { useSettings } from '../contexts/SettingsContext';
import Toast from './Toast';
import { Sparkles, Edit, Trash2, Tag, CategoryIcon, Copy } from './AppIcon';
import { ResolvedImage } from './ResolvedImage';

interface Props {
  outfit: Outfit;
  items: ClothingItem[];
  onClose: () => void;
  onEdit: () => void;
  logDateKey?: string;
  onRemoveLogFromDate?: (dateKey: string) => Promise<void>;
}

export default function OutfitDetailModal({ outfit, items, onClose, onEdit, logDateKey, onRemoveLogFromDate }: Props) {
  const { updateItem } = useWardrobe();
  const { deleteOutfit, updateOutfit, addOutfit } = useOutfits();
  const { formatPrice } = useSettings();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(outfit.name);

  const handleSaveName = async () => {
    if (editedName.trim() === outfit.name) {
      setIsEditingName(false);
      return;
    }
    await updateOutfit({
      ...outfit,
      name: editedName.trim() || 'Untitled Outfit'
    });
    setIsEditingName(false);
    setToast('✓ Name updated');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
    if (e.key === 'Escape') {
      setEditedName(outfit.name);
      setIsEditingName(false);
    }
  };

  const outfitItems = outfit.itemIds
    .map(id => items.find(i => i.id === id))
    .filter(Boolean) as ClothingItem[];

  const handleDuplicate = async () => {
    const newOutfit: Outfit = {
      id: uuidv4(),
      name: outfit.name,
      note: outfit.note,
      itemIds: [...outfit.itemIds],
      createdAt: Date.now(),
    };
    await addOutfit(newOutfit);
    setToast('✓ Outfit duplicated');
    setTimeout(onClose, 500);
  };

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return; }
    await deleteOutfit(outfit.id);
    setToast('Outfit deleted');
    setTimeout(onClose, 500);
  };

  const handleWear = async () => {
    const now = Date.now();
    const updatedLogs = [...(outfit.wearLogs || [])];
    updatedLogs.push(now);

    await updateOutfit({ 
      ...outfit, 
      lastWornAt: now,
      wearLogs: updatedLogs
    });

    // Also update all items inside this outfit
    for (const itemId of outfit.itemIds) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        const itemLogs = [...(item.wearLogs || [])];
        if (!item.wearLogs && item.lastWornAt) {
          itemLogs.push(item.lastWornAt);
        }
        itemLogs.push(now);
        await updateItem({
          ...item,
          lastWornAt: now,
          wearLogs: itemLogs
        });
      }
    }

    setToast('✓ Wearing this outfit today!');
    setTimeout(onClose, 1200);
  };


  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet animate-scale" onClick={e => e.stopPropagation()}>
          <div className="modal-header" style={{ paddingBottom: isEditingName ? 8 : undefined }}>
            {isEditingName ? (
              <input
                autoFocus
                className="form-input"
                style={{ fontSize: 16, fontWeight: 700, padding: '4px 12px', height: 36, margin: 0 }}
                value={editedName}
                onChange={e => setEditedName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleKeyDown}
              />
            ) : (
              <div 
                className="modal-title" 
                onClick={() => setIsEditingName(true)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {outfit.name || 'Untitled Outfit'}
              </div>
            )}
            <button id="outfit-detail-close" className="modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="modal-body">
            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <button id="btn-wear-outfit" className="btn btn-primary btn-full" onClick={handleWear} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Sparkles size={16} />
                <span>Wearing this today</span>
              </button>
              <button id="btn-duplicate-outfit" className="btn btn-ghost btn-full" onClick={handleDuplicate} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Copy size={16} />
                <span>Duplicate outfit</span>
              </button>
              <button id="btn-edit-outfit" className="btn btn-ghost btn-full" onClick={onEdit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Edit size={16} />
                <span>Edit outfit</span>
              </button>
              {logDateKey && onRemoveLogFromDate ? (
                <button
                  id="btn-remove-log"
                  className="btn btn-danger btn-full"
                  onClick={async () => {
                    await onRemoveLogFromDate(logDateKey);
                    onClose();
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Trash2 size={16} />
                  <span>Remove log for this day</span>
                </button>
              ) : (
                <button
                  id="btn-delete-outfit"
                  className="btn btn-danger btn-full"
                  onClick={handleDelete}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Trash2 size={16} />
                  <span>{confirming ? 'Tap again to confirm delete outfit' : 'Delete outfit'}</span>
                </button>
              )}
            </div>

            {/* Image grid */}
            {outfitItems.length > 0 && (
              <div
                className="outfit-detail__grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: outfitItems.length === 1 ? '1fr' : outfitItems.length === 2 ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
                  gap: 'var(--space-2)'
                }}
              >
                {outfitItems.slice(0, 4).map((item, idx) => {
                  const isSpanTwo = outfitItems.length === 3 && idx === 2;
                  return (
                    <ResolvedImage
                      key={`detail-${item.id}-${idx}`}
                      src={item.images && item.images[0]}
                      alt={item.name}
                      className="outfit-detail__img"
                      style={{
                        width: '100%', aspectRatio: '1', objectFit: 'cover',
                        borderRadius: 'var(--radius-md)', minWidth: 0, minHeight: 0,
                        gridColumn: isSpanTwo ? 'span 2' : undefined
                      }}
                      fallback={
                        <div className="outfit-detail__img" style={{
                          display: 'grid', placeItems: 'center', background: 'var(--bg-3)',
                          aspectRatio: '1', borderRadius: 'var(--radius-md)', minWidth: 0, minHeight: 0,
                          gridColumn: isSpanTwo ? 'span 2' : undefined
                        }}>
                          <CategoryIcon category={item.category} size={28} />
                        </div>
                      }
                    />
                  );
                })}
              </div>
            )}

            {/* Note */}
            {outfit.note && (
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
                {outfit.note}
              </p>
            )}

            {/* Items list */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 'var(--space-3)' }}>
                {outfitItems.length} Item{outfitItems.length !== 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {outfitItems.map(item => {
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: 'var(--space-3)', background: 'var(--bg-2)',
                      borderRadius: 'var(--radius-md)', border: '1px solid var(--border)'
                    }}>
                      <ResolvedImage
                        src={item.images && item.images[0]}
                        alt={item.name}
                        style={{
                          width: 44, height: 44, objectFit: 'cover', borderRadius: 8, flexShrink: 0
                        }}
                        fallback={
                          <div style={{
                            width: 44, height: 44, background: 'var(--bg-3)', borderRadius: 8,
                            display: 'grid', placeItems: 'center', flexShrink: 0
                          }}>
                            <CategoryIcon category={item.category} size={20} />
                          </div>
                        }
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                          {item.price !== undefined && item.price > 0 && (
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', background: 'var(--bg-3)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                              {formatPrice(item.price)}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color }} />
                          <span>{CATEGORIES.find(c => c.value === item.category)?.label}</span>
                          {item.brand && (
                            <span style={{ color: 'var(--accent)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span>•</span>
                              <Tag size={12} />
                              <span>{item.brand}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dates */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Created</span>
              <span style={{ fontSize: 13 }}>
                {new Date(outfit.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}
