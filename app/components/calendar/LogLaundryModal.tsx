'use client';

import { useState, useEffect } from 'react';
import { ClothingItem } from '../../lib/types';
import { ResolvedImage } from '../ResolvedImage';
import { formatDateKey } from '../../lib/domain/calendar';
import { WashingMachine, CategoryIcon } from '../AppIcon';

/* ─── Log Laundry Modal ─── */
interface LogLaundryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDateKey?: string;
  items: ClothingItem[];
  onSaveWash: (dateKey: string, itemIds: string[]) => Promise<void>;
}

export default function LogLaundryModal({ isOpen, onClose, initialDateKey, items, onSaveWash }: LogLaundryModalProps) {
  const [dateKey, setDateKey] = useState(initialDateKey || formatDateKey(new Date()));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDateKey(initialDateKey || formatDateKey(new Date()));
      setSelectedIds([]);
    }
  }, [isOpen, initialDateKey]);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAllWorn = () => {
    const dirtyIds = items.filter(i => i.status === 'dirty' || (i.wearLogs && i.wearLogs.length > 0)).map(i => i.id);
    setSelectedIds(dirtyIds);
  };

  const handleSave = async () => {
    if (selectedIds.length === 0) return;
    const targetDateKey = dateKey && dateKey.trim() !== '' ? dateKey : (initialDateKey || formatDateKey(new Date()));

    setIsSubmitting(true);
    try {
      await onSaveWash(targetDateKey, selectedIds);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 120 }}>
      <div className="modal-sheet animate-scale" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WashingMachine size={20} color="var(--accent)" />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Log Laundry Entry</h3>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 'var(--space-4)', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Wash Date</label>
            <input
              type="date"
              value={dateKey}
              onChange={e => setDateKey(e.target.value)}
              style={{ padding: '6px 12px', fontSize: 12, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Select items washed:</span>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={handleSelectAllWorn}>
              Select Dirty Items
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
            {items.map(item => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => handleToggle(item.id)}
                  style={{
                    width: 76,
                    padding: 6,
                    background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--surface)',
                    border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden', marginBottom: 4 }}>
                    <ResolvedImage
                      src={item.images && item.images[0]}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      fallback={<CategoryIcon category={item.category} size={22} />}
                    />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-full" disabled={isSubmitting || selectedIds.length === 0} onClick={handleSave}>
            {isSubmitting ? 'Saving...' : `Log Washed (${selectedIds.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
