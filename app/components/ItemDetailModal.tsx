'use client';

import { useRef, useState } from 'react';
import { ClothingItem, CATEGORIES, COLORS } from '../lib/types';
import { useApp } from './AppProvider';
import Toast from './Toast';
import DailyOutfitBuilder from './DailyOutfitBuilder';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  item: ClothingItem;
  onClose: () => void;
}

export default function ItemDetailModal({ item, onClose }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [nameInput, setNameInput] = useState(item.name);
  const [editingMaterial, setEditingMaterial] = useState(false);
  const [materialInput, setMaterialInput] = useState(item.material || '');
  const [editingCare, setEditingCare] = useState(false);
  const [careInput, setCareInput] = useState(item.careInstructions || '');
  const [newTagText, setNewTagText] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const { deleteItem, updateItem, tags: dynamicTags, addTag, formatPrice, t } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const category = CATEGORIES.find(c => c.value === item.category);
  const colorInfo = COLORS.find(c => c.value === item.color);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (item.images && item.images.length >= 5) {
      setToast('Maximum 5 photos allowed.');
      return;
    }
    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const newImageData = ev.target?.result as string;
      const updatedImages = [...(item.images || []), newImageData];
      await updateItem({ ...item, images: updatedImages });
      setToast('✓ Photo added!');
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
    // reset so the same file can be picked again
    e.target.value = '';
  };

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return; }
    await deleteItem(item.id);
    setToast('Item deleted');
    setTimeout(onClose, 500);
  };

  const handleDeleteImage = async (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedImages = (item.images || []).filter((_, i) => i !== idx);
    await updateItem({ ...item, images: updatedImages });
    setToast('✓ Photo removed');
  };

  const handleWear = () => {
    setShowBuilder(true);
  };
  
  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      setNameInput(item.name);
      setEditingName(false);
      return;
    }
    await updateItem({ ...item, name: nameInput.trim() });
    setEditingName(false);
    setToast('✓ Item renamed');
  };

  const handleToggleTag = async (label: string) => {
    const isActive = item.tags.includes(label);
    const updatedTags = isActive 
      ? item.tags.filter(t => t !== label) 
      : [...item.tags, label];
    
    await updateItem({ ...item, tags: updatedTags });
    setToast(isActive ? `− Tag removed: ${label}` : `+ Tag added: ${label}`);
  };

  const handleCreateTag = async () => {
    const trimmed = newTagText.trim();
    if (!trimmed) {
      setIsAddingTag(false);
      return;
    }
    const existing = dynamicTags.find(t => t.label.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!item.tags.includes(existing.label)) {
        await updateItem({ ...item, tags: [...item.tags, existing.label] });
        setToast(`+ Tag added: ${existing.label}`);
      }
      setNewTagText('');
      setIsAddingTag(false);
      return;
    }
    const newTag = { id: uuidv4(), label: trimmed };
    await addTag(newTag);
    await updateItem({ ...item, tags: [...item.tags, trimmed] });
    setNewTagText('');
    setIsAddingTag(false);
    setToast(`✓ Tag "${trimmed}" created and added`);
  };

  const handleSaveMaterial = async () => {
    await updateItem({ ...item, material: materialInput.trim() || undefined });
    setEditingMaterial(false);
    setToast('✓ Material updated');
  };

  const handleSaveCare = async () => {
    await updateItem({ ...item, careInstructions: careInput.trim() || undefined });
    setEditingCare(false);
    setToast('✓ Care instructions updated');
  };

  const cycleCondition = async () => {
    const conditions: Array<'new' | 'excellent' | 'good' | 'fair' | 'poor' | 'needs-repair'> = ['new', 'excellent', 'good', 'fair', 'poor', 'needs-repair'];
    const currentIdx = conditions.indexOf(item.condition as any || 'good');
    const nextIdx = (currentIdx + 1) % conditions.length;
    const nextCondition = conditions[nextIdx];
    if (nextCondition) {
      await updateItem({ ...item, condition: nextCondition as any });
      setToast(`Condition: ${nextCondition.toUpperCase().replace('-', ' ')}`);
    }
  };

  if (showBuilder) {
    return <DailyOutfitBuilder startingItem={item} onClose={onClose} />;
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet animate-scale" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            {editingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <input
                  ref={nameInputRef}
                  type="text"
                  className="form-input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') {
                      setNameInput(item.name);
                      setEditingName(false);
                    }
                  }}
                  autoFocus
                  style={{ height: 32, padding: '4px 8px', fontSize: 16 }}
                />
              </div>
            ) : (
              <span 
                className="modal-title" 
                onClick={() => setEditingName(true)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                title="Edit name"
              >
                {item.name}
                <span style={{ fontSize: 12, opacity: 0.5 }}>✏️</span>
              </span>
            )}
            <button id="modal-close" className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">

            {/* Image Carousel */}
            <div style={{ position: 'relative', marginBottom: 'var(--space-4)' }}>
              {item.images && item.images.length > 0 ? (
                <div 
                  className="carousel-container" 
                  style={{ 
                    display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', 
                    gap: 'var(--space-3)', paddingBottom: 'var(--space-2)' 
                  }}
                >
                  {item.images.map((img, idx) => (
                    <div 
                      key={idx} 
                      className="item-detail__image-wrapper"
                      style={{ flexShrink: 0, width: '100%', scrollSnapAlign: 'start', margin: 0, position: 'relative' }}
                      onClick={(e) => {
                        const imgEl = e.currentTarget.querySelector('img');
                        if (!imgEl) return;
        
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
        
                        const rect = imgEl.getBoundingClientRect();
                        const x = ((e.clientX - rect.left) / rect.width) * imgEl.naturalWidth;
                        const y = ((e.clientY - rect.top) / rect.height) * imgEl.naturalHeight;
        
                        canvas.width = imgEl.naturalWidth;
                        canvas.height = imgEl.naturalHeight;
                        ctx.drawImage(imgEl, 0, 0);
        
                        const pixel = ctx.getImageData(x, y, 1, 1).data;
                        const hex = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
                        updateItem({ ...item, color: hex });
                        setToast(`✓ Color updated to ${hex}`);
                      }}
                      role="button"
                    >
                      <img
                        src={img}
                        alt={`${item.name} ${idx + 1}`}
                        className="item-detail__image"
                        style={{ margin: 0 }}
                      />
                      <button
                        className="item-detail__delete-photo"
                        onClick={(e) => handleDeleteImage(idx, e)}
                        title="Delete photo"
                      >
                        ✕
                      </button>
                      {item.images && item.images.length > 1 && (
                        <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}>
                          {idx + 1} / {item.images.length}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  id="item-photo-area"
                  className="item-detail__image-wrapper"
                  onClick={() => fileRef.current?.click()}
                  role="button"
                >
                  <div className="item-detail__image" style={{ display: 'grid', placeItems: 'center', fontSize: 72, margin: 0 }}>
                    {category?.emoji}
                  </div>
                  <div className="item-photo-overlay" style={{ opacity: 1 }}>
                    {uploadingPhoto ? (
                      <div className="loading-spinner" style={{ width: 28, height: 28, borderWidth: 2 }} />
                    ) : (
                      <>
                        <span style={{ fontSize: 26 }}>📷</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>Add photo</span>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {uploadingPhoto && item.images && item.images.length > 0 && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-lg)' }}>
                  <div className="loading-spinner" style={{ width: 28, height: 28, borderWidth: 2 }} />
                </div>
              )}
            </div>

            {item.images && item.images.length > 0 && (
              <p style={{ fontSize: 11, color: 'var(--accent)', marginTop: -8, marginBottom: 16, fontWeight: 600, textAlign: 'center' }}>
                🎯 Tap on any image to pick a color • Swipe to see more
              </p>
            )}

            {/* Hidden file input */}
            <input
              ref={fileRef}
              id="update-photo-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />

            {/* Info rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Category</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  {category?.emoji} {category?.label}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Brand</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{item.brand || '—'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Color</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div 
                    id="update-color-swatch"
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      backgroundColor: item.color, border: '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onClick={() => document.getElementById('update-color-input')?.click()}
                    title="Change color"
                  >
                    <input
                      id="update-color-input"
                      type="color"
                      value={item.color}
                      onChange={async (e) => {
                        const newColor = e.target.value;
                        await updateItem({ ...item, color: newColor });
                        setToast('✓ Color updated!');
                      }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        opacity: 0,
                        width: '100%',
                        height: '100%',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{colorInfo?.label || item.color}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Status</span>
                <button 
                  className={`status-badge ${item.status}`}
                  onClick={async () => {
                    const nextStatus = item.status === 'ready' ? 'dirty' : (item.status === 'dirty' ? 'cleaning' : 'ready');
                    await updateItem({ ...item, status: nextStatus });
                    setToast(`Status: ${nextStatus.toUpperCase()}`);
                  }}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    border: 'none',
                    background: item.status === 'ready' ? 'rgba(34, 197, 94, 0.2)' : (item.status === 'dirty' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'),
                    color: item.status === 'ready' ? '#22c55e' : (item.status === 'dirty' ? '#ef4444' : '#3b82f6')
                  }}
                >
                  {item.status}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Condition</span>
                <button 
                  onClick={cycleCondition}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    border: '1px solid currentColor',
                    background: 'none',
                    color: (item.condition === 'new' || item.condition === 'excellent') ? '#22c55e' : 
                           (item.condition === 'poor' || item.condition === 'needs-repair') ? '#ef4444' : 'var(--text-secondary)'
                  }}
                >
                  {item.condition?.replace('-', ' ') || 'good'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Material</span>
                {editingMaterial ? (
                  <input
                    type="text"
                    className="form-input"
                    value={materialInput}
                    onChange={(e) => setMaterialInput(e.target.value)}
                    onBlur={handleSaveMaterial}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveMaterial()}
                    autoFocus
                    style={{ height: 24, padding: '0 4px', fontSize: 13, width: '60%', textAlign: 'right' }}
                  />
                ) : (
                  <span 
                    style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                    onClick={() => setEditingMaterial(true)}
                  >
                    {item.material || 'Set material'}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Care Info</span>
                {editingCare ? (
                  <input
                    type="text"
                    className="form-input"
                    value={careInput}
                    onChange={(e) => setCareInput(e.target.value)}
                    onBlur={handleSaveCare}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveCare()}
                    autoFocus
                    style={{ height: 24, padding: '0 4px', fontSize: 13, width: '60%', textAlign: 'right' }}
                  />
                ) : (
                  <span 
                    style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                    onClick={() => setEditingCare(true)}
                  >
                    {item.careInstructions || 'Set care info'}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-3)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{t('priceLabel')}</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{formatPrice(item.price)}</div>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-3)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{t('costPerWear')}</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>
                    {item.price ? formatPrice(item.price / Math.max(1, item.wearLogs?.length || 0)) : '—'}
                  </div>
                </div>
              </div>

              {item.purchaseDate && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Purchased</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {new Date(item.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Times worn</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  {item.wearLogs ? item.wearLogs.length : (item.lastWornAt ? 1 : 0)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Added</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Tags */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Style Tags</span>
                <button 
                  className="btn btn-ghost" 
                  style={{ padding: '2px 8px', fontSize: 12, height: 'auto', minHeight: 'auto' }}
                  onClick={() => setEditingTags(!editingTags)}
                >
                  {editingTags ? 'Close' : (item.tags.length > 0 ? 'Edit' : '+ Add')}
                </button>
              </div>
              
              {editingTags ? (
                <div className="pill-group" style={{ marginBottom: 'var(--space-2)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {dynamicTags.map(tag => (
                    <button
                      key={tag.id}
                      className={`pill ${item.tags.includes(tag.label) ? 'active' : ''}`}
                      onClick={() => handleToggleTag(tag.label)}
                      style={{ fontSize: 12, padding: '4px 10px' }}
                    >
                      {tag.label}
                    </button>
                  ))}
                  {isAddingTag ? (
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: 120, height: 28, padding: '2px 8px', fontSize: 12, borderRadius: 'var(--radius-pill)', display: 'inline-block', margin: 0 }}
                      placeholder="Tag name..."
                      value={newTagText}
                      onChange={e => setNewTagText(e.target.value)}
                      onBlur={handleCreateTag}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCreateTag();
                        if (e.key === 'Escape') {
                          setNewTagText('');
                          setIsAddingTag(false);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className="pill"
                      style={{ borderStyle: 'dashed', borderColor: 'var(--accent)', color: 'var(--accent)', background: 'none', fontSize: 12, padding: '4px 10px' }}
                      onClick={() => setIsAddingTag(true)}
                    >
                      ＋ New Tag
                    </button>
                  )}
                </div>
              ) : (
                item.tags.length > 0 ? (
                  <div className="item-detail__tags">
                    {item.tags.map(tag => (
                      <span key={tag} className="tag-badge">{tag}</span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0' }}>
                    No tags added yet.
                  </p>
                )
              )}
            </div>

            <div className="divider" />

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <button
                id="btn-update-photo"
                className="btn btn-ghost btn-full"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingPhoto || (item.images && item.images.length >= 5)}
              >
                📷 {item.images && item.images.length >= 5 ? 'Max photos reached' : 'Add another photo'}
              </button>
              <button 
                className="btn btn-ghost btn-full" 
                onClick={() => setToast('✨ AI Background removal coming soon!')}
              >
                🪄 Remove Background (AI)
              </button>
              <button id="btn-wear-today" className="btn btn-ghost btn-full" onClick={handleWear}>
                👕 Wearing this today
              </button>
              <button
                id="btn-delete-item"
                className="btn btn-danger btn-full"
                onClick={handleDelete}
              >
                {confirming ? '⚠️ Tap again to confirm delete' : '🗑 Delete item'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}
