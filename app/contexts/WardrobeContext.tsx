'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ClothingItem, CustomTag, WardrobeLocation, RetirementReason, ItemCondition, ItemStatus } from '../lib/types';
import { itemRepository } from '../repositories/ItemRepository';
import { tagRepository } from '../repositories/TagRepository';
import { locationRepository } from '../repositories/LocationRepository';
import { getFreshSampleItems } from '../lib/seedData';
import { normalizeEmbeddedImages } from '../lib/db';

interface WardrobeState {
  items: ClothingItem[];
  tags: CustomTag[];
  locations: WardrobeLocation[];
  activeLocationId: string;
  setActiveLocationId: (id: string) => void;
  loading: boolean;
  error: Error | null;
  refreshItems: () => Promise<void>;
  refreshTags: () => Promise<void>;
  refreshLocations: () => Promise<void>;
  loadSampleData: () => Promise<void>;
  addItem: (item: ClothingItem) => Promise<void>;
  updateItem: (item: ClothingItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  retireItem: (item: ClothingItem, retirementReason: RetirementReason, donationTarget?: string) => Promise<void>;
  batchMoveItemsLocation: (itemIds: string[], locationId: string) => Promise<void>;
  addLocation: (loc: WardrobeLocation) => Promise<void>;
  updateLocation: (loc: WardrobeLocation) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  addTag: (tag: CustomTag) => Promise<void>;
  updateTag: (tag: CustomTag, oldLabel: string) => Promise<void>;
  deleteTag: (id: string, label: string) => Promise<void>;
}

const WardrobeContext = createContext<WardrobeState | null>(null);

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [tags, setTags] = useState<CustomTag[]>([]);
  const [locations, setLocations] = useState<WardrobeLocation[]>([]);
  const [activeLocationId, setActiveLocationIdState] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const setActiveLocationId = useCallback((id: string) => {
    setActiveLocationIdState(id);
    localStorage.setItem('activeLocationId', id);
  }, []);

  const refreshItems = useCallback(async () => {
    try {
      const all = await itemRepository.getAll();
      setItems(all.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const refreshTags = useCallback(async () => {
    try {
      const all = await tagRepository.getAll();
      setTags(all.sort((a, b) => a.label.localeCompare(b.label)));
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const refreshLocations = useCallback(async () => {
    try {
      const all = await locationRepository.getAll();
      setLocations(all);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  // Optimistic Mutations
  const addItem = useCallback(async (item: ClothingItem) => {
    setItems(prev => [item, ...prev]);
    try {
      await itemRepository.add(item);
    } catch (err) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      throw err;
    }
  }, []);

  const updateItem = useCallback(async (item: ClothingItem) => {
    const previous = items;
    setItems(prev => prev.map(i => i.id === item.id ? item : i));
    try {
      await itemRepository.update(item);
    } catch (err) {
      setItems(previous);
      throw err;
    }
  }, [items]);

  const retireItem = useCallback(async (item: ClothingItem, retirementReason: RetirementReason, donationTarget?: string) => {
    const previous = items;
    const retiredItem = {
      ...item,
      retiredAt: Date.now(),
      retirementReason,
      donationTarget,
      condition: 'retired' as ItemCondition,
      status: 'ready' as ItemStatus,
    };
    setItems(prev => prev.map(i => i.id === item.id ? retiredItem : i));
    try {
      await itemRepository.update(retiredItem);
    } catch (err) {
      setItems(previous);
      throw err;
    }
  }, [items]);

  const deleteItem = useCallback(async (id: string) => {
    const previous = items;
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await itemRepository.delete(id);
    } catch (err) {
      setItems(previous);
      throw err;
    }
  }, [items]);

  const batchMoveItemsLocation = useCallback(async (itemIds: string[], locationId: string) => {
    const previous = items;
    setItems(prev => prev.map(i => itemIds.includes(i.id) ? { ...i, locationId } : i));
    try {
      const updates = items.filter(i => itemIds.includes(i.id)).map(i => ({ ...i, locationId }));
      await itemRepository.bulkUpdate(updates);
    } catch (err) {
      setItems(previous);
      throw err;
    }
  }, [items]);

  const addLocation = useCallback(async (loc: WardrobeLocation) => {
    setLocations(prev => [...prev, loc]);
    try {
      await locationRepository.add(loc);
    } catch (err) {
      setLocations(prev => prev.filter(l => l.id !== loc.id));
      throw err;
    }
  }, []);

  const updateLocation = useCallback(async (loc: WardrobeLocation) => {
    const previous = locations;
    setLocations(prev => prev.map(l => l.id === loc.id ? loc : l));
    try {
      await locationRepository.update(loc);
    } catch (err) {
      setLocations(previous);
      throw err;
    }
  }, [locations]);

  const deleteLocation = useCallback(async (id: string) => {
    const previousLocations = locations;
    const previousItems = items;
    setLocations(prev => prev.filter(l => l.id !== id));
    setItems(prev => prev.map(i => i.locationId === id ? { ...i, locationId: 'loc-home' } : i));
    try {
      await locationRepository.delete(id);
      const affected = items.filter(i => i.locationId === id).map(i => ({ ...i, locationId: 'loc-home' }));
      if (affected.length > 0) {
        await itemRepository.bulkUpdate(affected);
      }
    } catch (err) {
      setLocations(previousLocations);
      setItems(previousItems);
      throw err;
    }
  }, [locations, items]);

  const addTag = useCallback(async (tag: CustomTag) => {
    setTags(prev => [...prev, tag].sort((a, b) => a.label.localeCompare(b.label)));
    try {
      await tagRepository.add(tag);
    } catch (err) {
      setTags(prev => prev.filter(t => t.id !== tag.id));
      throw err;
    }
  }, []);

  const updateTag = useCallback(async (updatedTag: CustomTag, oldLabel: string) => {
    const previousTags = tags;
    const previousItems = items;
    setTags(prev => prev.map(t => t.id === updatedTag.id ? updatedTag : t).sort((a, b) => a.label.localeCompare(b.label)));
    setItems(prev => prev.map(i => i.tags.includes(oldLabel) ? {
      ...i,
      tags: i.tags.map(t => t === oldLabel ? updatedTag.label : t)
    } : i));
    try {
      await tagRepository.update(updatedTag);
      const affected = items.filter(i => i.tags.includes(oldLabel)).map(i => ({
        ...i,
        tags: i.tags.map(t => t === oldLabel ? updatedTag.label : t)
      }));
      if (affected.length > 0) {
        await itemRepository.bulkUpdate(affected);
      }
    } catch (err) {
      setTags(previousTags);
      setItems(previousItems);
      throw err;
    }
  }, [tags, items]);

  const deleteTag = useCallback(async (id: string, label: string) => {
    const previousTags = tags;
    const previousItems = items;
    setTags(prev => prev.filter(t => t.id !== id));
    setItems(prev => prev.map(i => i.tags.includes(label) ? {
      ...i,
      tags: i.tags.filter(t => t !== label)
    } : i));
    try {
      await tagRepository.delete(id);
      const affected = items.filter(i => i.tags.includes(label)).map(i => ({
        ...i,
        tags: i.tags.filter(t => t !== label)
      }));
      if (affected.length > 0) {
        await itemRepository.bulkUpdate(affected);
      }
    } catch (err) {
      setTags(previousTags);
      setItems(previousItems);
      throw err;
    }
  }, [tags, items]);

  const loadSampleData = useCallback(async () => {
    const samples = getFreshSampleItems();
    setItems(prev => [...samples, ...prev]);
    try {
      await itemRepository.bulkUpdate(samples);
      await refreshItems();
    } catch (err) {
      await refreshItems();
      throw err;
    }
  }, [refreshItems]);

  useEffect(() => {
    const init = async () => {
      try {
        await tagRepository.seedIfEmpty();
        await locationRepository.seedIfEmpty();
        // Normalize legacy embedded base64 images into the binary images store
        // before loading items, so reads stay light on mobile.
        await normalizeEmbeddedImages();
        await Promise.all([refreshItems(), refreshTags(), refreshLocations()]);
        const savedLocation = localStorage.getItem('activeLocationId');
        if (savedLocation) setActiveLocationIdState(savedLocation);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [refreshItems, refreshTags, refreshLocations]);

  const value = useMemo(() => ({
    items,
    tags,
    locations,
    activeLocationId,
    setActiveLocationId,
    loading,
    error,
    refreshItems,
    refreshTags,
    refreshLocations,
    loadSampleData,
    addItem,
    updateItem,
    deleteItem,
    retireItem,
    batchMoveItemsLocation,
    addLocation,
    updateLocation,
    deleteLocation,
    addTag,
    updateTag,
    deleteTag,
  }), [
    items, tags, locations, activeLocationId, setActiveLocationId, loading, error,
    refreshItems, refreshTags, refreshLocations, loadSampleData,
    addItem, updateItem, deleteItem, retireItem, batchMoveItemsLocation,
    addLocation, updateLocation, deleteLocation,
    addTag, updateTag, deleteTag
  ]);

  return (
    <WardrobeContext.Provider value={value}>
      {children}
    </WardrobeContext.Provider>
  );
}

export function useWardrobe() {
  const ctx = useContext(WardrobeContext);
  if (!ctx) throw new Error('useWardrobe must be used within WardrobeProvider');
  return ctx;
}
