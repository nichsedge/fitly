'use client';

import { ClothingItem } from '../../lib/types';
import { ResolvedImage } from '../ResolvedImage';
import { CategoryIcon, Camera } from '../AppIcon';

interface ItemPhotoCarouselProps {
  item: ClothingItem;
  isEditing: boolean;
  uploadingPhoto: boolean;
  onColorPick: (hex: string, e: React.MouseEvent) => void;
  onDeleteImage: (idx: number, e: React.MouseEvent) => void;
  onAddPhotoClick: () => void;
}

/**
 * Photo carousel with tap-to-sample-color and per-photo delete.
 * Falls back to a placeholder that opens the file picker when empty.
 */
export default function ItemPhotoCarousel({
  item,
  isEditing,
  uploadingPhoto,
  onColorPick,
  onDeleteImage,
  onAddPhotoClick,
}: ItemPhotoCarouselProps) {
  const hasImages = !!item.images && item.images.length > 0;

  return (
    <div style={{ position: 'relative', marginBottom: 'var(--space-4)' }}>
      {hasImages ? (
        <div
          className="carousel-container"
          style={{
            display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
            gap: 'var(--space-3)', paddingBottom: 'var(--space-2)'
          }}
        >
          {item.images!.map((img, idx) => (
            <div
              key={idx}
              className="item-detail__image-wrapper"
              style={{ flexShrink: 0, width: '100%', scrollSnapAlign: 'start', margin: 0, position: 'relative' }}
              onClick={(e) => {
                if (isEditing) return;

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
                onColorPick(hex, e);
              }}
              role="button"
            >
              <ResolvedImage
                src={img}
                alt={`${item.name} ${idx + 1}`}
                className="item-detail__image"
                style={{ margin: 0 }}
              />
              <button
                className="item-detail__delete-photo"
                onClick={(e) => onDeleteImage(idx, e)}
                title="Delete photo"
              >
                ✕
              </button>
              {item.images!.length > 1 && (
                <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}>
                  {idx + 1} / {item.images!.length}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          id="item-photo-area"
          className="item-detail__image-wrapper"
          onClick={onAddPhotoClick}
          role="button"
        >
          <div className="item-photo-placeholder">
            <div className="empty-state__emoji">
              <CategoryIcon category={item.category} size={48} />
            </div>
            <div className="item-photo-overlay" style={{ opacity: 1 }}>
              {uploadingPhoto ? (
                <div className="loading-spinner" style={{ width: 28, height: 28, borderWidth: 2 }} />
              ) : (
                <>
                  <Camera size={26} color="white" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>Add photo</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {uploadingPhoto && hasImages && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-lg)' }}>
          <div className="loading-spinner" style={{ width: 28, height: 28, borderWidth: 2 }} />
        </div>
      )}
    </div>
  );
}
