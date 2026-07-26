'use client';

import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ClothingItem, CATEGORIES, COLORS, Category } from '../lib/types';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useSettings } from '../contexts/SettingsContext';
import { ImageService } from '../services/ImageService';
import Toast from './Toast';

interface Props {
  onDone: () => void;
}

function extractDominantColor(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve('#1a1a1a');

      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);

      const imageData = ctx.getImageData(10, 10, 30, 30);
      const data = imageData.data;

      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a > 200) {
          if (!(r > 245 && g > 245 && b > 245)) {
            rSum += r;
            gSum += g;
            bSum += b;
            count++;
          }
        }
      }

      if (count === 0) return resolve('#1a1a1a');

      const avgR = Math.round(rSum / count);
      const avgG = Math.round(gSum / count);
      const avgB = Math.round(bSum / count);

      let closestColor = COLORS[0].value;
      let minDistance = Infinity;

      COLORS.forEach(c => {
        const cleanHex = c.value.replace('#', '');
        const cr = parseInt(cleanHex.substring(0, 2), 16);
        const cg = parseInt(cleanHex.substring(2, 4), 16);
        const cb = parseInt(cleanHex.substring(4, 6), 16);

        const dist = Math.sqrt((avgR - cr) ** 2 + (avgG - cg) ** 2 + (avgB - cb) ** 2);
        if (dist < minDistance) {
          minDistance = dist;
          closestColor = c.value;
        }
      });

      resolve(closestColor);
    };
    img.onerror = () => resolve('#1a1a1a');
    img.src = dataUrl;
  });
}

export default function AddItemView({ onDone }: Props) {
  const { addItem, tags: dynamicTags, addTag, locations, activeLocationId } = useWardrobe();
  const { t, currency } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageRefs, setImageRefs] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<Category | ''>('');
  const [locationId, setLocationId] = useState<string>(activeLocationId !== 'all' ? activeLocationId : 'loc-home');
  const [color, setColor] = useState('#1a1a1a');
  const [tags, setTags] = useState<string[]>([]);
  const [material, setMaterial] = useState('');
  const [careInstructions, setCareInstructions] = useState('');
  const [condition, setCondition] = useState<ClothingItem['condition']>('new');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [newTagText, setNewTagText] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const availableSlots = 5 - imageRefs.length;
    if (availableSlots <= 0) {
      setToast('Maximum 5 photos allowed.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, availableSlots);
    setToast('Optimizing and saving photo Blobs...');

    try {
      const newImageRefs: string[] = [];
      const newPreviews: string[] = [];

      for (const file of filesToProcess) {
        const compressedBlob = await ImageService.compressImage(file);
        const imageId = await ImageService.saveImageBlob(compressedBlob);
        const displayUrl = ImageService.getDisplayUrl(imageId, compressedBlob);
        newImageRefs.push(imageId);
        newPreviews.push(displayUrl);
      }
      
      setImageRefs(prev => [...prev, ...newImageRefs]);
      setPreviewUrls(prev => [...prev, ...newPreviews]);

      if (newPreviews[0]) {
        const extractedColor = await extractDominantColor(newPreviews[0]);
        if (extractedColor) {
          setColor(extractedColor);
        }
      }

      if (!name && filesToProcess[0]) {
        const base = filesToProcess[0].name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        setName(base.charAt(0).toUpperCase() + base.slice(1));
      }
      setToast(`✓ Added ${newImageRefs.length} photo Blob(s) & detected color`);
    } catch (err) {
      console.error('Image processing failed:', err);
      setToast('Failed to load photos');
    }

    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageRefs(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const toggleTag = (tagLabel: string) => {
    setTags(prev => prev.includes(tagLabel) ? prev.filter(t => t !== tagLabel) : [...prev, tagLabel]);
  };

  const handleCreateTag = async () => {
    const trimmed = newTagText.trim();
    if (!trimmed) {
      setIsAddingTag(false);
      return;
    }
    const existing = dynamicTags.find(t => t.label.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!tags.includes(existing.label)) {
        setTags(prev => [...prev, existing.label]);
      }
      setNewTagText('');
      setIsAddingTag(false);
      return;
    }
    const newTag = { id: uuidv4(), label: trimmed };
    await addTag(newTag);
    setTags(prev => [...prev, trimmed]);
    setNewTagText('');
    setIsAddingTag(false);
    setToast(`✓ Tag "${trimmed}" created and selected`);
  };

  const canSave = name.trim() && category;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const item: ClothingItem = {
      id: uuidv4(),
      name: name.trim(),
      brand: brand.trim() || undefined,
      price: price ? parseFloat(price) : undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate).getTime() : undefined,
      status: 'ready',
      category: category as Category,
      locationId: locationId || 'loc-home',
      color,
      tags,
      images: imageRefs,
      material: material.trim() || undefined,
      careInstructions: careInstructions.trim() || undefined,
      condition: condition || 'good',
      createdAt: Date.now(),
    };
    await addItem(item);
    setToast('✓ Item added to wardrobe!');
    setTimeout(onDone, 800);
  };

  return (
    <div className="form-page animate-in">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>
          Add Item
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Take a photo or pick from gallery (multi-select supported)
        </p>
      </div>

      {/* Photos */}
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Photos</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
            {previewUrls.length}/5 (Front, back, details)
          </span>
        </label>
        
        <div style={{ display: 'flex', gap: 'var(--space-3)', overflowX: 'auto', paddingBottom: 'var(--space-3)' }}>
          {previewUrls.map((img, idx) => (
            <div key={idx} style={{ position: 'relative', width: 240, height: 320, flexShrink: 0, borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <img 
                src={img} 
                alt={`Photo ${idx + 1}`} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onClick={(e) => {
                  const imgEl = e.currentTarget;
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
                  setColor(hex);
                  setToast(`Color picked: ${hex}`);
                }}
              />
              {idx === 0 && (
                <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'var(--accent)', color: 'var(--bg-0)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}>
                  Cover
                </div>
              )}
              <button
                type="button"
                onClick={() => removeImage(idx)}
                style={{
                  position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10
                }}
                title="Remove photo"
              >✕</button>
            </div>
          ))}
          
          {previewUrls.length < 5 && (
            <div
              className="photo-upload"
              onClick={() => fileRef.current?.click()}
              role="button"
              style={{ width: 240, height: 320, flexShrink: 0, cursor: 'pointer' }}
            >
              <span className="photo-upload__icon">📷</span>
              <span className="photo-upload__text">Tap to add photo(s)</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Saved as Blobs</span>
            </div>
          )}
        </div>
        
        {previewUrls.length > 0 && (
          <p style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2, fontWeight: 600, textAlign: 'center' }}>
            🎯 Tap on any image to pick a color
          </p>
        )}
        
        <input
          ref={fileRef}
          id="file-input"
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Name & Brand */}
      <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
        <div>
          <label className="form-label" htmlFor="item-name">Name</label>
          <input
            id="item-name"
            className="form-input"
            type="text"
            placeholder="e.g. White Oxford Shirt"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={60}
          />
        </div>
        <div>
          <label className="form-label" htmlFor="item-brand">Brand</label>
          <input
            id="item-brand"
            className="form-input"
            type="text"
            placeholder="Levi's"
            value={brand}
            onChange={e => setBrand(e.target.value)}
          />
        </div>
      </div>

      {/* Location Selection */}
      <div className="form-group">
        <label className="form-label" htmlFor="item-location">Wardrobe Location</label>
        <select
          id="item-location"
          className="form-input"
          value={locationId}
          onChange={e => setLocationId(e.target.value)}
        >
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>
              {loc.icon || '📍'} {loc.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
        <div>
          <label className="form-label" htmlFor="item-price">{t('priceLabel')} ({currency === 'IDR' ? 'Rp' : (currency === 'USD' ? '$' : (currency === 'EUR' ? '€' : '£'))})</label>
          <input
            id="item-price"
            className="form-input"
            type="number"
            step={currency === 'IDR' ? '1000' : '0.01'}
            placeholder={currency === 'IDR' ? '150000' : '49.99'}
            value={price}
            onChange={e => setPrice(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label" htmlFor="item-date">Purchase Date</label>
          <input
            id="item-date"
            className="form-input"
            type="date"
            value={purchaseDate}
            onChange={e => setPurchaseDate(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label" htmlFor="item-condition">Condition</label>
          <select 
            id="item-condition" 
            className="form-input" 
            value={condition} 
            onChange={e => setCondition(e.target.value as ClothingItem['condition'])}
            style={{ padding: '0 8px' }}
          >
            <option value="new">New</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
            <option value="needs-repair">Repair</option>
          </select>
        </div>
      </div>

      <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <div>
          <label className="form-label" htmlFor="item-material">Material</label>
          <input
            id="item-material"
            className="form-input"
            type="text"
            placeholder="e.g. 100% Silk"
            value={material}
            onChange={e => setMaterial(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label" htmlFor="item-care">Care</label>
          <input
            id="item-care"
            className="form-input"
            type="text"
            placeholder="Hand wash only"
            value={careInstructions}
            onChange={e => setCareInstructions(e.target.value)}
          />
        </div>
      </div>

      {/* Category */}
      <div className="form-group">
        <label className="form-label">Category</label>
        <div className="pill-group">
          {CATEGORIES.map(cat => (
            <button
              id={`cat-${cat.value}`}
              key={cat.value}
              className={`pill ${category === cat.value ? 'active' : ''}`}
              onClick={() => setCategory(cat.value)}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div className="form-group">
        <label className="form-label">Color</label>
        <div className="color-grid">
          {COLORS.map(c => (
            <button
              id={`color-${c.label.toLowerCase()}`}
              key={c.value}
              className={`color-swatch ${color === c.value ? 'active' : ''}`}
              style={{ backgroundColor: c.value }}
              onClick={() => setColor(c.value)}
              title={c.label}
              aria-label={c.label}
            />
          ))}
          {/* Custom Color Picker */}
          <div style={{ position: 'relative' }}>
            <button
              id="color-custom-btn"
              className={`color-swatch ${!COLORS.some(c => c.value === color) ? 'active' : ''}`}
              style={{ 
                backgroundColor: !COLORS.some(c => c.value === color) ? color : 'var(--bg-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: !COLORS.some(c => c.value === color) ? (parseInt(color.replace('#',''), 16) > 0xffffff/2 ? '#000' : '#fff') : 'var(--text-secondary)'
              }}
              onClick={() => document.getElementById('custom-color-input')?.click()}
              title="Custom Color"
              aria-label="Custom Color"
            >
              {!COLORS.some(c => c.value === color) ? '✓' : '+'}
            </button>
            <input
              id="custom-color-input"
              type="color"
              value={!COLORS.some(c => c.value === color) ? color : '#ffffff'}
              onChange={(e) => setColor(e.target.value)}
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
        </div>
      </div>

      {/* Tags */}
      <div className="form-group">
        <label className="form-label">Style Tags <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
        <div className="pill-group" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {dynamicTags.map(tag => (
            <button
              id={`tag-${tag.id}`}
              key={tag.id}
              className={`pill ${tags.includes(tag.label) ? 'active' : ''}`}
              type="button"
              onClick={() => toggleTag(tag.label)}
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

      {/* Save */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
        <button id="btn-cancel" className="btn btn-ghost" onClick={onDone} style={{ flex: 1 }}>
          Cancel
        </button>
        <button
          id="btn-save-item"
          className="btn btn-primary"
          style={{ flex: 2 }}
          onClick={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? 'Saving…' : '✓ Add to Wardrobe'}
        </button>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
