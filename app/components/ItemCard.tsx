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

      <div className="item-card__body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="item-card__name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
            {item.brand && (
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                🏷️ {item.brand}
              </div>
            )}
          </div>
          {item.price !== undefined && item.price > 0 && (
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', background: 'var(--bg-3)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
              {formatPrice(item.price)}
            </div>
          )}
        </div>

        <div className="item-card__meta" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          <div
            className="item-card__color-dot"
            style={{ backgroundColor: item.color }}
          />
          <span className="item-card__category" style={{ textTransform: 'capitalize' }}>{item.category}</span>
          {wearCount > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
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
              borderRadius: 4
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
