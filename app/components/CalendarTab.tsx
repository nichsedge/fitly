'use client';

import { useMemo, useState, useCallback } from 'react';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useOutfits } from '../contexts/OutfitContext';
import { ClothingItem, Outfit } from '../lib/types';
import Toast from './Toast';
import { ResolvedImage } from './ResolvedImage';
import { 
  getCalendarWeek,
  getCalendarMonth,
  formatDateKey, 
  formatDateDisplay, 
  getDayAbbreviation, 
  getWeekLabel,
  getPreviousWeek,
  getNextWeek,
  getCurrentWeek,
  getPreviousMonth,
  getNextMonth,
  getMonthLabel,
  WEEKDAYS,
  CalendarDay,
  DragItem,
  createPlanFromOutfit,
  createPlanFromItems,
  getDayLogSummary,
  timestampToDateKey,
  dateKeyToTimestamp,
  DayLogSummary,
} from '../lib/domain/calendar';
import { 
  Sparkles, 
  Shirt, 
  WashingMachine, 
  Calendar as CalendarIcon, 
  CategoryIcon,
  Plus,
  Search,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Grid,
  History,
} from './AppIcon';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* ─── Draggable Outfit Component ─── */
interface DraggableOutfitProps {
  outfit: Outfit;
  dateKey?: string;
  onDragStart: (item: DragItem) => void;
}

function DraggableOutfit({ outfit, dateKey, onDragStart }: DraggableOutfitProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: outfit.id,
    data: { type: 'outfit', outfitId: outfit.id, dateKey },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="draggable-outfit"
      onMouseDown={(e) => {
        if (e.button === 0) onDragStart({ type: 'outfit', id: outfit.id, dateKey });
      }}
      onTouchStart={() => {
        onDragStart({ type: 'outfit', id: outfit.id, dateKey });
      }}
    >
      <div style={{ padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Sparkles size={16} color="var(--accent)" />
        <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{outfit.name}</span>
        {dateKey && <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-3)', padding: '1px 6px', borderRadius: 4 }}>{dateKey}</span>}
      </div>
    </div>
  );
}

/* ─── Draggable Item Component ─── */
interface DraggableItemProps {
  item: ClothingItem;
  dateKey?: string;
  onDragStart: (item: DragItem) => void;
}

function DraggableItem({ item, dateKey, onDragStart }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: 'item', itemId: item.id, dateKey },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="draggable-item"
      onMouseDown={(e) => {
        if (e.button === 0) onDragStart({ type: 'item', id: item.id, dateKey });
      }}
      onTouchStart={() => {
        onDragStart({ type: 'item', id: item.id, dateKey });
      }}
    >
      <div {...attributes} {...listeners} style={{ width: 60, height: 60, borderRadius: 'var(--radius-md)', background: 'var(--bg-3)', overflow: 'hidden', marginBottom: 4, border: '1px solid var(--border)' }}>
        <ResolvedImage
          src={item.images && item.images[0]}
          alt={item.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          fallback={
            <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
              <CategoryIcon category={item.category} size={22} />
            </div>
          }
        />
      </div>
      <div style={{ fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', width: 60 }}>{item.name}</div>
    </div>
  );
}

/* ─── Month Day Cell Component ─── */
interface MonthDayCellProps {
  day: CalendarDay;
  onClick: (dateKey: string) => void;
}

function MonthDayCell({ day, onClick }: MonthDayCellProps) {
  const wornCount = day.wornOutfits.length + day.wornItems.length;
  const plannedCount = day.plannedOutfits.length;
  const washedCount = day.washedItems.length;

  return (
    <div
      onClick={() => onClick(day.dateKey)}
      className={`log-month-cell ${!day.isCurrentMonth ? 'is-other-month' : ''} ${day.isToday ? 'is-today' : ''}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: 12,
          fontWeight: day.isToday ? 800 : 600,
          color: day.isToday ? 'var(--accent)' : (day.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)'),
        }}>
          {day.date.getDate()}
        </span>
      </div>

      <div className="log-month-dots">
        {wornCount > 0 && <div className="log-dot log-dot--worn" title={`${wornCount} worn`} />}
        {plannedCount > 0 && <div className="log-dot log-dot--planned" title={`${plannedCount} planned`} />}
        {washedCount > 0 && <div className="log-dot log-dot--washed" title={`${washedCount} washed`} />}
      </div>

      {wornCount > 0 && (
        <div style={{ fontSize: 9, fontWeight: 700, color: '#10b981', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {day.wornOutfits[0]?.name || `${wornCount} Worn`}
        </div>
      )}
    </div>
  );
}

/* ─── Week Day Cell Component ─── */
interface WeekDayCellProps {
  day: CalendarDay;
  onClick: (dateKey: string) => void;
  isDragOver: boolean;
}

function WeekDayCell({ day, onClick, isDragOver }: WeekDayCellProps) {
  const isToday = day.isToday;
  const wornCount = day.wornOutfits.length + day.wornItems.length;
  const plannedCount = day.plannedOutfits.length;
  const washedCount = day.washedItems.length;

  return (
    <div
      onClick={() => onClick(day.dateKey)}
      className={`log-day-cell ${isToday ? 'is-today' : ''} ${isDragOver ? 'drag-over' : ''}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
          {getDayAbbreviation(day.date)}
        </span>
        <span style={{
          fontSize: 13,
          fontWeight: isToday ? 800 : 600,
          color: isToday ? 'var(--bg-0)' : 'var(--text-primary)',
          background: isToday ? 'var(--accent)' : 'transparent',
          width: 22,
          height: 22,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center'
        }}>
          {day.date.getDate()}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, margin: '6px 0' }}>
        {wornCount > 0 && (
          <span className="log-badge log-badge--worn">
            ✓ {wornCount} Worn
          </span>
        )}
        {plannedCount > 0 && (
          <span className="log-badge log-badge--planned">
            📅 {plannedCount} Plan
          </span>
        )}
        {washedCount > 0 && (
          <span className="log-badge log-badge--washed">
            🧺 {washedCount} Washed
          </span>
        )}
        {day.totalLogsCount === 0 && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6, textAlign: 'center', padding: '6px 0' }}>
            + Inspect
          </div>
        )}
      </div>

      {day.wornOutfits.length > 0 && (
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
          {day.wornOutfits[0].name}
        </div>
      )}
    </div>
  );
}

/* ─── Log Wear Modal ─── */
interface LogWearModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDateKey?: string;
  outfits: Outfit[];
  items: ClothingItem[];
  onSaveWear: (dateKey: string, outfitId?: string, itemIds?: string[]) => Promise<void>;
}

function LogWearModal({ isOpen, onClose, initialDateKey, outfits, items, onSaveWear }: LogWearModalProps) {
  const [dateKey, setDateKey] = useState(initialDateKey || formatDateKey(new Date()));
  const [mode, setMode] = useState<'outfit' | 'items'>('outfit');
  const [selectedOutfitId, setSelectedOutfitId] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const todayKey = formatDateKey(new Date());
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterdayObj);

  const filteredItems = items.filter(i => {
    const matchesCategory = filterCategory === 'all' || i.category === filterCategory;
    const matchesSearch = search === '' || i.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredOutfits = outfits.filter(o => 
    search === '' || o.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleItem = (id: string) => {
    setSelectedItemIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (mode === 'outfit' && !selectedOutfitId) return;
    if (mode === 'items' && selectedItemIds.length === 0) return;

    setIsSubmitting(true);
    try {
      if (mode === 'outfit') {
        await onSaveWear(dateKey, selectedOutfitId, undefined);
      } else {
        await onSaveWear(dateKey, undefined, selectedItemIds);
      }
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
            <Sparkles size={20} color="var(--accent)" />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Log Wear Entry</h3>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 'var(--space-4)', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Select Wear Date
            </label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className={`btn ${dateKey === todayKey ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => setDateKey(todayKey)}
              >
                Today
              </button>
              <button
                className={`btn ${dateKey === yesterdayKey ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => setDateKey(yesterdayKey)}
              >
                Yesterday
              </button>
              <input
                type="date"
                value={dateKey}
                onChange={e => setDateKey(e.target.value)}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          <div className="log-segmented-tabs">
            <button
              className={`log-seg-btn ${mode === 'outfit' ? 'active' : ''}`}
              onClick={() => setMode('outfit')}
            >
              <Sparkles size={14} /> Outfit
            </button>
            <button
              className={`log-seg-btn ${mode === 'items' ? 'active' : ''}`}
              onClick={() => setMode('items')}
            >
              <Shirt size={14} /> Individual Items
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={mode === 'outfit' ? 'Search outfits...' : 'Search items...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="log-search-input"
            />
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 10 }} />
          </div>

          {mode === 'outfit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
              {filteredOutfits.map(outfit => {
                const isSelected = selectedOutfitId === outfit.id;
                return (
                  <div
                    key={outfit.id}
                    onClick={() => setSelectedOutfitId(outfit.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 10,
                      background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface)',
                      border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden', flexShrink: 0 }}>
                      <ResolvedImage
                        src={outfit.itemIds.length > 0 ? items.find(i => i.id === outfit.itemIds[0])?.images?.[0] : undefined}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        fallback={<div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', fontSize: 18 }}>👗</div>}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{outfit.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{outfit.itemIds.length} items</div>
                    </div>
                    {isSelected && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}

          {mode === 'items' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
              {filteredItems.map(item => {
                const isSelected = selectedItemIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleItem(item.id)}
                    style={{
                      width: 76,
                      padding: 6,
                      background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface)',
                      border: `1.5px solid ${isSelected ? '#10b981' : 'var(--border)'}`,
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
          )}
        </div>

        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary btn-full"
            disabled={isSubmitting || (mode === 'outfit' ? !selectedOutfitId : selectedItemIds.length === 0)}
            onClick={handleSave}
          >
            {isSubmitting ? 'Saving...' : 'Save Wear Log'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Log Laundry Modal ─── */
interface LogLaundryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDateKey?: string;
  items: ClothingItem[];
  onSaveWash: (dateKey: string, itemIds: string[]) => Promise<void>;
}

function LogLaundryModal({ isOpen, onClose, initialDateKey, items, onSaveWash }: LogLaundryModalProps) {
  const [dateKey, setDateKey] = useState(initialDateKey || formatDateKey(new Date()));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);
    try {
      await onSaveWash(dateKey, selectedIds);
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

/* ─── Day Log Inspector Modal ─── */
interface DayDetailModalProps {
  dateKey: string;
  isOpen: boolean;
  onClose: () => void;
  plans: any[];
  outfits: Outfit[];
  items: ClothingItem[];
  onMarkPlanWorn: (plan: any) => Promise<void>;
  onRemoveOutfitLog: (outfit: Outfit, dateKey: string) => Promise<void>;
  onRemoveItemLog: (item: ClothingItem, dateKey: string) => Promise<void>;
  onRemoveWashLog: (dateKey: string, washedItems: ClothingItem[]) => Promise<void>;
  onCancelPlan: (planId: string) => Promise<void>;
  onOpenLogWear: (dateKey: string) => void;
  onOpenLogWash: (dateKey: string) => void;
}

function DayDetailModal({
  dateKey,
  isOpen,
  onClose,
  plans,
  outfits,
  items,
  onMarkPlanWorn,
  onRemoveOutfitLog,
  onRemoveItemLog,
  onRemoveWashLog,
  onCancelPlan,
  onOpenLogWear,
  onOpenLogWash,
}: DayDetailModalProps) {
  if (!isOpen) return null;

  const summary = getDayLogSummary(dateKey, plans, outfits, items);
  const formattedDate = formatDateDisplay(summary.dateObj);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 110 }}>
      <div className="modal-sheet animate-scale" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Style & Activity Log</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formattedDate}</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 'var(--space-4)', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Action Quick Bar */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1, padding: '8px 12px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => onOpenLogWear(dateKey)}>
              <Sparkles size={14} /> + Log Wear
            </button>
            <button className="btn btn-ghost" style={{ flex: 1, padding: '8px 12px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid var(--border)' }} onClick={() => onOpenLogWash(dateKey)}>
              <WashingMachine size={14} /> + Log Laundry
            </button>
          </div>

          {/* Worn Outfits */}
          {summary.wornOutfits.length > 0 && (
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                ✓ Outfits Worn
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {summary.wornOutfits.map(outfit => (
                  <div key={outfit.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{outfit.name}</span>
                      <button className="btn btn-ghost" style={{ fontSize: 11, color: '#ef4444', padding: '2px 6px' }} onClick={() => onRemoveOutfitLog(outfit, dateKey)}>
                        Remove
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                      {outfit.itemIds.map(itemId => {
                        const item = items.find(i => i.id === itemId);
                        if (!item) return null;
                        return (
                          <div key={item.id} style={{ width: 48, flexShrink: 0, textAlign: 'center' }}>
                            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden' }}>
                              <ResolvedImage src={item.images?.[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} fallback={<CategoryIcon category={item.category} size={20} />} />
                            </div>
                            <div style={{ fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{item.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Worn Individual Items */}
          {summary.wornItems.length > 0 && (
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                ✓ Single Items Worn
              </h4>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {summary.wornItems.map(item => (
                  <div key={item.id} style={{ width: 72, padding: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', position: 'relative' }}>
                    <button
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, fontSize: 9, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                      onClick={() => onRemoveItemLog(item, dateKey)}
                    >
                      ✕
                    </button>
                    <div style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden', marginBottom: 4 }}>
                      <ResolvedImage src={item.images?.[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} fallback={<CategoryIcon category={item.category} size={20} />} />
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{item.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Planned Outfits */}
          {summary.plannedOutfits.length > 0 && (
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                📅 Planned for this day
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {summary.plannedOutfits.map(plan => {
                  const outfit = outfits.find(o => o.id === plan.outfitId);
                  return (
                    <div key={plan.id} style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: 'var(--radius-md)', padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {outfit ? outfit.name : `Custom (${plan.itemIds.length} items)`}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Planned outfit</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => onMarkPlanWorn(plan)}>
                          ✓ Mark Worn
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11, color: 'var(--text-muted)' }} onClick={() => onCancelPlan(plan.id)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Washed Laundry */}
          {summary.washedItems.length > 0 && (
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                🧺 Washed Laundry
              </h4>
              <div style={{ background: 'var(--bg-2)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Washed {summary.washedItems.length} item(s)</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{summary.washedItems.map(i => i.name).join(', ')}</div>
                </div>
                <button className="btn btn-ghost" style={{ fontSize: 11, color: '#ef4444' }} onClick={() => onRemoveWashLog(dateKey, summary.washedItems)}>
                  Remove
                </button>
              </div>
            </div>
          )}

          {summary.wornOutfits.length === 0 && summary.wornItems.length === 0 && summary.plannedOutfits.length === 0 && summary.washedItems.length === 0 && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 13 }}>No activity logged for this date yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN CALENDAR / LOG TAB ─── */
export default function CalendarTab() {
  const { items, updateItem } = useWardrobe();
  const { outfits, plans, updateOutfit, deletePlan, updatePlan, addPlan, recordOutfitWear } = useOutfits();

  const [activeView, setActiveView] = useState<'month' | 'week' | 'history' | 'assign'>('month');
  const [currentMonthState, setCurrentMonthState] = useState<{ year: number; month: number }>(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });
  const [currentWeek, setCurrentWeek] = useState<Date>(getCurrentWeek());
  const [toast, setToast] = useState('');

  // Modals state
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isLogWearOpen, setIsLogWearOpen] = useState(false);
  const [isLogWashOpen, setIsLogWashOpen] = useState(false);
  const [logModalDateKey, setLogModalDateKey] = useState<string>(formatDateKey(new Date()));

  // Search & Filters for History
  const [historySearch, setHistorySearch] = useState('');
  const [historyCategory, setHistoryCategory] = useState<'all' | 'outfits' | 'items' | 'laundry'>('all');

  // Drag state
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /* ── Month & Week Data ── */
  const calendarMonth = useMemo(() => 
    getCalendarMonth(currentMonthState.year, currentMonthState.month, plans, outfits, items),
    [currentMonthState, plans, outfits, items]
  );

  const calendarWeek = useMemo(() => 
    getCalendarWeek(currentWeek, plans, outfits, items),
    [currentWeek, plans, outfits, items]
  );

  /* ── Stats Calculations ── */
  const logStats = useMemo(() => {
    let totalOutfitWears = 0;
    outfits.forEach(o => {
      totalOutfitWears += (o.wearLogs ? o.wearLogs.length : (o.lastWornAt ? 1 : 0));
    });

    let totalItemWears = 0;
    let totalWashes = 0;
    items.forEach(i => {
      totalItemWears += (i.wearLogs ? i.wearLogs.length : (i.lastWornAt ? 1 : 0));
      totalWashes += (i.washLogs ? i.washLogs.length : (i.lastWashedAt ? 1 : 0));
    });

    return {
      totalWears: totalOutfitWears + totalItemWears,
      outfitWears: totalOutfitWears,
      washCount: totalWashes,
    };
  }, [outfits, items]);

  /* ── Past Logs Chronological Feed ── */
  const historyFeed = useMemo(() => {
    const map: Record<string, DayLogSummary> = {};

    outfits.forEach(outfit => {
      const logs = outfit.wearLogs || (outfit.lastWornAt ? [outfit.lastWornAt] : []);
      logs.forEach(ts => {
        const key = timestampToDateKey(ts);
        if (!map[key]) map[key] = getDayLogSummary(key, plans, outfits, items);
      });
    });

    items.forEach(item => {
      const logs = item.wearLogs || (item.lastWornAt ? [item.lastWornAt] : []);
      logs.forEach(ts => {
        const key = timestampToDateKey(ts);
        if (!map[key]) map[key] = getDayLogSummary(key, plans, outfits, items);
      });

      const washLogs = item.washLogs || (item.lastWashedAt ? [item.lastWashedAt] : []);
      washLogs.forEach(ts => {
        const key = timestampToDateKey(ts);
        if (!map[key]) map[key] = getDayLogSummary(key, plans, outfits, items);
      });
    });

    plans.forEach(plan => {
      const key = plan.date;
      if (!map[key]) map[key] = getDayLogSummary(key, plans, outfits, items);
    });

    return Object.values(map)
      .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())
      .filter(day => {
        if (historyCategory === 'outfits' && day.wornOutfits.length === 0) return false;
        if (historyCategory === 'items' && day.wornItems.length === 0) return false;
        if (historyCategory === 'laundry' && day.washedItems.length === 0) return false;

        if (historySearch) {
          const s = historySearch.toLowerCase();
          const matchesOutfit = day.wornOutfits.some(o => o.name.toLowerCase().includes(s));
          const matchesItem = day.wornItems.some(i => i.name.toLowerCase().includes(s));
          const matchesWash = day.washedItems.some(i => i.name.toLowerCase().includes(s));
          const matchesDate = formatDateDisplay(day.dateObj).toLowerCase().includes(s);
          return matchesOutfit || matchesItem || matchesWash || matchesDate;
        }

        return true;
      });
  }, [outfits, items, plans, historyCategory, historySearch]);

  /* ── Handlers ── */
  const handleSaveWear = async (dateKey: string, outfitId?: string, itemIds?: string[]) => {
    const ts = dateKeyToTimestamp(dateKey);

    if (outfitId) {
      const outfit = outfits.find(o => o.id === outfitId);
      if (outfit) {
        const updatedLogs = [...(outfit.wearLogs || []), ts];
        await updateOutfit({ ...outfit, wearLogs: updatedLogs, lastWornAt: Math.max(outfit.lastWornAt || 0, ts) });

        for (const id of outfit.itemIds) {
          const item = items.find(i => i.id === id);
          if (item) {
            const itemLogs = [...(item.wearLogs || []), ts];
            await updateItem({ ...item, wearLogs: itemLogs, lastWornAt: Math.max(item.lastWornAt || 0, ts), status: 'dirty' });
          }
        }
        setToast(`✓ Logged wear for ${outfit.name}`);
      }
    } else if (itemIds && itemIds.length > 0) {
      for (const id of itemIds) {
        const item = items.find(i => i.id === id);
        if (item) {
          const itemLogs = [...(item.wearLogs || []), ts];
          await updateItem({ ...item, wearLogs: itemLogs, lastWornAt: Math.max(item.lastWornAt || 0, ts), status: 'dirty' });
        }
      }
      setToast(`✓ Logged wear for ${itemIds.length} item(s)`);
    }

    const matchingPlan = plans.find(p => p.date === dateKey && (p.outfitId === outfitId || p.itemIds.some(id => itemIds?.includes(id))));
    if (matchingPlan) {
      await deletePlan(matchingPlan.id);
    }
  };

  const handleSaveWash = async (dateKey: string, itemIds: string[]) => {
    const ts = dateKeyToTimestamp(dateKey);
    for (const id of itemIds) {
      const item = items.find(i => i.id === id);
      if (item) {
        const washLogs = [...(item.washLogs || []), ts];
        await updateItem({ ...item, washLogs, lastWashedAt: Math.max(item.lastWashedAt || 0, ts), status: 'ready' });
      }
    }
    setToast(`✓ Logged laundry for ${itemIds.length} item(s)`);
  };

  const handleMarkPlanWorn = async (plan: any) => {
    await handleSaveWear(plan.date, plan.outfitId, plan.itemIds);
  };

  const handleRemoveOutfitLog = async (outfit: Outfit, dateKey: string) => {
    const updatedOutfitLogs = (outfit.wearLogs || []).filter(ts => timestampToDateKey(ts) !== dateKey);
    const newOutfitLastWorn = updatedOutfitLogs.length > 0 ? Math.max(...updatedOutfitLogs) : undefined;

    await updateOutfit({
      ...outfit,
      wearLogs: updatedOutfitLogs,
      lastWornAt: newOutfitLastWorn
    });

    for (const itemId of outfit.itemIds) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        const updatedItemLogs = (item.wearLogs || []).filter(ts => timestampToDateKey(ts) !== dateKey);
        const newItemLastWorn = updatedItemLogs.length > 0 ? Math.max(...updatedItemLogs) : undefined;
        await updateItem({
          ...item,
          wearLogs: updatedItemLogs,
          lastWornAt: newItemLastWorn
        });
      }
    }

    setToast(`✓ Removed outfit log for ${dateKey}`);
  };

  const handleRemoveItemLog = async (item: ClothingItem, dateKey: string) => {
    const updatedItemLogs = (item.wearLogs || []).filter(ts => timestampToDateKey(ts) !== dateKey);
    const newItemLastWorn = updatedItemLogs.length > 0 ? Math.max(...updatedItemLogs) : undefined;

    await updateItem({
      ...item,
      wearLogs: updatedItemLogs,
      lastWornAt: newItemLastWorn
    });

    setToast(`✓ Removed item log for ${dateKey}`);
  };

  const handleRemoveWashLog = async (dateKey: string, washedItems: ClothingItem[]) => {
    for (const item of washedItems) {
      const updatedWashLogs = (item.washLogs || []).filter(ts => timestampToDateKey(ts) !== dateKey);
      const newLastWashedAt = updatedWashLogs.length > 0 ? Math.max(...updatedWashLogs) : undefined;
      await updateItem({
        ...item,
        washLogs: updatedWashLogs,
        lastWashedAt: newLastWashedAt
      });
    }
    setToast(`✓ Removed laundry log for ${dateKey}`);
  };

  const handleCancelPlan = async (planId: string) => {
    await deletePlan(planId);
    setToast('Plan cancelled');
  };

  /* ── Drag and Drop ── */
  const handleDragStart = useCallback((item: DragItem) => {
    setDraggedItem(item);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { over } = event;
    setDraggedItem(null);
    setDragOverDate(null);

    if (!over || !draggedItem) return;

    const targetDateKey = over.id as string;
    if (!targetDateKey || targetDateKey === draggedItem.dateKey) return;

    try {
      if (draggedItem.type === 'outfit') {
        const outfit = outfits.find(o => o.id === draggedItem.id);
        if (outfit) {
          const plan = createPlanFromOutfit(outfit.id, targetDateKey);
          plan.itemIds = outfit.itemIds;
          await addPlan(plan);
          setToast(`✓ Planned "${outfit.name}" for ${targetDateKey}`);
        }
      } else if (draggedItem.type === 'item') {
        const existingPlan = plans.find(p => p.date === targetDateKey && !p.outfitId);
        if (existingPlan) {
          const newItemIds = [...new Set([...existingPlan.itemIds, draggedItem.id])];
          await updatePlan({ ...existingPlan, itemIds: newItemIds });
        } else {
          const plan = createPlanFromItems([draggedItem.id], targetDateKey);
          await addPlan(plan);
        }
        const item = items.find(i => i.id === draggedItem.id);
        if (item) setToast(`✓ Added "${item.name}" to ${targetDateKey}`);
      }
    } catch (err) {
      console.error('Failed to plan outfit:', err);
      setToast('✗ Failed to plan outfit');
    }
  }, [draggedItem, outfits, items, plans, addPlan, updatePlan]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setDragOverDate(event.over ? (event.over.id as string) : null);
  }, []);

  const handleDragStartDnd = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragItem;
    if (data) setDraggedItem(data);
  }, []);

  const handleDayClick = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setIsDayModalOpen(true);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStartDnd}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="page-content animate-fade-in log-page-container">
        
        {/* Header & Main Controls */}
        <div className="log-view-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 className="section-title" style={{ fontSize: 22, fontWeight: 800 }}>
                Style Log & Calendar
              </h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Track daily wear, full monthly calendar & laundry history
              </p>
            </div>
            
            <button
              className="btn btn-primary"
              onClick={() => {
                setLogModalDateKey(formatDateKey(new Date()));
                setIsLogWearOpen(true);
              }}
              style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} />
              <span>+ Log Wear</span>
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="log-segmented-tabs">
            <button
              className={`log-seg-btn ${activeView === 'month' ? 'active' : ''}`}
              onClick={() => setActiveView('month')}
            >
              <CalendarIcon size={15} /> Month View
            </button>
            <button
              className={`log-seg-btn ${activeView === 'week' ? 'active' : ''}`}
              onClick={() => setActiveView('week')}
            >
              <Grid size={15} /> Week View
            </button>
            <button
              className={`log-seg-btn ${activeView === 'history' ? 'active' : ''}`}
              onClick={() => setActiveView('history')}
            >
              <History size={15} /> Style Feed
            </button>
            <button
              className={`log-seg-btn ${activeView === 'assign' ? 'active' : ''}`}
              onClick={() => setActiveView('assign')}
            >
              <Sparkles size={15} /> Drag & Plan
            </button>
          </div>

          {/* Stat Cards */}
          <div className="log-stat-grid">
            <div className="log-stat-box">
              <div className="log-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <Shirt size={20} />
              </div>
              <div className="log-stat-info">
                <span className="log-stat-val">{logStats.totalWears}</span>
                <span className="log-stat-lbl">Total Wears</span>
              </div>
            </div>
            <div className="log-stat-box">
              <div className="log-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                <Sparkles size={20} />
              </div>
              <div className="log-stat-info">
                <span className="log-stat-val">{logStats.outfitWears}</span>
                <span className="log-stat-lbl">Outfit Wears</span>
              </div>
            </div>
            <div className="log-stat-box">
              <div className="log-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <WashingMachine size={20} />
              </div>
              <div className="log-stat-info">
                <span className="log-stat-val">{logStats.washCount}</span>
                <span className="log-stat-lbl">Laundry Cycles</span>
              </div>
            </div>
          </div>
        </div>

        {/* VIEW 1: FULL MONTH CALENDAR GRID */}
        {activeView === 'month' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setCurrentMonthState(getPreviousMonth(currentMonthState.year, currentMonthState.month))}
                  style={{ padding: 6 }}
                >
                  <ChevronLeft size={18} />
                </button>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {calendarMonth.label}
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() => setCurrentMonthState(getNextMonth(currentMonthState.year, currentMonthState.month))}
                  style={{ padding: 6 }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <button
                className="btn btn-ghost"
                onClick={() => {
                  const today = new Date();
                  setCurrentMonthState({ year: today.getFullYear(), month: today.getMonth() });
                }}
                style={{ fontSize: 12, padding: '4px 10px' }}
              >
                Today
              </button>
            </div>

            {/* Weekday Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
              {WEEKDAYS.map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Month Grid Cells */}
            <div className="log-month-grid">
              {calendarMonth.days.map(day => (
                <MonthDayCell key={day.dateKey} day={day} onClick={handleDayClick} />
              ))}
            </div>
          </div>
        )}

        {/* VIEW 2: WEEKLY CALENDAR GRID */}
        {activeView === 'week' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setCurrentWeek(getPreviousWeek(currentWeek))} style={{ padding: 6 }}>
                  <ChevronLeft size={18} />
                </button>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {getWeekLabel(calendarWeek)}
                </span>
                <button className="btn btn-ghost" onClick={() => setCurrentWeek(getNextWeek(currentWeek))} style={{ padding: 6 }}>
                  <ChevronRight size={18} />
                </button>
              </div>

              <button className="btn btn-ghost" onClick={() => setCurrentWeek(getCurrentWeek())} style={{ fontSize: 12, padding: '4px 10px' }}>
                This Week
              </button>
            </div>

            <div className="log-calendar-grid">
              {calendarWeek.days.map(day => (
                <WeekDayCell
                  key={day.dateKey}
                  day={day}
                  onClick={handleDayClick}
                  isDragOver={dragOverDate === day.dateKey}
                />
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: STYLE LOG HISTORY FEED */}
        {activeView === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search wear history & laundry..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="log-search-input"
                />
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 10 }} />
              </div>

              <select
                value={historyCategory}
                onChange={e => setHistoryCategory(e.target.value as any)}
                style={{
                  padding: '8px 14px',
                  fontSize: 13,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-pill)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="all">All Logs</option>
                <option value="outfits">Outfits Worn</option>
                <option value="items">Items Worn</option>
                <option value="laundry">Laundry Washes</option>
              </select>
            </div>

            {historyFeed.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 14 }}>No style log history found matching your filter.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {historyFeed.map(day => (
                  <div key={day.dateKey} className="log-history-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {formatDateDisplay(day.dateObj)}
                      </span>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 11, padding: '2px 8px' }}
                        onClick={() => handleDayClick(day.dateKey)}
                      >
                        Inspect Day
                      </button>
                    </div>

                    {day.wornOutfits.map(outfit => (
                      <div key={outfit.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--bg-2)', borderRadius: 'var(--radius-md)' }}>
                        <Sparkles size={16} color="#10b981" />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>Outfit: {outfit.name}</span>
                        </div>
                        <span className="log-badge log-badge--worn">Worn</span>
                      </div>
                    ))}

                    {day.wornItems.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                        {day.wornItems.map(item => (
                          <div key={item.id} style={{ width: 48, flexShrink: 0, textAlign: 'center' }}>
                            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden' }}>
                              <ResolvedImage src={item.images?.[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} fallback={<CategoryIcon category={item.category} size={18} />} />
                            </div>
                            <div style={{ fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{item.name}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {day.washedItems.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'rgba(59, 130, 246, 0.08)', borderRadius: 'var(--radius-md)' }}>
                        <WashingMachine size={16} color="#3b82f6" />
                        <div style={{ flex: 1, fontSize: 12 }}>
                          Washed {day.washedItems.length} item(s) ({day.washedItems.map(i => i.name).join(', ')})
                        </div>
                        <span className="log-badge log-badge--washed">Cleaned</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: QUICK DRAG & PLAN */}
        {activeView === 'assign' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
                Drag Outfits to Calendar
              </h3>
              <SortableContext items={outfits.map(o => o.id)} strategy={verticalListSortingStrategy}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                  {outfits.map(outfit => (
                    <DraggableOutfit key={outfit.id} outfit={outfit} onDragStart={handleDragStart} />
                  ))}
                </div>
              </SortableContext>
            </div>

            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
                Drag Items to Calendar
              </h3>
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {items.map(item => (
                    <DraggableItem key={item.id} item={item} onDragStart={handleDragStart} />
                  ))}
                </div>
              </SortableContext>
            </div>
          </div>
        )}

        {/* Modals */}
        {selectedDateKey && (
          <DayDetailModal
            dateKey={selectedDateKey}
            isOpen={isDayModalOpen}
            onClose={() => setIsDayModalOpen(false)}
            plans={plans}
            outfits={outfits}
            items={items}
            onMarkPlanWorn={handleMarkPlanWorn}
            onRemoveOutfitLog={handleRemoveOutfitLog}
            onRemoveItemLog={handleRemoveItemLog}
            onRemoveWashLog={handleRemoveWashLog}
            onCancelPlan={handleCancelPlan}
            onOpenLogWear={(dk) => {
              setLogModalDateKey(dk);
              setIsLogWearOpen(true);
            }}
            onOpenLogWash={(dk) => {
              setLogModalDateKey(dk);
              setIsLogWashOpen(true);
            }}
          />
        )}

        <LogWearModal
          isOpen={isLogWearOpen}
          onClose={() => setIsLogWearOpen(false)}
          initialDateKey={logModalDateKey}
          outfits={outfits}
          items={items}
          onSaveWear={handleSaveWear}
        />

        <LogLaundryModal
          isOpen={isLogWashOpen}
          onClose={() => setIsLogWashOpen(false)}
          initialDateKey={logModalDateKey}
          items={items}
          onSaveWash={handleSaveWash}
        />

        {toast && <Toast message={toast} onDone={() => setToast('')} />}
      </div>
    </DndContext>
  );
}