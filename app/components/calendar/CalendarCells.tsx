'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ClothingItem, Outfit, PlannedOutfit } from '../../lib/types';
import { ResolvedImage } from '../ResolvedImage';
import {
  CalendarDay,
  getDayAbbreviation,
} from '../../lib/domain/calendar';
import {
  Sparkles,
  Shirt,
  WashingMachine,
  Calendar as CalendarIcon,
  CategoryIcon,
  Plus,
  CheckCircle2,
  GripVertical,
} from '../AppIcon';

/* ─── Item Avatar Stack Helper ─── */
export function ItemAvatarStack({ itemIds, items, max = 3 }: { itemIds: string[]; items: ClothingItem[]; max?: number }) {
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

/* ─── Draggable Outfit Component ─── */
interface DraggableOutfitProps {
  outfit: Outfit;
  items?: ClothingItem[];
}

export function DraggableOutfit({ outfit, items = [] }: DraggableOutfitProps) {
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

export function DraggableItem({ item }: DraggableItemProps) {
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

export function MonthDayCell({ day, onClick, isDragOver }: MonthDayCellProps) {
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
          {day.plannedOutfits.length} PlannedOutfit
        </div>
      ) : null}
    </div>
  );
}

/* ─── Week Day Cell Component (Droppable) ─── */
interface WeekDayCellProps {
  day: CalendarDay;
  items: ClothingItem[];
  outfits: Outfit[];
  onClick: (dateKey: string) => void;
  onMarkPlanWorn?: (plan: PlannedOutfit) => void;
  isDragOver?: boolean;
}

export function WeekDayCell({ day, items, outfits, onClick, onMarkPlanWorn, isDragOver }: WeekDayCellProps) {
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
            <span>Drop to PlannedOutfit</span>
          </div>
        ) : day.totalLogsCount === 0 ? (
          <div className="week-empty-cell">
            <Plus size={14} className="week-empty-icon" />
            <span>Log / PlannedOutfit</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
