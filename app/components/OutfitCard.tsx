'use client';

import { ClothingItem, Outfit, CATEGORIES } from '../lib/types';

interface Props {
  outfit: Outfit;
  items: ClothingItem[];
  onClick: () => void;
  viewMode?: 'grid' | 'list';
}

export default function OutfitCard({ outfit, items, onClick, viewMode = 'grid' }: Props) {
  const outfitItems = outfit.itemIds
    .map(id => items.find(i => i.id === id))
    .filter(Boolean) as ClothingItem[];

  const count = outfitItems.length;
  const displayItems = count > 0 ? outfitItems.slice(0, 4) : [];
  const defaultEmojis = ['👕', '👖', '👟', '🧥'];

  // If no items in outfit, show 4 placeholders
  const slotsToRender = count === 0 
    ? [null, null, null, null] 
    : displayItems;

  return (
    <div
      id={`outfit-card-${outfit.id}`}
      className={`outfit-card outfit-card--${viewMode} outfit-card--count-${slotsToRender.length}`}
      onClick={onClick}
      role="button"
    >
      <div className="outfit-card__images">
        {slotsToRender.map((item, idx) => {
          const isSpanTwo = slotsToRender.length === 3 && idx === 2;
          const slotClass = `outfit-card__slot ${isSpanTwo ? 'outfit-card__slot--span2' : ''}`;
          if (!item) {
            return (
              <div key={`empty-${idx}`} className={`${slotClass} outfit-card__img-slot--placeholder`}>
                {defaultEmojis[idx]}
              </div>
            );
          }
          const cat = CATEGORIES.find(c => c.value === item.category);
          return item.images && item.images.length > 0 ? (
            <img
              key={`item-${item.id}-${idx}`}
              src={item.images[0]}
              alt={item.name}
              className={`${slotClass} outfit-card__img-slot`}
            />
          ) : (
            <div key={`item-${item.id}-${idx}`} className={`${slotClass} outfit-card__img-slot--placeholder`}>
              {cat?.emoji || defaultEmojis[idx]}
            </div>
          );
        })}
      </div>

      <div className="outfit-card__body">
        <div>
          <div className="outfit-card__name">
            {outfit.name || 'Untitled Outfit'}
          </div>
          {outfit.note && (
            <div className="outfit-card__note">{outfit.note}</div>
          )}
        </div>
        <div className="outfit-card__items-count">
          {outfitItems.length} item{outfitItems.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
