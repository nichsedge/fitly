'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ClothingItem, Category } from '../lib/types';
import { laundryService } from '../services/LaundryService';
import { useWardrobe } from './WardrobeContext';

interface LaundryState {
  laundryCategories: Category[];
  setLaundryCategories: (categories: Category[]) => void;
  getWornItems: (showAll?: boolean) => Array<{ item: ClothingItem; wearsSinceWash: number }>;
  getWashHistory: () => Array<{ key: string; date: Date; items: ClothingItem[] }>;
  markWashed: (item: ClothingItem) => Promise<void>;
  markAllWashed: (items: ClothingItem[]) => Promise<void>;
  deleteWashSession: (dayKey: string, washedItems: ClothingItem[]) => Promise<void>;
}

const LaundryContext = createContext<LaundryState | null>(null);

export function LaundryProvider({ children }: { children: React.ReactNode }) {
  const [laundryCategories, setLaundryCategoriesState] = useState<Category[]>([
    'top', 'bottom', 'underwear', 'outerwear'
  ]);
  const wardrobe = useWardrobe();

  const setLaundryCategories = useCallback((cats: Category[]) => {
    setLaundryCategoriesState(cats);
    localStorage.setItem('laundryCategories', JSON.stringify(cats));
  }, []);

  const getWornItems = useCallback((showAll: boolean = false) => {
    return laundryService.getWornItems(wardrobe.items, laundryCategories, showAll);
  }, [wardrobe.items, laundryCategories]);

  const getWashHistory = useCallback(() => {
    return laundryService.getWashHistory(wardrobe.items);
  }, [wardrobe.items]);

  const markWashed = useCallback(async (item: ClothingItem) => {
    const updated = laundryService.createWashedItemUpdate(item);
    await wardrobe.updateItem(updated);
  }, [wardrobe]);

  const markAllWashed = useCallback(async (itemsToWash: ClothingItem[]) => {
    const now = Date.now();
    for (const item of itemsToWash) {
      const updated = laundryService.createWashedItemUpdate(item, now);
      await wardrobe.updateItem(updated);
    }
  }, [wardrobe]);

  const deleteWashSession = useCallback(async (dayKey: string, washedItems: ClothingItem[]) => {
    for (const item of washedItems) {
      const updatedWashLogs = (item.washLogs || []).filter(ts => laundryService.getDayKey(ts) !== dayKey);
      const newLastWashedAt = updatedWashLogs.length > 0 ? Math.max(...updatedWashLogs) : 0;
      await wardrobe.updateItem({
        ...item,
        washLogs: updatedWashLogs,
        lastWashedAt: newLastWashedAt,
      });
    }
  }, [wardrobe]);

  const value = useMemo(() => ({
    laundryCategories,
    setLaundryCategories,
    getWornItems,
    getWashHistory,
    markWashed,
    markAllWashed,
    deleteWashSession,
  }), [
    laundryCategories, setLaundryCategories,
    getWornItems, getWashHistory,
    markWashed, markAllWashed, deleteWashSession
  ]);

  return (
    <LaundryContext.Provider value={value}>
      {children}
    </LaundryContext.Provider>
  );
}

export function useLaundry() {
  const ctx = useContext(LaundryContext);
  if (!ctx) throw new Error('useLaundry must be used within LaundryProvider');
  return ctx;
}
