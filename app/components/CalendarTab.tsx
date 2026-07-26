'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useOutfits } from '../contexts/OutfitContext';
import { ClothingItem, Outfit, PlannedOutfit, CATEGORIES } from '../lib/types';
import ItemDetailModal from './ItemDetailModal';
import OutfitDetailModal from './OutfitDetailModal';
import OutfitBuilderModal from './OutfitBuilderModal';
import Toast from './Toast';
import { 
  getCalendarWeek, 
  formatDateKey, 
  formatDateDisplay, 
  getDayAbbreviation, 
  getWeekLabel,
  getPreviousWeek,
  getNextWeek,
  getCurrentWeek,
  WEEKDAYS,
  CalendarWeek,
  CalendarDay,
  DragItem,
  createPlanFromOutfit,
  createPlanFromItems,
} from '../lib/domain/calendar';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
        if (e.button === 0) {
          onDragStart({ type: 'outfit', id: outfit.id, dateKey });
        }
      }}
      onTouchStart={(e) => {
        onDragStart({ type: 'outfit', id: outfit.id, dateKey });
      }}
    >
      <div {...attributes} {...listeners} style={{ padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>👗</span>
        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{outfit.name}</span>
        {dateKey && <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-3)', padding: '1px 6px', borderRadius: 4 }}>Planned: {dateKey}</span>}
      </div>
    </div>
  );
}

interface DraggableItemProps {
  item: ClothingItem;
  dateKey?: string;
  onDragStart: (item: DragItem) => void;
}

function DraggableItem({ item, dateKey, onDragStart }: DraggableItemProps) {
  const cat = CATEGORIES.find(c => c.value === item.category);
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
        if (e.button === 0) {
          onDragStart({ type: 'item', id: item.id, dateKey });
        }
      }}
      onTouchStart={(e) => {
        onDragStart({ type: 'item', id: item.id, dateKey });
      }}
    >
      <div {...attributes} {...listeners} style={{ width: 60, height: 60, borderRadius: 'var(--radius-md)', background: 'var(--bg-3)', overflow: 'hidden', marginBottom: 4, border: '1px solid var(--border)' }}>
        {item.images && item.images.length > 0 ? (
          <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', fontSize: 24 }}>{cat?.emoji}</div>
        )}
      </div>
      <div style={{ fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', width: 60 }}>{item.name}</div>
    </div>
  );
}

interface CalendarDayCellProps {
  day: CalendarDay;
  onDrop: (dateKey: string, item: DragItem) => void;
  onClick: (dateKey: string) => void;
  isDragOver: boolean;
}

function CalendarDayCell({ day, onDrop, onClick, isDragOver }: CalendarDayCellProps) {
  const isToday = day.isToday;
  const isPast = day.isPast;
  const isFuture = day.isFuture;
  
  const handleClick = () => onClick(day.dateKey);
  
  return (
    <div
      onClick={handleClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        // Handled by dnd-kit
      }}
      style={{
        flex: 1,
        minHeight: 120,
        maxHeight: 200,
        border: `1px solid ${isDragOver ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        background: isDragOver ? 'rgba(59, 130, 246, 0.05)' : (isToday ? 'rgba(59, 130, 246, 0.08)' : 'var(--surface)'),
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      data-date={day.dateKey}
      data-drag-over={isDragOver}
    >
      {/* Day header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 4,
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: isToday ? 'var(--accent)' : (isPast ? 'var(--text-muted)' : 'var(--text-primary)'),
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          {getDayAbbreviation(day.date)}
        </span>
        <span style={{
          fontSize: 14,
          fontWeight: isToday ? 700 : 500,
          color: isToday ? 'var(--accent)' : (isPast ? 'var(--text-muted)' : 'var(--text-primary)'),
        }}>
          {day.date.getDate()}
        </span>
      </div>
      
      {/* Planned outfits/items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflow: 'auto' }}>
        {day.plannedOutfits.length === 0 && day.itemCount === 0 && (
          <div style={{ 
            flex: 1, 
            display: 'grid', 
            placeItems: 'center', 
            color: 'var(--text-muted)', 
            fontSize: 11,
            padding: '16px 8px',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-sm)',
            textAlign: 'center',
          }}>
            {isPast ? '📭 No plans' : '+ Plan outfit'}
          </div>
        )}
        
        {day.plannedOutfits.map((plan) => (
          <div
            key={plan.id}
            style={{
              padding: '6px 8px',
              background: plan.outfitId ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${plan.outfitId ? 'rgba(139, 92, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              borderRadius: 'var(--radius-sm)',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14 }}>{plan.outfitId ? '👗' : '👕'}</span>
            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {plan.outfitId ? 'Outfit' : 'Custom items'}
            </span>
            {plan.itemIds.length > 0 && (
              <span style={{ fontSize: 9, color: 'var(--text-muted)', background: 'var(--bg-3)', padding: '1px 4px', borderRadius: 4 }}>
                {plan.itemIds.length} item{plan.itemIds.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        ))}
      </div>
      
      {/* Today indicator */}
      {isToday && (
        <div style={{
          position: 'absolute',
          bottom: 4,
          right: 4,
          background: 'var(--accent)',
          color: 'white',
          fontSize: 8,
          fontWeight: 700,
          padding: '1px 5px',
          borderRadius: 4,
          textTransform: 'uppercase',
        }}>
          Today
        </div>
      )}
    </div>
  );
}

interface OutfitPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateKey: string;
  outfits: Outfit[];
  items: ClothingItem[];
  onSelectOutfit: (outfit: Outfit) => void;
  onSelectItems: (items: ClothingItem[]) => void;
  onCreateNew: () => void;
}

function OutfitPickerModal({ isOpen, onClose, dateKey, outfits, items, onSelectOutfit, onSelectItems, onCreateNew }: OutfitPickerModalProps) {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'tops' | 'bottoms' | 'shoes' | 'outerwear' | 'accessories' | 'bags'>('all');
  
  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    const categoryMap: Record<string, string> = {
      tops: 'top',
      bottoms: 'bottom',
      shoes: 'shoes',
      outerwear: 'outerwear',
      accessories: 'accessory',
      bags: 'bag',
    };
    return items.filter(i => i.category === categoryMap[filter]);
  }, [items, filter]);

  if (!isOpen) return null;
  
  const handleItemToggle = (itemId: string) => {
    setSelectedItemIds(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };
  
  const handleConfirm = () => {
    if (selectedItemIds.length > 0) {
      const selectedItems = items.filter(i => selectedItemIds.includes(i.id));
      onSelectItems(selectedItems);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet animate-scale" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Plan for {formatDateDisplay(new Date(dateKey + 'T12:00:00'))}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div style={{ padding: 'var(--space-4)', overflowY: 'auto', flex: 1 }}>
          {/* Existing Outfits Section */}
          {outfits.length > 0 && (
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Saved Outfits
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: 200, overflowY: 'auto' }}>
                {outfits.map(outfit => (
                  <button
                    key={outfit.id}
                    onClick={() => onSelectOutfit(outfit)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3)',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden', flexShrink: 0 }}>
                      {outfit.itemIds.length > 0 && items.find(i => i.id === outfit.itemIds[0])?.images?.[0] ? (
                        <img src={items.find(i => i.id === outfit.itemIds[0])!.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', fontSize: 20 }}>👗</div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{outfit.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{outfit.itemIds.length} items</div>
                    </div>
                    <span style={{ fontSize: 20 }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Build New Outfit Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Build New Outfit
              </h4>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value as typeof filter)}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-pill)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Items</option>
                <option value="tops">Tops</option>
                <option value="bottoms">Bottoms</option>
                <option value="shoes">Shoes</option>
                <option value="outerwear">Outerwear</option>
                <option value="accessories">Accessories</option>
                <option value="bags">Bags</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', maxHeight: 300, overflowY: 'auto' }}>
              {filteredItems.map(item => {
                const cat = CATEGORIES.find(c => c.value === item.category);
                const isSelected = selectedItemIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemToggle(item.id)}
                    style={{
                      width: 72,
                      flexShrink: 0,
                      padding: 'var(--space-2)',
                      background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--surface)',
                      border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden', marginBottom: 6, border: '1px solid var(--border)' }}>
                      {item.images && item.images.length > 0 ? (
                        <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', fontSize: 24 }}>{cat?.emoji}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {item.name}
                    </div>
                    {isSelected && <div style={{ textAlign: 'center', marginTop: 2, fontSize: 10, color: 'var(--accent)' }}>✓ Added</div>}
                  </button>
                );
              })}
            </div>
            
            {selectedItemIds.length > 0 && (
              <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 4 }}>
                  ✓ {selectedItemIds.length} item{selectedItemIds.length > 1 ? 's' : ''} selected
                </div>
                <button
                  onClick={handleConfirm}
                  className="btn btn-primary btn-full"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  Plan Outfit
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border)', display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-full" onClick={onCreateNew}>+ Create New Outfit</button>
        </div>
      </div>
    </div>
  );
}

export default function CalendarTab() {
  const { items, updateItem } = useWardrobe();
  const { outfits, plans, updateOutfit, deletePlan, updatePlan, addPlan } = useOutfits();
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [selectedLogDateKey, setSelectedLogDateKey] = useState<string | null>(null);
  const [editingOutfit, setEditingOutfit] = useState<Outfit | null>(null);
  const [toast, setToast] = useState('');
  const [nowTimestamp] = useState(() => Date.now());
  
  // Calendar state
  const [currentWeek, setCurrentWeek] = useState<Date>(getCurrentWeek());
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerDateKey, setPickerDateKey] = useState<string>('');
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  
  // Drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  // Get calendar week data
  const calendarWeek = useMemo(() => 
    getCalendarWeek(currentWeek, plans, outfits, items),
    [currentWeek, plans, outfits, items]
  );
  
  // Handle drag start from outfit/item lists
  const handleDragStart = useCallback((item: DragItem) => {
    setDraggedItem(item);
  }, []);
  
  // Handle drag end (drop)
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
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
        // Find existing plan for this date or create new
        const existingPlan = plans.find(p => p.date === targetDateKey && !p.outfitId);
        
        if (existingPlan) {
          const newItemIds = [...new Set([...existingPlan.itemIds, draggedItem.id])];
          await updatePlan({ ...existingPlan, itemIds: newItemIds });
        } else {
          const plan = createPlanFromItems([draggedItem.id], targetDateKey);
          await addPlan(plan);
        }
        
        const item = items.find(i => i.id === draggedItem.id);
        if (item) {
          setToast(`✓ Added "${item.name}" to ${targetDateKey}`);
        }
      }
    } catch (error) {
      console.error('Failed to plan:', error);
      setToast('✗ Failed to plan outfit');
    }
  }, [draggedItem, outfits, items, plans, addPlan, updatePlan]);
  
  // Handle drag over
  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (event.over) {
      setDragOverDate(event.over.id as string);
    } else {
      setDragOverDate(null);
    }
  }, []);
  
  // Handle drag start from dnd-kit
  const handleDragStartDnd = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragItem;
    if (data) {
      setDraggedItem(data);
    }
  }, []);
  
  // Handle day click
  const handleDayClick = useCallback((dateKey: string) => {
    setPickerDateKey(dateKey);
    setIsPickerOpen(true);
  }, []);
  
  // Handle outfit selection from picker
  const handleOutfitSelect = useCallback(async (outfit: Outfit) => {
    const plan = createPlanFromOutfit(outfit.id, pickerDateKey);
    plan.itemIds = outfit.itemIds;
    await addPlan(plan);
    setToast(`✓ Planned "${outfit.name}" for ${pickerDateKey}`);
    setIsPickerOpen(false);
  }, [pickerDateKey, addPlan]);
  
  // Handle custom item selection from picker
  const handleItemsSelect = useCallback(async (selectedItems: ClothingItem[]) => {
    const plan = createPlanFromItems(selectedItems.map(i => i.id), pickerDateKey);
    await addPlan(plan);
    setToast(`✓ Planned ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''} for ${pickerDateKey}`);
    setIsPickerOpen(false);
  }, [pickerDateKey, addPlan]);
  
  // Handle create new outfit
  const handleCreateNew = useCallback(() => {
    setIsPickerOpen(false);
    setEditingOutfit({
      id: crypto.randomUUID(),
      name: '',
      note: '',
      itemIds: [],
      createdAt: Date.now(),
    } as Outfit);
  }, []);
  
  // Navigation
  const goToPrevWeek = () => setCurrentWeek(getPreviousWeek(currentWeek));
  const goToNextWeek = () => setCurrentWeek(getNextWeek(currentWeek));
  const goToThisWeek = () => setCurrentWeek(getCurrentWeek());
  
  // Handle removing outfit log (existing functionality)
  const handleRemoveOutfitLog = async (outfit: Outfit, dayKey: string) => {
    const updatedOutfitLogs = (outfit.wearLogs || []).filter(ts => formatDateKey(new Date(ts)) !== dayKey);
    const newOutfitLastWorn = updatedOutfitLogs.length > 0 ? Math.max(...updatedOutfitLogs) : undefined;

    await updateOutfit({
      ...outfit,
      wearLogs: updatedOutfitLogs,
      lastWornAt: newOutfitLastWorn
    });

    for (const itemId of outfit.itemIds) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        const updatedItemLogs = (item.wearLogs || []).filter(ts => formatDateKey(new Date(ts)) !== dayKey);
        const newItemLastWorn = updatedItemLogs.length > 0 ? Math.max(...updatedItemLogs) : undefined;
        await updateItem({
          ...item,
          wearLogs: updatedItemLogs,
          lastWornAt: newItemLastWorn
        });
      }
    }

    const matchingPlan = plans.find(p => p.date === dayKey && p.outfitId === outfit.id);
    if (matchingPlan) {
      await deletePlan(matchingPlan.id);
    }

    setToast(`✓ Removed log for ${dayKey}`);
  };

  // Handle removing item log
  const handleRemoveItemLog = async (item: ClothingItem, dayKey: string) => {
    const updatedItemLogs = (item.wearLogs || []).filter(ts => formatDateKey(new Date(ts)) !== dayKey);
    const newItemLastWorn = updatedItemLogs.length > 0 ? Math.max(...updatedItemLogs) : undefined;

    await updateItem({
      ...item,
      wearLogs: updatedItemLogs,
      lastWornAt: newItemLastWorn
    });

    const matchingPlan = plans.find(p => p.date === dayKey && p.itemIds.includes(item.id));
    if (matchingPlan) {
      if (matchingPlan.itemIds.length === 1 && !matchingPlan.outfitId) {
        await deletePlan(matchingPlan.id);
      } else {
        await updatePlan({
          ...matchingPlan,
          itemIds: matchingPlan.itemIds.filter(id => id !== item.id)
        });
      }
    }

    setToast(`✓ Removed log for ${dayKey}`);
  };

  // Handle removing wash log
  const handleRemoveWashLogForDay = async (dayKey: string, washedItems: ClothingItem[]) => {
    for (const item of washedItems) {
      const updatedWashLogs = (item.washLogs || []).filter(ts => formatDateKey(new Date(ts)) !== dayKey);
      const newLastWashedAt = updatedWashLogs.length > 0 ? Math.max(...updatedWashLogs) : undefined;
      await updateItem({
        ...item,
        washLogs: updatedWashLogs,
        lastWashedAt: newLastWashedAt
      });
    }
    setToast(`✓ Removed laundry log for ${dayKey}`);
  };

  const formatDateLabel = (dateObj: Date) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const d = new Date(dateObj);
    d.setHours(0,0,0,0);

    const isToday = today.getTime() === d.getTime();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = yesterday.getTime() === d.getTime();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = tomorrow.getTime() === d.getTime();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    if (isTomorrow) return 'Tomorrow';
    return dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Build day lookup for past logs (from original CalendarTab)
  const daysWithLogs = useMemo(() => {
    const map: Record<string, { dateObj: Date, outfits: Outfit[], items: ClothingItem[], washedItems: ClothingItem[] }> = {};

    // 1. Collect all outfits from wear logs
    outfits.forEach(outfit => {
      const logs = outfit.wearLogs || (outfit.lastWornAt ? [outfit.lastWornAt] : []);
      logs.forEach(ts => {
        const key = formatDateKey(new Date(ts));
        if (!map[key]) map[key] = { dateObj: new Date(ts), outfits: [], items: [], washedItems: [] };
        if (!map[key].outfits.find(o => o.id === outfit.id)) {
          map[key].outfits.push(outfit);
        }
      });
    });

    // 2. Collect all items from wear logs
    items.forEach(item => {
      const logs = item.wearLogs || (item.lastWornAt ? [item.lastWornAt] : []);
      logs.forEach(ts => {
        const key = formatDateKey(new Date(ts));
        if (!map[key]) map[key] = { dateObj: new Date(ts), outfits: [], items: [], washedItems: [] };
        const isInOutfitToday = map[key].outfits.some(o => o.itemIds.includes(item.id));
        if (!isInOutfitToday) {
          if (!map[key].items.find(i => i.id === item.id)) {
            map[key].items.push(item);
          }
        }
      });
    });

    // 3. Collect all wash logs
    items.forEach(item => {
      const washLogs = item.washLogs || (item.lastWashedAt ? [item.lastWashedAt] : []);
      washLogs.forEach(ts => {
        const key = formatDateKey(new Date(ts));
        if (!map[key]) map[key] = { dateObj: new Date(ts), outfits: [], items: [], washedItems: [] };
        if (!map[key].washedItems.find(i => i.id === item.id)) {
          map[key].washedItems.push(item);
        }
      });
    });

    // 4. Collect all plans
    plans.forEach(plan => {
      const key = plan.date;
      if (!map[key]) {
        map[key] = { dateObj: new Date(key + 'T12:00:00'), outfits: [], items: [], washedItems: [] };
      }
      if (plan.outfitId) {
        const outfit = outfits.find(o => o.id === plan.outfitId);
        if (outfit && !map[key].outfits.find(o => o.id === outfit.id)) {
          map[key].outfits.push(outfit);
        }
      }
      plan.itemIds.forEach(itemId => {
        const item = items.find(i => i.id === itemId);
        if (item) {
          const isInOutfitToday = map[key].outfits.some(o => o.itemIds.includes(item.id));
          if (!isInOutfitToday && !map[key].items.find(i => i.id === item.id)) {
            map[key].items.push(item);
          }
        }
      });
    });

    return Object.entries(map)
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [items, outfits, plans]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStartDnd}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="page-content animate-fade-in">
        {/* Calendar Header */}
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <button className="btn btn-ghost" onClick={goToPrevWeek} aria-label="Previous week" style={{ padding: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <h1 className="section-title" style={{ fontSize: 18, whiteSpace: 'nowrap' }}>{getWeekLabel(calendarWeek)}</h1>
            <button className="btn btn-ghost" onClick={goToNextWeek} aria-label="Next week" style={{ padding: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <button className="btn btn-ghost" onClick={goToThisWeek} style={{ padding: '6px 12px', fontSize: 13 }}>
              This Week
            </button>
            <button className="btn btn-primary" onClick={() => { setPickerDateKey(formatDateKey(new Date())); setIsPickerOpen(true); }} style={{ padding: '6px 12px', fontSize: 13 }}>
              📅 Plan Outfit
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          {WEEKDAYS.map((day, i) => (
            <div key={day} style={{ 
              textAlign: 'center', 
              fontSize: 11, 
              fontWeight: 700, 
              color: 'var(--text-muted)', 
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              padding: '4px 0',
            }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-3)' }}>
          {calendarWeek.days.map(day => (
            <CalendarDayCell
              key={day.dateKey}
              day={day}
              onDrop={() => {}} // Handled by DndContext
              onClick={handleDayClick}
              isDragOver={dragOverDate === day.dateKey}
            />
          ))}
        </div>

        {/* Past Logs Section */}
        {daysWithLogs.length > 0 && (
          <div style={{ marginTop: 'var(--space-10)' }}>
            <h2 className="section-title" style={{ fontSize: 16, marginBottom: 'var(--space-4)' }}>Style Log</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {daysWithLogs.map(day => (
                <div key={day.key}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: 'var(--space-2)',
                    marginBottom: 'var(--space-4)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{formatDateLabel(day.dateObj)}</span>
                    {day.dateObj.getTime() > nowTimestamp && (
                      <span style={{ fontSize: 10, color: 'var(--accent)', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: 4 }}>PLANNED</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {/* Past Outfits */}
                    {day.outfits.map(outfit => (
                      <div
                        key={`outfit-${outfit.id}-${day.key}`}
                        className="outfit-card"
                        style={{ padding: 'var(--space-3)', cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedOutfit(outfit);
                          setSelectedLogDateKey(day.key);
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                            Outfit: {outfit.name}
                          </div>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '2px 8px', fontSize: 11, color: 'var(--text-muted)', height: 'auto', minHeight: 'auto' }}
                            title="Remove log for this day"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveOutfitLog(outfit, day.key);
                            }}
                          >
                            🗑 Remove log
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', scrollbarWidth: 'none' }}>
                          {outfit.itemIds.map(itemId => {
                            const item = items.find(i => i.id === itemId);
                            if (!item) return null;
                            const cat = CATEGORIES.find(c => c.value === item.category);
                            return (
                              <div
                                key={itemId}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem(item);
                                  setSelectedLogDateKey(day.key);
                                }}
                                style={{ width: 64, flexShrink: 0, cursor: 'pointer' }}
                              >
                                <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', background: 'var(--bg-3)', overflow: 'hidden', marginBottom: 4 }}>
                                  {item.images && item.images.length > 0 ? (
                                    <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', fontSize: 24 }}>{cat?.emoji}</div>
                                  )}
                                </div>
                                <div style={{ fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{item.name}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Past Individual Items */}
                    {day.items.length > 0 && (
                      <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', scrollbarWidth: 'none' }}>
                        {day.items.map(item => {
                          const cat = CATEGORIES.find(c => c.value === item.category);
                          return (
                            <div
                              key={`single-${item.id}-${day.key}`}
                              onClick={() => {
                                setSelectedItem(item);
                                setSelectedLogDateKey(day.key);
                              }}
                              style={{ width: 84, flexShrink: 0, cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)', position: 'relative' }}
                            >
                              <button
                                style={{
                                  position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)',
                                  color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18,
                                  fontSize: 10, cursor: 'pointer', display: 'grid', placeItems: 'center', zIndex: 2
                                }}
                                title="Remove log for this day"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveItemLog(item, day.key);
                                }}
                              >
                                ✕
                              </button>
                              <div style={{ width: '100%', aspectRatio: '1', borderRadius: 'calc(var(--radius-md) - 4px)', background: 'var(--bg-3)', overflow: 'hidden', marginBottom: 6 }}>
                                {item.images && item.images.length > 0 ? (
                                  <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', fontSize: 28 }}>{cat?.emoji}</div>
                                )}
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{item.name}</div>
                              <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', textTransform: 'capitalize' }}>Single item</div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Laundry Audit Log */}
                    {day.washedItems && day.washedItems.length > 0 && (
                      <div style={{
                        background: 'var(--bg-2)',
                        border: '1px dashed var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 20 }}>🧺</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                              Laundry Audit — Washed {day.washedItems.length} item(s)
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              {day.washedItems.map(i => i.name).join(', ')}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: 10 }}>
                            Cleaned
                          </span>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '2px 6px', fontSize: 11, color: 'var(--text-muted)', height: 'auto' }}
                            title="Delete wash log entry for this day"
                            onClick={() => handleRemoveWashLogForDay(day.key, day.washedItems)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Draggable Outfit List (Sidebar/Panel) */}
        <div style={{ marginTop: 'var(--space-10)', padding: 'var(--space-4)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Drag Outfits to Calendar
          </h3>
          <SortableContext items={outfits.map(o => o.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: 300, overflowY: 'auto' }}>
              {outfits.map(outfit => (
                <DraggableOutfit key={outfit.id} outfit={outfit} onDragStart={handleDragStart} />
              ))}
            </div>
          </SortableContext>
        </div>

        {/* Draggable Items List */}
        <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Drag Items to Calendar
          </h3>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {items.map(item => (
                <DraggableItem key={item.id} item={item} onDragStart={handleDragStart} />
              ))}
            </div>
          </SortableContext>
        </div>

        {/* Modals */}
        {selectedItem && (
          <ItemDetailModal
            item={items.find(i => i.id === selectedItem.id) || selectedItem}
            onClose={() => { setSelectedItem(null); setSelectedLogDateKey(null); }}
            logDateKey={selectedLogDateKey || undefined}
            onRemoveLogFromDate={(dateKey) => handleRemoveItemLog(selectedItem, dateKey)}
          />
        )}

        {selectedOutfit && (
          <OutfitDetailModal
            outfit={selectedOutfit}
            items={items}
            onClose={() => { setSelectedOutfit(null); setSelectedLogDateKey(null); }}
            onEdit={() => { setEditingOutfit(selectedOutfit); setSelectedOutfit(null); }}
            logDateKey={selectedLogDateKey || undefined}
            onRemoveLogFromDate={(dateKey) => handleRemoveOutfitLog(selectedOutfit, dateKey)}
          />
        )}

        {editingOutfit && (
          <OutfitBuilderModal
            initialOutfit={editingOutfit}
            onClose={() => setEditingOutfit(null)}
          />
        )}

        <OutfitPickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          dateKey={pickerDateKey}
          outfits={outfits}
          items={items}
          onSelectOutfit={handleOutfitSelect}
          onSelectItems={handleItemsSelect}
          onCreateNew={handleCreateNew}
        />

        {toast && <Toast message={toast} onDone={() => setToast('')} />}
      </div>
    </DndContext>
  );
}