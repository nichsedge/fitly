'use client';

import React, { memo } from 'react';
import { ClothingItem } from '../lib/types';
import { useSettings } from '../contexts/SettingsContext';
import { ImageService } from '../services/ImageService';
import { CategoryIcon, Tag } from './AppIcon';

interface Props {
  item: ClothingItem;
  onClick?: () => void;
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
  viewMode?: 'grid' | 'list';
  density?: 'normal' | 'compact';
  onToggleStatus?: (item: ClothingItem, e: React.MouseEvent) => void;
}

function ItemCardComponent({
  item,
  onClick,
  selected,
  onSelect,
  selectable,
  viewMode = 'grid',
  density = 'normal',
  onToggleStatus,
}: Props) {
  const { formatPrice } = useSettings();
  const [displayImage, setDisplayImage] = React.useState<string>('');

  React.useEffect(() => {
    let active = true;
    if (item.images && item.images.length > 0) {
      const imgRef = item.images[0];
      if (imgRef.startsWith('data:') || imgRef.startsWith('http') || imgRef.startsWith('blob:')) {
        setDisplayImage(ImageService.getDisplayUrl(item.id, imgRef));
      } else {
        ImageService.resolveImageUrl(imgRef).then(url => {
          if (active) setDisplayImage(url);
        });
      }
    } else {
      setDisplayImage('');
    }
    return () => { active = false; };
  }, [item.id, item.images]);

  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect();
    } else if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const wearCount = item.wearLogs ? item.wearLogs.length : 0;
  const cpw = item.price !== undefined && item.price > 0 && wearCount > 0 ? (item.price / wearCount) : null;
  const imageUrl = displayImage;

  return (
    <div
      id={`item-card-${item.id}`}
      className={`item-card item-card--${viewMode} item-card--${density} ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`${item.name}, ${item.category}${item.brand ? `, Brand: ${item.brand}` : ''}`}
    >
      {cpw !== null && viewMode === 'grid' && density === 'normal' && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            color: 'var(--accent)',
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: 'var(--radius-pill)',
            zIndex: 2,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
          }}
          title={`Cost Per Wear: ${formatPrice(cpw)} per wear`}
        >
          {formatPrice(cpw)}/w
        </div>
      )}

      {onToggleStatus ? (
        <button
          type="button"
          className={`item-card__quick-status-btn ${item.status}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus(item, e);
          }}
          title={item.status === 'dirty' ? 'Mark Clean 🧼' : 'Mark Dirty 🧺'}
          aria-label={item.status === 'dirty' ? 'Mark Clean' : 'Mark Dirty'}
        >
          {item.status === 'dirty' ? '🧺' : '🧼'}
        </button>
      ) : item.status !== 'ready' ? (
        <div className={`item-card__status-badge ${item.status}`} aria-label={`Status: ${item.status}`}>
          {item.status === 'dirty' ? '🧺' : '🧼'}
        </div>
      ) : null}

      {(item.condition === 'poor' || item.condition === 'needs-repair') && (
        <div 
          className="item-card__condition-badge"
          title={item.condition === 'poor' ? 'Poor condition' : 'Needs repair'}
          aria-label={`Condition: ${item.condition}`}
        >
          {item.condition === 'poor' ? '⚠️' : '🛠️'}
        </div>
      )}

      {imageUrl ? (
        <img
          src={imageUrl}
          alt={item.name}
          className="item-card__image"
          loading="lazy"
        />
      ) : (
        <div className="item-card__image-placeholder">
          <CategoryIcon category={item.category} size={28} />
        </div>
      )}

      <div className="item-card__body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <div className="item-card__name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700, fontSize: 13, flex: 1 }}>
            {item.name}
          </div>
          {item.price !== undefined && item.price > 0 && (
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', background: 'var(--bg-3)', padding: '1px 6px', borderRadius: 'var(--radius-sm)' }}>
              {formatPrice(item.price)}
            </div>
          )}
        </div>

        <div className="item-card__meta" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 6, marginTop: 2, fontSize: 11, overflow: 'hidden' }}>
          <div
            className="item-card__color-dot"
            style={{ backgroundColor: item.color, width: 10, height: 10, borderRadius: '50%', flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }}
            title={`Color: ${item.color}`}
          />
          {item.brand && (
            <span style={{ color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Tag size={10} />
              <span>{item.brand}</span>
            </span>
          )}
          <span className="item-card__category" style={{ textTransform: 'capitalize', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {item.brand ? `• ${item.category}` : item.category}
          </span>
          {wearCount > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              • {wearCount}w
            </span>
          )}
          {cpw !== null && (
            <span style={{ 
              marginLeft: 'auto', 
              fontSize: 10, 
              fontWeight: 700, 
              color: 'var(--accent)',
              backgroundColor: 'var(--accent-subtle)',
              padding: '1px 5px',
              borderRadius: 4,
              whiteSpace: 'nowrap'
            }} title="Cost Per Wear">
              {formatPrice(cpw)}/w
            </span>
          )}
        </div>
      </div>

      {selectable && (
        <div className="item-card__check" aria-hidden="true">✓</div>
      )}
    </div>
  );
}

export default memo(ItemCardComponent);
