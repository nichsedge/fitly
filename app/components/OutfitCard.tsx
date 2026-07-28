'use client';

import React, { memo } from 'react';
import { ClothingItem, Outfit, CATEGORIES } from '../lib/types';
import { ImageService } from '../services/ImageService';
import { CategoryIcon, Shirt } from './AppIcon';

interface Props {
  outfit: Outfit;
  items: ClothingItem[];
  onClick: () => void;
  viewMode?: 'grid' | 'list';
}

function OutfitCardComponent({ outfit, items, onClick, viewMode = 'grid' }: Props) {
  const outfitItems = outfit.itemIds
    .map(id => items.find(i => i.id === id))
    .filter(Boolean) as ClothingItem[];

  const count = outfitItems.length;
  const displayItems = count > 0 ? outfitItems.slice(0, 4) : [];

  const slotsToRender = count === 0 
    ? [null, null, null, null] 
    : displayItems;

  const [resolvedUrls, setResolvedUrls] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let active = true;
    const loadUrls = async () => {
      const map: Record<string, string> = {};
      for (const item of displayItems) {
        if (item.images && item.images.length > 0) {
          const imgRef = item.images[0];
          if (imgRef.startsWith('data:') || imgRef.startsWith('http') || imgRef.startsWith('blob:')) {
            map[item.id] = ImageService.getDisplayUrl(item.id, imgRef);
          } else {
            map[item.id] = await ImageService.resolveImageUrl(imgRef);
          }
        }
      }
      if (active) setResolvedUrls(map);
    };
    loadUrls();
    return () => { active = false; };
  }, [items, outfit.itemIds]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      id={`outfit-card-${outfit.id}`}
      className={`outfit-card outfit-card--${viewMode} outfit-card--count-${slotsToRender.length}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${outfit.name || 'Untitled Outfit'}, containing ${outfitItems.length} items`}
    >
      <div className="outfit-card__images">
        {slotsToRender.map((item, idx) => {
          const isSpanTwo = slotsToRender.length === 3 && idx === 2;
          const slotClass = `outfit-card__slot ${isSpanTwo ? 'outfit-card__slot--span2' : ''}`;
          if (!item) {
            return (
              <div key={`empty-${idx}`} className={`${slotClass} outfit-card__img-slot--placeholder`}>
                <Shirt size={20} color="var(--text-muted)" />
              </div>
            );
          }
          const imgUrl = resolvedUrls[item.id] || (item.images && item.images.length > 0 ? ImageService.getDisplayUrl(item.id, item.images[0]) : '');
          return imgUrl ? (
            <img
              key={`item-${item.id}-${idx}`}
              src={imgUrl}
              alt={item.name}
              className={`${slotClass} outfit-card__img-slot`}
              loading="lazy"
            />
          ) : (
            <div key={`item-${item.id}-${idx}`} className={`${slotClass} outfit-card__img-slot--placeholder`}>
              <CategoryIcon category={item.category} size={20} />
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

export default memo(OutfitCardComponent);
