'use client';

import React, { useState, useMemo } from 'react';
import { useTrips } from '../contexts/TripContext';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useOutfits } from '../contexts/OutfitContext';
import { useSettings } from '../contexts/SettingsContext';
import { Trip } from '../lib/types';
import { tripService } from '../services/TripService';
import { triggerHaptic } from '../lib/haptics';
import { Luggage, Calendar, MapPin, Edit, Trash2, AlertTriangle, Plus } from './AppIcon';

export default function TripsView() {
  const { trips, addTrip, updateTrip, deleteTrip } = useTrips();
  const { items, locations, batchMoveItemsLocation } = useWardrobe();
  const { outfits } = useOutfits();
  const { t } = useSettings();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<string[]>([]);

  // Packed checklist tracking stored in local state per trip
  const [packedItemMap, setPackedItemMap] = useState<Record<string, boolean>>({});
  const [transferLocationId, setTransferLocationId] = useState<string>('loc-rent');

  const openNewTripModal = () => {
    setEditingTrip(null);
    setName('');
    setDestination('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setSelectedItemIds([]);
    setSelectedOutfitIds([]);
    setIsModalOpen(true);
    triggerHaptic(10);
  };

  const openEditTripModal = (trip: Trip) => {
    setEditingTrip(trip);
    setName(trip.name);
    setDestination(trip.destination || '');
    setStartDate(trip.startDate);
    setEndDate(trip.endDate);
    setSelectedItemIds(trip.itemIds || []);
    setSelectedOutfitIds(trip.outfitIds || []);
    setIsModalOpen(true);
    triggerHaptic(10);
  };

  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingTrip) {
      const updated: Trip = {
        ...editingTrip,
        name,
        destination,
        startDate,
        endDate,
        itemIds: selectedItemIds,
        outfitIds: selectedOutfitIds,
      };
      await updateTrip(updated);
    } else {
      const newTrip = tripService.createTrip(name, startDate, endDate, destination);
      newTrip.itemIds = selectedItemIds;
      newTrip.outfitIds = selectedOutfitIds;
      await addTrip(newTrip);
    }

    setIsModalOpen(false);
    triggerHaptic(15);
  };

  const togglePacked = (itemId: string) => {
    triggerHaptic(5);
    setPackedItemMap((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const activeTrip = useMemo(() => {
    return trips.find((t) => t.id === selectedTripId) || trips[0];
  }, [trips, selectedTripId]);

  const packingData = useMemo(() => {
    if (!activeTrip) return { packedItems: [], tripOutfits: [], missingCategories: [] };
    return tripService.getPackingItems(activeTrip, items, outfits);
  }, [activeTrip, items, outfits]);

  const tripItems = packingData.packedItems;
  const packedCount = tripItems.filter((i) => packedItemMap[i.id]).length;
  const progressPercent = tripItems.length > 0 ? Math.round((packedCount / tripItems.length) * 100) : 0;

  const handleBatchTransfer = async () => {
    const packedIds = tripItems.filter((i) => packedItemMap[i.id]).map((i) => i.id);
    if (packedIds.length === 0) return;

    await batchMoveItemsLocation(packedIds, transferLocationId);
    triggerHaptic(20);
    alert(`Moved ${packedIds.length} packed item(s) to location!`);
  };

  return (
    <div className="page-content" style={{ paddingBottom: 100 }}>
      {/* Header Banner */}
      <div className="section-header" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            🧳 {t('trips')}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Plan travel outfits & packing checklists
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={openNewTripModal}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-pill)',
            fontSize: 13,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px var(--accent-glow)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Plus size={16} />
          <span>New Trip</span>
        </button>
      </div>

      {trips.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'var(--bg-2)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}>
            <Luggage size={52} color="var(--accent)" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>
            No Trips Planned Yet
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 320, lineHeight: 1.5, marginBottom: 20 }}>
            Planning a trip or staycation? Create a trip to organize clothes, check off packing lists, and update location tags.
          </p>
          <button
            className="btn btn-primary"
            onClick={openNewTripModal}
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-pill)',
              fontSize: 14,
              fontWeight: 700,
              boxShadow: '0 6px 20px var(--accent-glow)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Luggage size={18} />
            <span>Create First Trip</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Horizontal Trip Selector Pills */}
          <div role="tablist" aria-label="Trips list" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
            {trips.map((trip) => {
              const isActive = activeTrip && activeTrip.id === trip.id;
              const tripItemsCount = tripService.getPackingItems(trip, items, outfits).packedItems.length;
              return (
                <button
                  key={trip.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setSelectedTripId(trip.id);
                    triggerHaptic(5);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-pill)',
                    background: isActive ? 'var(--accent-glow)' : 'var(--bg-2)',
                    border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Luggage size={14} />
                  <span>{trip.name}</span>
                  <span
                    style={{
                      fontSize: 11,
                      background: isActive ? 'var(--accent)' : 'var(--bg-3)',
                      color: isActive ? '#fff' : 'var(--text-muted)',
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontWeight: 800,
                    }}
                  >
                    {tripItemsCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Trip Details & Packing Checklist */}
          {activeTrip && (
            <div
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{activeTrip.name}</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} />
                      <span>{activeTrip.destination || 'Destination'}</span>
                    </span>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} />
                      <span>{activeTrip.startDate} to {activeTrip.endDate}</span>
                    </span>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => openEditTripModal(activeTrip)}
                    style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                    aria-label="Edit trip details"
                  >
                    <Edit size={14} />
                    <span>Edit</span>
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={async () => {
                      if (confirm('Delete this trip?')) {
                        await deleteTrip(activeTrip.id);
                      }
                    }}
                    style={{ padding: '6px 10px', fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label="Delete trip"
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  <span>Packing Progress ({packedCount}/{tripItems.length})</span>
                  <span>{progressPercent}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPercent}%`,
                      background: 'var(--accent)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Missing Categories Alert */}
              {packingData.missingCategories.length > 0 && (
                <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: 12, color: '#eab308', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} color="#eab308" />
                  <span>Missing essential items: <strong>{packingData.missingCategories.join(', ')}</strong></span>
                </div>
              )}

              {/* Checklist Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tripItems.map((item) => {
                  const isPacked = !!packedItemMap[item.id];
                  return (
                    <div
                      key={item.id}
                      onClick={() => togglePacked(item.id)}
                      role="checkbox"
                      aria-checked={isPacked}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          togglePacked(item.id);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--bg-3)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        opacity: isPacked ? 0.6 : 1,
                        textDecoration: isPacked ? 'line-through' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{isPacked ? '✅' : '⬜'}</span>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {item.category}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Batch Transfer to Location */}
              {packedCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Relocate Packed Items:</span>
                  <select
                    value={transferLocationId}
                    onChange={(e) => setTransferLocationId(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 'var(--radius-md)', background: 'var(--bg-3)', color: 'var(--text-primary)', fontSize: 12, border: '1px solid var(--border)' }}
                  >
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-primary" onClick={handleBatchTransfer} style={{ padding: '4px 12px', fontSize: 12 }}>
                    Move Packed ({packedCount})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit/Create Trip Modal */}
      {isModalOpen && (
        <div className="modal-backdrop animate-fade-in" role="dialog" aria-modal="true" aria-label="Trip editor">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingTrip ? 'Edit Trip' : 'New Trip'}</h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)} aria-label="Close modal">
                ×
              </button>
            </div>
            <form onSubmit={handleSaveTrip} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Trip Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bali Vacation 2026"
                  className="search-input"
                  style={{ marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Destination</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Denpasar, Bali"
                  className="search-input"
                  style={{ marginTop: 4 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="search-input"
                    style={{ marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="search-input"
                    style={{ marginTop: 4 }}
                  />
                </div>
              </div>

              {/* Item selection */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'block' }}>
                  Select Individual Items ({selectedItemIds.length})
                </label>
                <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6, background: 'var(--bg-3)', padding: 8, borderRadius: 'var(--radius-md)' }}>
                  {items.map((item) => {
                    const selected = selectedItemIds.includes(item.id);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                          setSelectedItemIds((prev) => (selected ? prev.filter((id) => id !== item.id) : [...prev, item.id]));
                        }}
                        style={{
                          fontSize: 11,
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-pill)',
                          border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                          background: selected ? 'var(--accent-subtle)' : 'var(--bg-2)',
                          color: selected ? 'var(--accent)' : 'var(--text-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        {selected ? '✓ ' : '+ '}{item.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
