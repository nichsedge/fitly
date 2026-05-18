'use client';

import { ClothingItem, CATEGORIES } from '../lib/types';

interface Props {
  item: ClothingItem;
  onClick?: () => void;
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
}

export default function ItemCard({ item, onClick, selected, onSelect, selectable }: Props) {
  const category = CATEGORIES.find(c => c.value === item.category);

  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect();
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div
      id={`item-card-${item.id}`}
      className={`item-card ${selected ? 'selected' : ''}`}
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

      <div className="item-card__body">
        <div className="item-card__name">{item.name}</div>
        <div className="item-card__meta" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <div
            className="item-card__color-dot"
            style={{ backgroundColor: item.color }}
          />
          <span className="item-card__category" style={{ textTransform: 'capitalize' }}>{item.category}</span>
          {item.price !== undefined && item.price > 0 && item.wearLogs && item.wearLogs.length > 0 && (
            <span style={{ 
              marginLeft: 'auto', 
              fontSize: 10, 
              fontWeight: 700, 
              color: '#22c55e',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              padding: '1px 5px',
              borderRadius: 4
            }} title="Cost Per Wear">
              ${(item.price / item.wearLogs.length).toFixed(2)}
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
