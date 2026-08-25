'use client';

import { useMemo, useState, useCallback } from 'react';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useOutfits } from '../contexts/OutfitContext';
import { ClothingItem, Outfit, Category, PlannedOutfit } from '../lib/types';
import Toast from './Toast';
import LogWearModal from './LogWearModal';
import { ResolvedImage } from './ResolvedImage';
import { DraggableOutfit, DraggableItem, MonthDayCell, WeekDayCell } from './calendar/CalendarCells';
import LogLaundryModal from './calendar/LogLaundryModal';
import DayDetailModal from './calendar/DayDetailModal';
import {
  getCalendarWeek,
  getCalendarMonth,
  formatDateKey,
  formatDateDisplay,
  getDayLogSummary,
  getWeekLabel,
  getPreviousWeek,
  getNextWeek,
  getCurrentWeek,
  getPreviousMonth,
  getNextMonth,
  WEEKDAYS,
  DayLogSummary,
  createPlanFromOutfit,
  createPlanFromItems,
  timestampToDateKey,
} from '../lib/domain/calendar';
import {
  addWearLog,
  addWashLog,
  removeWearLog,
  removeWashLog,
  getWearLogs,
  getWashLogs,
} from '../lib/domain/wearLogs';
import {
  Sparkles,
  Shirt,
  WashingMachine,
  Calendar as CalendarIcon,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Grid,
  History,
  GripVertical,
  CategoryIcon,
} from './AppIcon';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from '@dnd-kit/core';

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
      totalOutfitWears += getWearLogs(o).length;
    });

    let totalItemWears = 0;
    let totalWashes = 0;
    items.forEach(i => {
      totalItemWears += getWearLogs(i).length;
      totalWashes += getWashLogs(i).length;
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
    const ensureSummary = (key: string) => {
      if (!map[key]) map[key] = getDayLogSummary(key, plans, outfits, items);
    };

    outfits.forEach(outfit => {
      getWearLogs(outfit).forEach(ts => ensureSummary(timestampToDateKey(ts)));
    });

    items.forEach(item => {
      getWearLogs(item).forEach(ts => ensureSummary(timestampToDateKey(ts)));
      getWashLogs(item).forEach(ts => ensureSummary(timestampToDateKey(ts)));
    });

    plans.forEach(plan => {
      ensureSummary(plan.date);
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
    if (outfitId) {
      const outfit = outfits.find(o => o.id === outfitId);
      if (outfit) {
        const patch = addWearLog(outfit, dateKey);
        await updateOutfit(patch ? { ...outfit, ...patch } : outfit);

        for (const id of outfit.itemIds) {
          const item = items.find(i => i.id === id);
          if (item) {
            const itemPatch = addWearLog(item, dateKey);
            await updateItem(itemPatch ? { ...item, ...itemPatch, status: 'dirty' } : { ...item, status: 'dirty' });
          }
        }
        setToast(`✓ Logged wear for ${outfit.name}`);
      }
    } else if (itemIds && itemIds.length > 0) {
      for (const id of itemIds) {
        const item = items.find(i => i.id === id);
        if (item) {
          const itemPatch = addWearLog(item, dateKey);
          await updateItem(itemPatch ? { ...item, ...itemPatch, status: 'dirty' } : { ...item, status: 'dirty' });
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
    for (const id of itemIds) {
      const item = items.find(i => i.id === id);
      if (item) {
        const patch = addWashLog(item, dateKey);
        await updateItem(patch ? { ...item, ...patch, status: 'ready' } : { ...item, status: 'ready' });
      }
    }
    setToast(`✓ Logged laundry for ${itemIds.length} item(s)`);
  };

  const handleMarkPlanWorn = async (plan: PlannedOutfit) => {
    await handleSaveWear(plan.date, plan.outfitId, plan.itemIds);
  };

  const handleRemoveOutfitLog = async (outfit: Outfit, dateKey: string) => {
    await updateOutfit({ ...outfit, ...removeWearLog(outfit, dateKey) });

    for (const itemId of outfit.itemIds) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        await updateItem({ ...item, ...removeWearLog(item, dateKey) });
      }
    }

    setToast(`✓ Removed outfit log for ${dateKey}`);
  };

  const handleRemoveItemLog = async (item: ClothingItem, dateKey: string) => {
    await updateItem({ ...item, ...removeWearLog(item, dateKey) });
    setToast(`✓ Removed item log for ${dateKey}`);
  };

  const handleRemoveWashLog = async (dateKey: string, washedItems: ClothingItem[]) => {
    for (const item of washedItems) {
      await updateItem({ ...item, ...removeWashLog(item, dateKey) });
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
                    onChange={e => setDragFilterCategory(e.target.value as 'all' | 'outfits' | Category)}
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
                onChange={e => setHistoryCategory(e.target.value as 'all' | 'outfits' | 'items' | 'laundry')}
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
