'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useOutfits } from '../contexts/OutfitContext';
import { ClothingItem, Outfit, Category } from '../lib/types';
import Toast from './Toast';
import LogWearModal from './LogWearModal';
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
  GripVertical,
} from './AppIcon';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from '@dnd-kit/core';

/* ─── Draggable Outfit Component ─── */
interface DraggableOutfitProps {
  outfit: Outfit;
  items?: ClothingItem[];
}

function DraggableOutfit({ outfit, items = [] }: DraggableOutfitProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `outfit-${outfit.id}`,
    data: { type: 'outfit', id: outfit.id, outfit },
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.35 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none',
  };

  const outfitItems = outfit.itemIds.map(id => items.find(i => i.id === id)).filter(Boolean) as ClothingItem[];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`draggable-outfit-card ${isDragging ? 'is-dragging' : ''}`}
      title={`Drag "${outfit.name}" to any calendar day`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <div className="draggable-handle">
          <GripVertical size={16} />
        </div>
        <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'rgba(139, 92, 246, 0.14)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Sparkles size={16} color="#8b5cf6" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {outfit.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {outfit.itemIds.length} item{outfit.itemIds.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      {outfitItems.length > 0 && (
        <ItemAvatarStack itemIds={outfit.itemIds} items={items} max={3} />
      )}
    </div>
  );
}

/* ─── Draggable Item Component ─── */
interface DraggableItemProps {
  item: ClothingItem;
}

function DraggableItem({ item }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `item-${item.id}`,
    data: { type: 'item', id: item.id, item },
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.35 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`draggable-item-chip ${isDragging ? 'is-dragging' : ''}`}
      title={`Drag "${item.name}" to any calendar day`}
    >
      <div className="draggable-handle">
        <GripVertical size={14} />
      </div>
      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden', flexShrink: 0 }}>
        <ResolvedImage
          src={item.images && item.images[0]}
          alt={item.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          fallback={
            <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
              <CategoryIcon category={item.category} size={16} />
            </div>
          }
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.name}
        </div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
          {item.category}
        </div>
      </div>
    </div>
  );
}

/* ─── Month Day Cell Component (Droppable) ─── */
interface MonthDayCellProps {
  day: CalendarDay;
  onClick: (dateKey: string) => void;
  isDragOver?: boolean;
}

function MonthDayCell({ day, onClick, isDragOver }: MonthDayCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: day.dateKey,
    data: { dateKey: day.dateKey },
  });

  const activeOver = isDragOver || isOver;
  const wornCount = day.wornOutfits.length + day.wornItems.length;
  const plannedCount = day.plannedOutfits.length;
  const washedCount = day.washedItems.length;

  return (
    <div
      ref={setNodeRef}
      onClick={() => onClick(day.dateKey)}
      className={`log-month-cell ${!day.isCurrentMonth ? 'is-other-month' : ''} ${day.isToday ? 'is-today' : ''} ${activeOver ? 'drag-over' : ''}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: 12,
          fontWeight: day.isToday ? 800 : 600,
          color: day.isToday ? 'var(--accent)' : (day.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)'),
        }}>
          {day.date.getDate()}
        </span>
        {activeOver && (
          <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--accent)', background: 'rgba(59, 130, 246, 0.2)', padding: '1px 4px', borderRadius: 4 }}>
            Drop
          </span>
        )}
      </div>

      <div className="log-month-dots">
        {wornCount > 0 && <div className="log-dot log-dot--worn" title={`${wornCount} worn`} />}
        {plannedCount > 0 && <div className="log-dot log-dot--planned" title={`${plannedCount} planned`} />}
        {washedCount > 0 && <div className="log-dot log-dot--washed" title={`${washedCount} washed`} />}
      </div>

      {wornCount > 0 ? (
        <div style={{ fontSize: 9, fontWeight: 700, color: '#10b981', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {day.wornOutfits[0]?.name || `${wornCount} Worn`}
        </div>
      ) : plannedCount > 0 ? (
        <div style={{ fontSize: 9, fontWeight: 700, color: '#8b5cf6', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {day.plannedOutfits.length} Plan
        </div>
      ) : null}
    </div>
  );
}

/* ─── Item Avatar Stack Helper ─── */
function ItemAvatarStack({ itemIds, items, max = 3 }: { itemIds: string[]; items: ClothingItem[]; max?: number }) {
  const matchedItems = itemIds.map(id => items.find(i => i.id === id)).filter(Boolean) as ClothingItem[];
  const displayItems = matchedItems.slice(0, max);
  const remaining = matchedItems.length - max;

  if (displayItems.length === 0) return null;

  return (
    <div className="week-avatar-stack">
      {displayItems.map(item => {
        const hasImg = item.images && item.images.length > 0;
        return (
          <div key={item.id} className="week-avatar-item" title={item.name}>
            {hasImg ? (
              <ResolvedImage src={item.images[0]} alt={item.name} />
            ) : (
              <div className="week-avatar-fallback">
                <CategoryIcon category={item.category} size={11} />
              </div>
            )}
          </div>
        );
      })}
      {remaining > 0 && (
        <div className="week-avatar-more">+{remaining}</div>
      )}
    </div>
  );
}

/* ─── Week Day Cell Component (Droppable) ─── */
interface WeekDayCellProps {
  day: CalendarDay;
  items: ClothingItem[];
  outfits: Outfit[];
  onClick: (dateKey: string) => void;
  onMarkPlanWorn?: (plan: any) => void;
  isDragOver?: boolean;
}

function WeekDayCell({ day, items, outfits, onClick, onMarkPlanWorn, isDragOver }: WeekDayCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: day.dateKey,
    data: { dateKey: day.dateKey },
  });

  const activeOver = isDragOver || isOver;
  const isToday = day.isToday;

  return (
    <div
      ref={setNodeRef}
      onClick={() => onClick(day.dateKey)}
      className={`log-week-card ${isToday ? 'is-today' : ''} ${activeOver ? 'drag-over' : ''}`}
    >
      {/* Card Header */}
      <div className="log-week-card__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={`log-week-card__dayname ${isToday ? 'is-today' : ''}`}>
            {getDayAbbreviation(day.date)}
          </span>
          {isToday && <span className="log-today-pill">TODAY</span>}
        </div>
        <span className={`log-week-card__datenumber ${isToday ? 'is-today' : ''}`}>
          {day.date.getDate()}
        </span>
      </div>

      {/* Card Body */}
      <div className="log-week-card__body">
        {/* Worn Outfits */}
        {day.wornOutfits.map(outfit => (
          <div key={outfit.id} className="week-log-item week-log-item--worn">
            <div className="week-log-item__header">
              <span className="week-log-item__badge worn">
                <Sparkles size={10} /> Worn
              </span>
              <span className="week-log-item__title">{outfit.name}</span>
            </div>
            <ItemAvatarStack itemIds={outfit.itemIds} items={items} max={3} />
          </div>
        ))}

        {/* Worn Items */}
        {day.wornItems.length > 0 && day.wornOutfits.length === 0 && (
          <div className="week-log-item week-log-item--worn">
            <div className="week-log-item__header">
              <span className="week-log-item__badge worn">
                <Shirt size={10} /> {day.wornItems.length} Worn
              </span>
            </div>
            <div className="week-log-items-grid">
              {day.wornItems.slice(0, 3).map(item => (
                <div key={item.id} className="week-item-chip" title={item.name}>
                  {item.images && item.images.length > 0 ? (
                    <ResolvedImage src={item.images[0]} alt={item.name} className="week-chip-img" />
                  ) : (
                    <CategoryIcon category={item.category} size={10} />
                  )}
                  <span className="week-chip-name">{item.name}</span>
                </div>
              ))}
              {day.wornItems.length > 3 && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{day.wornItems.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {/* Planned Outfits */}
        {day.plannedOutfits.map(plan => {
          const outfit = outfits.find(o => o.id === plan.outfitId);
          const name = outfit ? outfit.name : `${plan.itemIds.length} items planned`;
          const itemIds = plan.outfitId && outfit ? outfit.itemIds : plan.itemIds;
          return (
            <div key={plan.id} className="week-log-item week-log-item--planned" onClick={e => e.stopPropagation()}>
              <div className="week-log-item__header">
                <span className="week-log-item__badge planned">
                  <CalendarIcon size={10} /> Planned
                </span>
                <span className="week-log-item__title">{name}</span>
              </div>
              <ItemAvatarStack itemIds={itemIds} items={items} max={3} />
              {onMarkPlanWorn && (
                <button
                  className="btn btn-primary week-plan-wear-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkPlanWorn(plan);
                  }}
                >
                  <CheckCircle2 size={11} /> Mark Worn
                </button>
              )}
            </div>
          );
        })}

        {/* Washed Items */}
        {day.washedItems.length > 0 && (
          <div className="week-log-item week-log-item--washed">
            <span className="week-log-item__badge washed">
              <WashingMachine size={10} /> {day.washedItems.length} Washed
            </span>
          </div>
        )}

        {/* Droppable feedback or Empty State */}
        {activeOver ? (
          <div className="week-drop-invitation">
            <Sparkles size={16} />
            <span>Drop to Plan</span>
          </div>
        ) : day.totalLogsCount === 0 ? (
          <div className="week-empty-cell">
            <Plus size={14} className="week-empty-icon" />
            <span>Log / Plan</span>
          </div>
        ) : null}
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
  const { outfits, plans, updateOutfit, deletePlan, updatePlan, addPlan } = useOutfits();

  const [activeView, setActiveView] = useState<'month' | 'week' | 'history' | 'assign'>('assign');
  const [plannerSubView, setPlannerSubView] = useState<'week' | 'month'>('week');
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

  // Drag & Plan Tray State
  const [dragSearch, setDragSearch] = useState('');
  const [dragFilterCategory, setDragFilterCategory] = useState<'all' | 'outfits' | Category>('all');

  // Drag state
  const [draggedItem, setDraggedItem] = useState<{ type: 'outfit' | 'item'; id: string } | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 6,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 150,
      tolerance: 5,
    },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  /* ── Month & Week Data ── */
  const calendarMonth = useMemo(() => 
    getCalendarMonth(currentMonthState.year, currentMonthState.month, plans, outfits, items),
    [currentMonthState, plans, outfits, items]
  );

  const calendarWeek = useMemo(() => 
    getCalendarWeek(currentWeek, plans, outfits, items),
    [currentWeek, plans, outfits, items]
  );

  const weekStats = useMemo(() => {
    let totalWorn = 0;
    let totalPlanned = 0;
    let totalWashed = 0;

    for (const day of calendarWeek.days) {
      totalWorn += day.wornOutfits.length + day.wornItems.length;
      totalPlanned += day.plannedOutfits.length;
      totalWashed += day.washedItems.length;
    }

    return { totalWorn, totalPlanned, totalWashed };
  }, [calendarWeek]);

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

  /* ── Filtered Outfits & Items for Drag & Plan ── */
  const filteredOutfits = useMemo(() => {
    if (dragFilterCategory !== 'all' && dragFilterCategory !== 'outfits') return [];
    if (!dragSearch.trim()) return outfits;
    const q = dragSearch.toLowerCase();
    return outfits.filter(o => o.name.toLowerCase().includes(q));
  }, [outfits, dragFilterCategory, dragSearch]);

  const filteredItems = useMemo(() => {
    if (dragFilterCategory === 'outfits') return [];
    let list = items;
    if (dragFilterCategory !== 'all') {
      list = list.filter(i => i.category === dragFilterCategory);
    }
    if (dragSearch.trim()) {
      const q = dragSearch.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    return list;
  }, [items, dragFilterCategory, dragSearch]);

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
        const existingLogs = outfit.wearLogs || (outfit.lastWornAt ? [outfit.lastWornAt] : []);
        const hasLogForDate = existingLogs.some(logTs => timestampToDateKey(logTs) === dateKey);
        const updatedLogs = hasLogForDate ? existingLogs : [...existingLogs, ts];
        const newLastWorn = Math.max(...updatedLogs, outfit.lastWornAt || 0);
        await updateOutfit({ ...outfit, wearLogs: updatedLogs, lastWornAt: newLastWorn });

        for (const id of outfit.itemIds) {
          const item = items.find(i => i.id === id);
          if (item) {
            const existingItemLogs = item.wearLogs || (item.lastWornAt ? [item.lastWornAt] : []);
            const hasItemLog = existingItemLogs.some(logTs => timestampToDateKey(logTs) === dateKey);
            const itemLogs = hasItemLog ? existingItemLogs : [...existingItemLogs, ts];
            const newItemLastWorn = Math.max(...itemLogs, item.lastWornAt || 0);
            await updateItem({ ...item, wearLogs: itemLogs, lastWornAt: newItemLastWorn, status: 'dirty' });
          }
        }
        setToast(`✓ Logged wear for ${outfit.name}`);
      }
    } else if (itemIds && itemIds.length > 0) {
      for (const id of itemIds) {
        const item = items.find(i => i.id === id);
        if (item) {
          const existingItemLogs = item.wearLogs || (item.lastWornAt ? [item.lastWornAt] : []);
          const hasItemLog = existingItemLogs.some(logTs => timestampToDateKey(logTs) === dateKey);
          const itemLogs = hasItemLog ? existingItemLogs : [...existingItemLogs, ts];
          const newItemLastWorn = Math.max(...itemLogs, item.lastWornAt || 0);
          await updateItem({ ...item, wearLogs: itemLogs, lastWornAt: newItemLastWorn, status: 'dirty' });
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
        const existingWashLogs = item.washLogs || (item.lastWashedAt ? [item.lastWashedAt] : []);
        const hasWashLog = existingWashLogs.some(logTs => timestampToDateKey(logTs) === dateKey);
        const washLogs = hasWashLog ? existingWashLogs : [...existingWashLogs, ts];
        const newLastWashed = Math.max(...washLogs, item.lastWashedAt || 0);
        await updateItem({ ...item, washLogs, lastWashedAt: newLastWashed, status: 'ready' });
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

  /* ── Drag and Drop Handlers ── */
  const handleDragStartDnd = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as { type: 'outfit' | 'item'; id: string } | undefined;
    if (data) {
      setDraggedItem(data);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setDragOverDate(event.over ? (event.over.id as string) : null);
  }, []);

  const handleDragCancel = useCallback(() => {
    setDraggedItem(null);
    setDragOverDate(null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);
    setDragOverDate(null);

    if (!over) return;

    const targetDateKey = over.id as string;
    const dragData = (active.data?.current || draggedItem) as { type: 'outfit' | 'item'; id: string } | undefined;
    if (!dragData || !targetDateKey) return;

    try {
      if (dragData.type === 'outfit') {
        const outfit = outfits.find(o => o.id === dragData.id);
        if (outfit) {
          const plan = createPlanFromOutfit(outfit.id, targetDateKey);
          plan.itemIds = outfit.itemIds;
          await addPlan(plan);
          setToast(`✓ Planned "${outfit.name}" for ${formatDateDisplay(new Date(targetDateKey + 'T12:00:00'))}`);
        }
      } else if (dragData.type === 'item') {
        const existingPlan = plans.find(p => p.date === targetDateKey && !p.outfitId);
        if (existingPlan) {
          const newItemIds = [...new Set([...existingPlan.itemIds, dragData.id])];
          await updatePlan({ ...existingPlan, itemIds: newItemIds });
        } else {
          const plan = createPlanFromItems([dragData.id], targetDateKey);
          await addPlan(plan);
        }
        const item = items.find(i => i.id === dragData.id);
        if (item) setToast(`✓ Added "${item.name}" to ${formatDateDisplay(new Date(targetDateKey + 'T12:00:00'))}`);
      }
    } catch (err) {
      console.error('Failed to plan outfit:', err);
      setToast('✗ Failed to plan outfit');
    }
  }, [draggedItem, outfits, items, plans, addPlan, updatePlan]);

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
      onDragCancel={handleDragCancel}
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
                Schedule looks, track daily wear, monthly calendar & laundry
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
              className={`log-seg-btn ${activeView === 'assign' ? 'active' : ''}`}
              onClick={() => setActiveView('assign')}
            >
              <Sparkles size={15} /> Drag & Plan
            </button>
            <button
              className={`log-seg-btn ${activeView === 'week' ? 'active' : ''}`}
              onClick={() => setActiveView('week')}
            >
              <Grid size={15} /> Week View
            </button>
            <button
              className={`log-seg-btn ${activeView === 'month' ? 'active' : ''}`}
              onClick={() => setActiveView('month')}
            >
              <CalendarIcon size={15} /> Month View
            </button>
            <button
              className={`log-seg-btn ${activeView === 'history' ? 'active' : ''}`}
              onClick={() => setActiveView('history')}
            >
              <History size={15} /> Style Feed
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

        {/* VIEW: DRAG & PLAN STUDIO */}
        {activeView === 'assign' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            
            {/* Quick Helper Tip */}
            <div className="drag-plan-tip">
              <Sparkles size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
              <div>
                <strong>Interactive Planner:</strong> Drag any outfit or wardrobe item from below directly onto a calendar day above to schedule it.
              </div>
            </div>

            {/* Target Calendar Area with Sub-View Switcher */}
            <div className="log-week-container">
              <div className="log-week-header-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {plannerSubView === 'week' ? (
                    <>
                      <button className="btn btn-ghost" onClick={() => setCurrentWeek(getPreviousWeek(currentWeek))} style={{ padding: 6 }}>
                        <ChevronLeft size={18} />
                      </button>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {getWeekLabel(calendarWeek)}
                      </span>
                      <button className="btn btn-ghost" onClick={() => setCurrentWeek(getNextWeek(currentWeek))} style={{ padding: 6 }}>
                        <ChevronRight size={18} />
                      </button>
                      <button className="btn btn-ghost" onClick={() => setCurrentWeek(getCurrentWeek())} style={{ fontSize: 12, padding: '4px 10px', marginLeft: 4 }}>
                        This Week
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-ghost" onClick={() => setCurrentMonthState(getPreviousMonth(currentMonthState.year, currentMonthState.month))} style={{ padding: 6 }}>
                        <ChevronLeft size={18} />
                      </button>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {calendarMonth.label}
                      </span>
                      <button className="btn btn-ghost" onClick={() => setCurrentMonthState(getNextMonth(currentMonthState.year, currentMonthState.month))} style={{ padding: 6 }}>
                        <ChevronRight size={18} />
                      </button>
                      <button className="btn btn-ghost" onClick={() => {
                        const today = new Date();
                        setCurrentMonthState({ year: today.getFullYear(), month: today.getMonth() });
                      }} style={{ fontSize: 12, padding: '4px 10px', marginLeft: 4 }}>
                        Today
                      </button>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className={`btn ${plannerSubView === 'week' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setPlannerSubView('week')}
                    style={{ fontSize: 12, padding: '4px 10px' }}
                  >
                    Week Grid
                  </button>
                  <button
                    className={`btn ${plannerSubView === 'month' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setPlannerSubView('month')}
                    style={{ fontSize: 12, padding: '4px 10px' }}
                  >
                    Month Grid
                  </button>
                </div>
              </div>

              {plannerSubView === 'week' ? (
                <div className="log-week-grid">
                  {calendarWeek.days.map(day => (
                    <WeekDayCell
                      key={day.dateKey}
                      day={day}
                      items={items}
                      outfits={outfits}
                      onClick={handleDayClick}
                      onMarkPlanWorn={handleMarkPlanWorn}
                      isDragOver={dragOverDate === day.dateKey}
                    />
                  ))}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
                    {WEEKDAYS.map((d) => (
                      <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="log-month-grid">
                    {calendarMonth.days.map(day => (
                      <MonthDayCell
                        key={day.dateKey}
                        day={day}
                        onClick={handleDayClick}
                        isDragOver={dragOverDate === day.dateKey}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Draggable Outfits & Wardrobe Palette Drawer */}
            <div className="drag-plan-palette-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GripVertical size={16} color="var(--accent)" />
                    Wardrobe & Outfits Palette
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Grab and drag onto any date above
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {/* Search Bar */}
                  <div style={{ position: 'relative', minWidth: 160 }}>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={dragSearch}
                      onChange={e => setDragSearch(e.target.value)}
                      style={{
                        padding: '6px 12px 6px 30px',
                        fontSize: 12,
                        background: 'var(--bg-3)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-pill)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        width: '100%',
                      }}
                    />
                    <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 8 }} />
                  </div>

                  {/* Filter Selector */}
                  <select
                    value={dragFilterCategory}
                    onChange={e => setDragFilterCategory(e.target.value as any)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      background: 'var(--bg-3)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-pill)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="all">All Outfits & Items</option>
                    <option value="outfits">Outfits Only ({outfits.length})</option>
                    <option value="top">Tops</option>
                    <option value="bottom">Bottoms</option>
                    <option value="shoes">Shoes</option>
                    <option value="outerwear">Outerwear</option>
                    <option value="accessory">Accessories</option>
                    <option value="bag">Bags</option>
                    <option value="underwear">Underwear</option>
                  </select>
                </div>
              </div>

              {/* Section 1: Draggable Outfits */}
              {(dragFilterCategory === 'all' || dragFilterCategory === 'outfits') && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Outfits ({filteredOutfits.length})
                    </span>
                  </div>

                  {filteredOutfits.length === 0 ? (
                    <div style={{ padding: '16px', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                      {outfits.length === 0 ? 'No outfits created yet. Create outfits in the Outfits tab to drag and plan them here.' : 'No outfits match your search.'}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                      {filteredOutfits.map(outfit => (
                        <DraggableOutfit key={outfit.id} outfit={outfit} items={items} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Section 2: Draggable Wardrobe Items */}
              {dragFilterCategory !== 'outfits' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Single Clothing Items ({filteredItems.length})
                    </span>
                  </div>

                  {filteredItems.length === 0 ? (
                    <div style={{ padding: '16px', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                      No items found.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                      {filteredItems.map(item => (
                        <DraggableItem key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

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
                <MonthDayCell
                  key={day.dateKey}
                  day={day}
                  onClick={handleDayClick}
                  isDragOver={dragOverDate === day.dateKey}
                />
              ))}
            </div>
          </div>
        )}

        {/* VIEW 2: WEEKLY CALENDAR GRID */}
        {activeView === 'week' && (
          <div className="log-week-container">
            {/* Navigation & Stats Header */}
            <div className="log-week-header-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setCurrentWeek(getPreviousWeek(currentWeek))} style={{ padding: 6 }}>
                  <ChevronLeft size={18} />
                </button>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {getWeekLabel(calendarWeek)}
                </span>
                <button className="btn btn-ghost" onClick={() => setCurrentWeek(getNextWeek(currentWeek))} style={{ padding: 6 }}>
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="log-week-stats-bar">
                {weekStats.totalWorn > 0 && (
                  <span className="log-week-stat-chip worn">
                    <Sparkles size={12} /> {weekStats.totalWorn} Worn
                  </span>
                )}
                {weekStats.totalPlanned > 0 && (
                  <span className="log-week-stat-chip planned">
                    <CalendarIcon size={12} /> {weekStats.totalPlanned} Planned
                  </span>
                )}
                {weekStats.totalWashed > 0 && (
                  <span className="log-week-stat-chip washed">
                    <WashingMachine size={12} /> {weekStats.totalWashed} Washed
                  </span>
                )}

                <button className="btn btn-ghost" onClick={() => setCurrentWeek(getCurrentWeek())} style={{ fontSize: 12, padding: '4px 10px', marginLeft: 4 }}>
                  This Week
                </button>
              </div>
            </div>

            {/* 7-Day Card Grid */}
            <div className="log-week-grid">
              {calendarWeek.days.map(day => (
                <WeekDayCell
                  key={day.dateKey}
                  day={day}
                  items={items}
                  outfits={outfits}
                  onClick={handleDayClick}
                  onMarkPlanWorn={handleMarkPlanWorn}
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

        {/* Floating Drag Overlay */}
        <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {draggedItem ? (
            draggedItem.type === 'outfit' ? (
              (() => {
                const outfit = outfits.find(o => o.id === draggedItem.id);
                if (!outfit) return null;
                return (
                  <div className="draggable-outfit-card dragging-overlay">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: '#8b5cf6', display: 'grid', placeItems: 'center', color: '#fff' }}>
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{outfit.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{outfit.itemIds.length} items • Drop on a day</div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              (() => {
                const item = items.find(i => i.id === draggedItem.id);
                if (!item) return null;
                return (
                  <div className="draggable-item-chip dragging-overlay">
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden' }}>
                      <ResolvedImage src={item.images?.[0]} alt={item.name} fallback={<CategoryIcon category={item.category} size={16} />} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{item.name}</div>
                      <div style={{ fontSize: 9, color: 'var(--accent)' }}>Drop on a day to plan</div>
                    </div>
                  </div>
                );
              })()
            )
          ) : null}
        </DragOverlay>

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