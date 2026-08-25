'use client';

import { useRef, useState, useEffect } from 'react';
import { ClothingItem, CATEGORIES, COLORS, ItemStatus, ItemCondition, SparkJoyStatus } from '../lib/types';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useSettings } from '../contexts/SettingsContext';
import Toast from './Toast';
import DailyOutfitBuilder from './DailyOutfitBuilder';
import { v4 as uuidv4 } from 'uuid';
import { ImageService } from '../services/ImageService';
import { CategoryIcon, Camera, Wand2, Shirt, Trash2, Edit, CheckCircle2, X } from './AppIcon';
import ItemPhotoCarousel from './itemDetail/ItemPhotoCarousel';
import { SparkJoyPills, SparkJoyCompactButtons } from './itemDetail/SparkJoySelector';
import { useItemForm, isValidForm } from './itemDetail/useItemForm';

interface Props {
  item: ClothingItem;
  onClose: () => void;
  logDateKey?: string;
  onRemoveLogFromDate?: (dateKey: string) => Promise<void>;
  onDeleted?: (deletedItem: ClothingItem) => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  IDR: 'Rp',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

const CONDITION_CYCLE: ItemCondition[] = ['new', 'excellent', 'good', 'fair', 'poor', 'needs-repair'];

export default function ItemDetailModal({ item, onClose, logDateKey, onRemoveLogFromDate, onDeleted }: Props) {
  const { deleteItem, updateItem, tags: dynamicTags, locations, addTag } = useWardrobe();
  const { formatPrice, t, currency } = useSettings();

  const form = useItemForm(item);
  const { fields, setField } = form;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  // Tag creation state
  const [newTagText, setNewTagText] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = () => {
    form.reset();
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    form.reset();
    setIsEditing(false);
  };

  const handleSaveAll = async () => {
    if (!isValidForm(fields)) {
      setToast('Name cannot be empty');
      return;
    }

    await updateItem(form.buildUpdatedItem());
    setIsEditing(false);
    setToast('✓ Item details updated!');
  };

  const handleColorPick = async (hex: string) => {
    await updateItem({ ...item, color: hex });
    setField('color', hex);
    setToast(`✓ Color updated to ${hex}`);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (item.images && item.images.length >= 5) {
      setToast('Maximum 5 photos allowed.');
      return;
    }
    setUploadingPhoto(true);
    try {
      // Compress once and store the binary blob in the dedicated images store,
      // keeping only a lightweight reference on the item record.
      const blob = await ImageService.compressImage(file);
      const imageRef = await ImageService.saveImageBlob(blob);
      const updatedImages = [...(item.images || []), imageRef];
      await updateItem({ ...item, images: updatedImages });
      setToast('✓ Photo compressed & added!');
    } catch {
      setToast('Could not process photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return; }
    const deletedItem = item;
    await deleteItem(item.id);
    onDeleted?.(deletedItem);
    onClose();
  };

  const handleDeleteImage = async (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const removed = (item.images || [])[idx];
    const updatedImages = (item.images || []).filter((_, i) => i !== idx);
    await updateItem({ ...item, images: updatedImages });
    // Clean up the stored blob for reference-based images to avoid orphans.
    if (typeof removed === 'string') {
      await ImageService.deleteImageRef(removed);
    }
    setToast('✓ Photo removed');
  };

  const toggleTagInForm = (tagLabel: string) => {
    setField('tags', fields.tags.includes(tagLabel)
      ? fields.tags.filter(t => t !== tagLabel)
      : [...fields.tags, tagLabel]);
  };

  const handleCreateTag = async () => {
    const trimmed = newTagText.trim();
    if (!trimmed) {
      setIsAddingTag(false);
      return;
    }
    const existing = dynamicTags.find(t => t.label.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!fields.tags.includes(existing.label)) {
        const next = [...fields.tags, existing.label];
        setField('tags', next);
        if (!isEditing) {
          await updateItem({ ...item, tags: next });
        }
      }
      setNewTagText('');
      setIsAddingTag(false);
      return;
    }
    const newTag = { id: uuidv4(), label: trimmed };
    await addTag(newTag);
    const nextTags = [...fields.tags, trimmed];
    setField('tags', nextTags);
    if (!isEditing) {
      await updateItem({ ...item, tags: nextTags });
    }
    setNewTagText('');
    setIsAddingTag(false);
    setToast(`✓ Tag "${trimmed}" created and added`);
  };

  /** Persist spark joy immediately in view mode; defer to save in edit mode. */
  const handleSparkJoySelect = async (next: SparkJoyStatus | undefined) => {
    setField('sparkJoy', next);
    if (!isEditing) {
      await updateItem({ ...item, sparkJoy: next });
      const messages: Partial<Record<SparkJoyStatus, string>> = {
        'joy': '💖 Marked as Sparks Joy!',
        'essential': '🧺 Marked as Daily Essential',
        'no-joy': '🍂 Ready to Let Go',
      };
      setToast(next ? messages[next]! : 'Spark Joy cleared');
    }
  };

  const categoryInfo = CATEGORIES.find(c => c.value === (isEditing ? fields.category : item.category));
  const colorInfo = COLORS.find(c => c.value === (isEditing ? fields.color : item.color));
  const currentLocation = locations.find(l => l.id === (isEditing ? fields.locationId : (item.locationId || 'loc-home')));
  const currencySymbol = CURRENCY_SYMBOLS[currency] || '£';

  if (showBuilder) {
    return <DailyOutfitBuilder startingItem={item} onClose={onClose} />;
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet animate-scale" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8 }}>
                <span className="modal-title" style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Edit size={18} />
                  <span>Edit Item Details</span>
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12, height: 32 }} onClick={handleCancelEdit}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 12, height: 32, display: 'flex', alignItems: 'center', gap: 4 }} onClick={handleSaveAll}>
                    <CheckCircle2 size={14} />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span className="modal-title" style={{ fontSize: 18, fontWeight: 700 }}>
                  {item.name}
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    id="btn-edit-mode"
                    className="btn btn-ghost"
                    style={{ padding: '4px 10px', fontSize: 13, height: 32, gap: 4, display: 'flex', alignItems: 'center' }}
                    onClick={handleStartEdit}
                    title="Edit Item Details"
                  >
                    <Edit size={14} />
                    <span>Edit</span>
                  </button>
                  <button id="modal-close" className="modal-close" onClick={onClose}>
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="modal-body">

            {/* Photos & Carousel */}
            <ItemPhotoCarousel
              item={item}
              isEditing={isEditing}
              uploadingPhoto={uploadingPhoto}
              onColorPick={(hex) => { void handleColorPick(hex); }}
              onDeleteImage={handleDeleteImage}
              onAddPhotoClick={() => fileRef.current?.click()}
            />

            {item.images && item.images.length > 0 && !isEditing && (
              <p style={{ fontSize: 11, color: 'var(--accent)', marginTop: -8, marginBottom: 16, fontWeight: 600, textAlign: 'center' }}>
                Tap on any image to pick a color • Swipe to see more
              </p>
            )}

            {/* Hidden file input */}
            <input
              ref={fileRef}
              id="update-photo-input"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />

            {/* ================= EDIT MODE FORM ================= */}
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>

                {/* Name & Brand */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="form-label">Item Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={fields.name}
                      onChange={e => setField('name', e.target.value)}
                      placeholder="e.g. Oxford Cotton Shirt"
                    />
                  </div>
                  <div>
                    <label className="form-label">Brand</label>
                    <input
                      type="text"
                      className="form-input"
                      value={fields.brand}
                      onChange={e => setField('brand', e.target.value)}
                      placeholder="Uniqlo, Zara, etc."
                    />
                  </div>
                </div>

                {/* Location Selection */}
                <div>
                  <label className="form-label">Wardrobe Location</label>
                  <select
                    className="form-input"
                    value={fields.locationId}
                    onChange={e => setField('locationId', e.target.value)}
                  >
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.icon || '📍'} {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price & Purchase Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="form-label">Price ({currencySymbol})</label>
                    <input
                      type="number"
                      step={currency === 'IDR' ? '1000' : '0.01'}
                      className="form-input"
                      value={fields.price}
                      onChange={e => setField('price', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="form-label">Purchase Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={fields.purchaseDate}
                      onChange={e => setField('purchaseDate', e.target.value)}
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div>
                  <label className="form-label">Category</label>
                  <div className="pill-group" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        className={`pill ${fields.category === cat.value ? 'active' : ''}`}
                        onClick={() => setField('category', cat.value)}
                      >
                        <CategoryIcon category={cat.value} size={14} />
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status & Condition */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="form-label">Status</label>
                    <select
                      className="form-input"
                      value={fields.status}
                      onChange={e => setField('status', e.target.value as ItemStatus)}
                    >
                      <option value="ready">Ready / Clean</option>
                      <option value="dirty">Dirty / Needs Wash</option>
                      <option value="cleaning">In Wash / Laundry</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Condition</label>
                    <select
                      className="form-input"
                      value={fields.condition}
                      onChange={e => setField('condition', e.target.value as ItemCondition)}
                    >
                      <option value="new">New</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="needs-repair">Needs Repair</option>
                      <option value="retired">Retired</option>
                    </select>
                  </div>
                </div>

                {/* Material & Care Instructions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="form-label">Material</label>
                    <input
                      type="text"
                      className="form-input"
                      value={fields.material}
                      onChange={e => setField('material', e.target.value)}
                      placeholder="e.g. 100% Linen"
                    />
                  </div>
                  <div>
                    <label className="form-label">Care Instructions</label>
                    <input
                      type="text"
                      className="form-input"
                      value={fields.careInstructions}
                      onChange={e => setField('careInstructions', e.target.value)}
                      placeholder="e.g. Cold wash only"
                    />
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <label className="form-label">Color</label>
                  <div className="color-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        className={`color-swatch ${fields.color === c.value ? 'active' : ''}`}
                        style={{ backgroundColor: c.value, width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
                        onClick={() => setField('color', c.value)}
                        title={c.label}
                      />
                    ))}
                    {/* Custom Color Input */}
                    <div style={{ position: 'relative', width: 28, height: 28 }}>
                      <input
                        type="color"
                        value={fields.color}
                        onChange={e => setField('color', e.target.value)}
                        style={{ width: '100%', height: '100%', opacity: 0, cursor: 'pointer', position: 'absolute', inset: 0 }}
                      />
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', backgroundColor: fields.color,
                        border: '2px solid var(--accent)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700
                      }}>
                        🎨
                      </div>
                    </div>
                  </div>
                </div>

                {/* Style Tags in Edit Mode */}
                <div>
                  <label className="form-label">Style Tags</label>
                  <div className="pill-group" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {dynamicTags.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        className={`pill ${fields.tags.includes(tag.label) ? 'active' : ''}`}
                        onClick={() => toggleTagInForm(tag.label)}
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
                        style={{ borderStyle: 'dashed', borderColor: 'var(--accent)', color: 'var(--accent)', background: 'none' }}
                        onClick={() => setIsAddingTag(true)}
                      >
                        ＋ New Tag
                      </button>
                    )}
                  </div>
                </div>

                {/* Spark Joy (KonMari) in Edit Mode */}
                <div>
                  <label className="form-label">Spark Joy (KonMari)</label>
                  <SparkJoyPills value={fields.sparkJoy} onSelect={handleSparkJoySelect} />
                </div>

                <div className="divider" style={{ margin: 'var(--space-2) 0' }} />

                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={handleCancelEdit}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveAll}>
                    ✓ Save Changes
                  </button>
                </div>
              </div>
            ) : (
              /* ================= VIEW MODE ================= */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>

                {/* Location */}
                <ViewRow label="Location" onClick={handleStartEdit} editTitle="Click to edit location">
                  {currentLocation?.icon || '📍'} {currentLocation?.name || 'Home'}
                </ViewRow>

                {/* Category */}
                <ViewRow label="Category" onClick={handleStartEdit} editTitle="Click to edit category">
                  <CategoryIcon category={item.category} size={14} /> {categoryInfo?.label}
                </ViewRow>

                {/* Brand */}
                <ViewRow label="Brand" onClick={handleStartEdit} editTitle="Click to edit brand" muted={!item.brand}>
                  {item.brand || 'Set Brand'}
                </ViewRow>

                {/* Color */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Color</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      id="update-color-swatch"
                      style={{
                        width: 24, height: 24, borderRadius: '50%',
                        backgroundColor: item.color, border: '1px solid rgba(255,255,255,0.2)',
                        cursor: 'pointer', position: 'relative'
                      }}
                      title="Change color"
                    >
                      <input
                        id="update-color-input"
                        type="color"
                        value={item.color}
                        onChange={(e) => { void handleColorPick(e.target.value); }}
                        style={{
                          position: 'absolute', top: 0, left: 0, opacity: 0,
                          width: '100%', height: '100%', cursor: 'pointer'
                        }}
                      />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{colorInfo?.label || item.color}</span>
                  </div>
                </div>

                {/* Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Status</span>
                  <button
                    className={`status-badge ${item.status}`}
                    onClick={async () => {
                      const nextStatus: ItemStatus = item.status === 'ready' ? 'dirty' : (item.status === 'dirty' ? 'cleaning' : 'ready');
                      await updateItem({ ...item, status: nextStatus });
                      setField('status', nextStatus);
                      setToast(`Status: ${nextStatus.toUpperCase()}`);
                    }}
                    style={{
                      padding: '2px 10px', borderRadius: 'var(--radius-pill)', fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', cursor: 'pointer', border: 'none',
                      background: item.status === 'ready' ? 'rgba(34, 197, 94, 0.2)' : (item.status === 'dirty' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'),
                      color: item.status === 'ready' ? '#22c55e' : (item.status === 'dirty' ? '#ef4444' : '#3b82f6')
                    }}
                  >
                    {item.status}
                  </button>
                </div>

                {/* Spark Joy (KonMari) Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Spark Joy</span>
                  <SparkJoyCompactButtons value={item.sparkJoy} onSelect={handleSparkJoySelect} />
                </div>

                {item.gratitudeNote && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(236, 72, 153, 0.1)',
                    border: '1px solid rgba(236, 72, 153, 0.25)',
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    fontStyle: 'italic',
                    margin: '4px 0'
                  }}>
                    🌸 &ldquo;{item.gratitudeNote}&rdquo;
                  </div>
                )}

                {/* Condition */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Condition</span>
                  <button
                    onClick={async () => {
                      const currentIdx = CONDITION_CYCLE.indexOf(item.condition || 'good');
                      const nextCondition = CONDITION_CYCLE[(currentIdx + 1) % CONDITION_CYCLE.length];
                      await updateItem({ ...item, condition: nextCondition });
                      setField('condition', nextCondition);
                      setToast(`Condition: ${nextCondition.toUpperCase().replace('-', ' ')}`);
                    }}
                    style={{
                      padding: '2px 10px', borderRadius: 'var(--radius-pill)', fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', cursor: 'pointer', border: '1px solid currentColor', background: 'none',
                      color: (item.condition === 'new' || item.condition === 'excellent') ? '#22c55e' :
                        (item.condition === 'poor' || item.condition === 'needs-repair') ? '#ef4444' : 'var(--text-secondary)'
                    }}
                  >
                    {item.condition?.replace('-', ' ') || 'good'}
                  </button>
                </div>

                {/* Material */}
                <ViewRow label="Material" onClick={handleStartEdit} editTitle="Click to edit material" muted={!item.material}>
                  {item.material || 'Set Material'}
                </ViewRow>

                {/* Care Info & Symbol Guide */}
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer', padding: '4px 0' }}
                  onClick={handleStartEdit}
                  title="Click to edit care instructions"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Care Info</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: item.careInstructions ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {item.careInstructions || 'Set Care Info'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    <span title="Wash Cold (30°C)" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '2px 8px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent)' }}>
                      🧼 Wash 30°C
                    </span>
                    <span title="Tumble Dry Low Heat" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '2px 8px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
                      💨 Tumble Dry
                    </span>
                    <span title="Warm Iron if Needed" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '2px 8px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
                      🌡️ Warm Iron
                    </span>
                    <span title="Do Not Bleach" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '2px 8px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                      🚫 No Bleach
                    </span>
                  </div>
                </div>

                {/* Price & Cost Per Wear Cards */}
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', cursor: 'pointer' }}
                  onClick={handleStartEdit}
                  title="Click to edit price"
                >
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg-3)', borderRadius: 'var(--radius-md)', position: 'relative' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t('priceLabel')}</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{formatPrice(item.price)}</div>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg-3)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{t('costPerWear')}</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {item.price ? formatPrice(item.price / Math.max(1, item.wearLogs?.length || 0)) : '—'}
                    </div>
                  </div>
                </div>

                {/* Purchase Date */}
                <ViewRow label="Purchased" onClick={handleStartEdit} editTitle="Click to edit purchase date" muted={!item.purchaseDate}>
                  {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Set Date'}
                </ViewRow>

                {/* Times worn */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Times worn</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {item.wearLogs ? item.wearLogs.length : (item.lastWornAt ? 1 : 0)}
                  </span>
                </div>

                {/* Added Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Added</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                {/* Tags */}
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Style Tags</span>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '2px 8px', fontSize: 12, height: 'auto', minHeight: 'auto' }}
                      onClick={handleStartEdit}
                    >
                      Edit Tags
                    </button>
                  </div>

                  {item.tags && item.tags.length > 0 ? (
                    <div className="item-detail__tags" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {item.tags.map(tag => (
                        <span key={tag} className="tag-badge">{tag}</span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0' }}>
                      No tags added yet. Tap to add tags.
                    </p>
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
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Camera size={16} />
                    <span>{item.images && item.images.length >= 5 ? 'Max photos reached' : 'Add photo'}</span>
                  </button>
                  <button
                    className="btn btn-ghost btn-full"
                    onClick={() => setToast('AI Background removal coming soon!')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Wand2 size={16} />
                    <span>Remove Background (AI)</span>
                  </button>
                  <button id="btn-wear-today" className="btn btn-ghost btn-full" onClick={() => setShowBuilder(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Shirt size={16} />
                    <span>Wearing this today</span>
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
                      id="btn-delete-item"
                      className="btn btn-danger btn-full"
                      onClick={handleDelete}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <Trash2 size={16} />
                      <span>{confirming ? 'Tap again to confirm delete' : 'Delete item'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}

/* ─── Small helper for label/value rows in view mode ─── */
function ViewRow({ label, onClick, editTitle, muted, children }: {
  label: string;
  onClick: () => void;
  editTitle: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '4px 0' }}
      onClick={onClick}
      title={editTitle}
    >
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: 14, color: muted ? 'var(--text-muted)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {children}
      </span>
    </div>
  );
}
