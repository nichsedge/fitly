'use client';

import { ClothingItem, CATEGORIES } from '../lib/types';
import { useApp } from './AppProvider';

interface Props {
  item: ClothingItem;
  onClick?: () => void;
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
  viewMode?: 'grid' | 'list';
}

export default function ItemCard({ item, onClick, selected, onSelect, selectable, viewMode = 'grid' }: Props) {
  const { formatPrice } = useApp();
  const category = CATEGORIES.find(c => c.value === item.category);

  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect();
    } else if (onClick) {
      onClick();
    }
  };

  const wearCount = item.wearLogs ? item.wearLogs.length : 0;
  const cpw = item.price !== undefined && item.price > 0 && wearCount > 0 ? (item.price / wearCount) : null;

  return (
    <div
      id={`item-card-${item.id}`}
      className={`item-card item-card--${viewMode} ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      role="button"
      aria-pressed={selected}
    >
      {cpw !== null && viewMode === 'grid' && (
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

      {item.status !== 'ready' && (
        <div className={`item-card__status-badge ${item.status}`}>
          {item.status === 'dirty' ? '🧺' : '🧼'}
        </div>
      )}

      {(item.condition === 'poor' || item.condition === 'needs-repair') && (
        <div 
          className="item-card__condition-badge"
          title={item.condition === 'poor' ? 'Poor condition' : 'Needs repair'}
        >
          {item.condition === 'poor' ? '⚠️' : '🛠️'}
        </div>
      )}

      {item.images && item.images.length > 0 ? (
        <img
          src={item.images[0]}
          alt={item.name}
          className="item-card__image"
          loading="lazy"
        />
      ) : (
        <div className="item-card__image-placeholder">
          {category?.emoji || '👕'}
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
            <span style={{ color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>
              🏷️ {item.brand}
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
        <div className="item-card__check">✓</div>
      )}
    </div>
  );
}
