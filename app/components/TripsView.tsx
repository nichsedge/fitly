'use client';

import React, { useState } from 'react';
import { useApp } from './AppProvider';
import { Trip, ClothingItem } from '../lib/types';
import { triggerHaptic } from '../lib/haptics';
import ItemCard from './ItemCard';
import { v4 as uuidv4 } from 'uuid';

export default function TripsView() {
  const { trips, items, outfits, locations, addTrip, updateTrip, deleteTrip, batchMoveItemsLocation, t } = useApp();
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
      const newTrip: Trip = {
        id: uuidv4(),
        name,
        destination,
        startDate,
        endDate,
        itemIds: selectedItemIds,
        outfitIds: selectedOutfitIds,
        completed: false,
      };
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

  const activeTrip = trips.find((t) => t.id === selectedTripId) || trips[0];

  // Helper to gather all unique item IDs for a trip (direct items + outfit items)
  const getTripItemIds = (trip: Trip): string[] => {
    const directIds = trip.itemIds || [];
    const outfitItemIds = (trip.outfitIds || []).flatMap((oId) => {
      const o = outfits.find((out) => out.id === oId);
      return o ? o.itemIds : [];
    });
    return Array.from(new Set([...directIds, ...outfitItemIds]));
  };

  const tripItemIds = activeTrip ? getTripItemIds(activeTrip) : [];
  const tripItems = tripItemIds.map((id) => items.find((i) => i.id === id)).filter((i): i is ClothingItem => !!i);

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
          }}
        >
          ＋ New Trip
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
          <div style={{ fontSize: 52, marginBottom: 14 }}>🌴</div>
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
            }}
          >
            ✈️ Create First Trip
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Sleek Horizontal Trip Selector Pills */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
            {trips.map((trip) => {
              const isActive = activeTrip && activeTrip.id === trip.id;
              const allIds = getTripItemIds(trip);
              return (
                <button
                  key={trip.id}
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
                  <span>✈️ {trip.name}</span>
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
                    {allIds.length}
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
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    📍 {activeTrip.destination || 'Destination'} • 🗓️ {activeTrip.startDate} to {activeTrip.endDate}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-circle" onClick={() => openEditTripModal(activeTrip)} title="Edit Trip">
                    ✏️
                  </button>
                  <button
                    className="btn-circle"
                    onClick={async () => {
                      if (confirm('Delete this trip?')) {
                        await deleteTrip(activeTrip.id);
                        setSelectedTripId(null);
                      }
                    }}
                    title="Delete Trip"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>🎒 Packing Progress</span>
                  <span style={{ color: 'var(--accent)' }}>
                    {packedCount} / {tripItems.length} ({progressPercent}%)
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPercent}%`,
                      background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                      transition: 'width 0.3s ease',
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>

              {/* Batch Transfer Bar */}
              {packedCount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: 12,
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Move {packedCount} packed item(s) to location:
                  </span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={transferLocationId}
                      onChange={(e) => setTransferLocationId(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        fontSize: 12,
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-3)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.icon || '📍'} {loc.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-primary"
                      onClick={handleBatchTransfer}
                      style={{ padding: '6px 14px', fontSize: 12, borderRadius: 'var(--radius-pill)', fontWeight: 700 }}
                    >
                      🚀 Move Now
                    </button>
                  </div>
                </div>
              )}

              {/* Checklist Items Grid */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
                  Clothes & Outfits Checklist
                </h4>
                {tripItems.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No clothes or outfits added to this trip yet. Tap ✏️ above to add items.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: 12 }}>
                    {tripItems.map((item) => {
                      const isPacked = !!packedItemMap[item.id];
                      return (
                        <div key={item.id} style={{ position: 'relative' }}>
                          <ItemCard item={item} />
                          {/* Glassmorphic Pack Toggle Pill */}
                          <button
                            onClick={() => togglePacked(item.id)}
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              background: isPacked ? 'var(--success)' : 'rgba(18, 18, 21, 0.75)',
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)',
                              color: '#ffffff',
                              border: `1px solid ${isPacked ? 'var(--success)' : 'rgba(255, 255, 255, 0.2)'}`,
                              borderRadius: 'var(--radius-pill)',
                              padding: '4px 10px',
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: 'pointer',
                              zIndex: 10,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {isPacked ? '✓ Packed' : '＋ Pack'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New / Edit Trip Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: '92%' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>{editingTrip ? 'Edit Trip' : 'Create Trip'}</h3>
              <button className="btn-circle" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTrip} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Trip Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Summer Beach Vacation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">Destination</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Bali, Indonesia"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Start Date</label>
                  <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">End Date</label>
                  <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              {/* Outfit picker */}
              <div>
                <label className="form-label">Select Outfits for Trip</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto', padding: 8, background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)' }}>
                  {outfits.length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No outfits created yet</span>
                  ) : (
                    outfits.map((outfit) => {
                      const selected = selectedOutfitIds.includes(outfit.id);
                      return (
                        <button
                          type="button"
                          key={outfit.id}
                          onClick={() => {
                            setSelectedOutfitIds((prev) => (selected ? prev.filter((id) => id !== outfit.id) : [...prev, outfit.id]));
                          }}
                          style={{
                            padding: '4px 10px',
                            fontSize: 12,
                            borderRadius: 'var(--radius-pill)',
                            border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                            background: selected ? 'var(--accent-subtle)' : 'var(--bg-2)',
                            color: selected ? 'var(--accent)' : 'var(--text-secondary)',
                            fontWeight: selected ? 700 : 500,
                            cursor: 'pointer',
                          }}
                        >
                          {selected ? '✓ ' : ''}
                          {outfit.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Individual Item picker */}
              <div>
                <label className="form-label">Select Individual Clothes</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 150, overflowY: 'auto', padding: 8, background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)' }}>
                  {items.length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No clothes in wardrobe</span>
                  ) : (
                    items.map((item) => {
                      const selected = selectedItemIds.includes(item.id);
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => {
                            setSelectedItemIds((prev) => (selected ? prev.filter((id) => id !== item.id) : [...prev, item.id]));
                          }}
                          style={{
                            padding: '4px 10px',
                            fontSize: 12,
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                            background: selected ? 'var(--accent-subtle)' : 'var(--bg-2)',
                            color: selected ? 'var(--accent)' : 'var(--text-secondary)',
                            fontWeight: selected ? 700 : 500,
                            cursor: 'pointer',
                          }}
                        >
                          {selected ? '✓ ' : ''}
                          {item.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>
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
