'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Outfit, PlannedOutfit, ClothingItem } from '../lib/types';
import { outfitRepository } from '../repositories/OutfitRepository';
import { planRepository } from '../repositories/PlanRepository';
import { outfitService } from '../services/OutfitService';
import { useWardrobe } from './WardrobeContext';

interface OutfitState {
  outfits: Outfit[];
  plans: PlannedOutfit[];
  loading: boolean;
  error: Error | null;
  refreshOutfits: () => Promise<void>;
  refreshPlans: () => Promise<void>;
  addOutfit: (outfit: Outfit) => Promise<void>;
  updateOutfit: (outfit: Outfit) => Promise<void>;
  deleteOutfit: (id: string) => Promise<void>;
  addPlan: (plan: PlannedOutfit) => Promise<void>;
  updatePlan: (plan: PlannedOutfit) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  recordOutfitWear: (outfitId: string) => Promise<void>;
  getSuggestion: (items: ClothingItem[]) => ClothingItem[];
}

const OutfitContext = createContext<OutfitState | null>(null);

export function OutfitProvider({ children }: { children: React.ReactNode }) {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [plans, setPlans] = useState<PlannedOutfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const wardrobe = useWardrobe();

  const refreshOutfits = useCallback(async () => {
    try {
      const all = await outfitRepository.getAll();
      setOutfits(all.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const refreshPlans = useCallback(async () => {
    try {
      const all = await planRepository.getAll();
      setPlans(all.sort((a, b) => a.date.localeCompare(b.date)));
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const addOutfit = useCallback(async (outfit: Outfit) => {
    setOutfits(prev => [outfit, ...prev]);
    try {
      await outfitRepository.add(outfit);
    } catch (err) {
      setOutfits(prev => prev.filter(o => o.id !== outfit.id));
      throw err;
    }
  }, []);

  const updateOutfit = useCallback(async (outfit: Outfit) => {
    const previous = outfits;
    setOutfits(prev => prev.map(o => o.id === outfit.id ? outfit : o));
    try {
      await outfitRepository.update(outfit);
    } catch (err) {
      setOutfits(previous);
      throw err;
    }
  }, [outfits]);

  const deleteOutfit = useCallback(async (id: string) => {
    const previous = outfits;
    setOutfits(prev => prev.filter(o => o.id !== id));
    try {
      await outfitRepository.delete(id);
    } catch (err) {
      setOutfits(previous);
      throw err;
    }
  }, [outfits]);

  const addPlan = useCallback(async (plan: PlannedOutfit) => {
    setPlans(prev => [...prev, plan].sort((a, b) => a.date.localeCompare(b.date)));
    try {
      await planRepository.add(plan);
    } catch (err) {
      setPlans(prev => prev.filter(p => p.id !== plan.id));
      throw err;
    }
  }, []);

  const updatePlan = useCallback(async (plan: PlannedOutfit) => {
    const previous = plans;
    setPlans(prev => prev.map(p => p.id === plan.id ? plan : p).sort((a, b) => a.date.localeCompare(b.date)));
    try {
      await planRepository.update(plan);
    } catch (err) {
      setPlans(previous);
      throw err;
    }
  }, [plans]);

  const deletePlan = useCallback(async (id: string) => {
    const previous = plans;
    setPlans(prev => prev.filter(p => p.id !== id));
    try {
      await planRepository.delete(id);
    } catch (err) {
      setPlans(previous);
      throw err;
    }
  }, [plans]);

  const recordOutfitWear = useCallback(async (outfitId: string) => {
    const outfit = outfits.find(o => o.id === outfitId);
    if (!outfit) return;

    const now = Date.now();
    const updatedOutfit = {
      ...outfit,
      wearLogs: [...(outfit.wearLogs || []), now],
    };

    setOutfits(prev => prev.map(o => o.id === outfitId ? updatedOutfit : o));
    try {
      await outfitRepository.update(updatedOutfit);
      // Update individual items' wearLogs
      for (const itemId of outfit.itemIds) {
        const item = wardrobe.items.find(i => i.id === itemId);
        if (item) {
          await wardrobe.updateItem({
            ...item,
            wearLogs: [...(item.wearLogs || []), now],
          });
        }
      }
    } catch (err) {
      await refreshOutfits();
      throw err;
    }
  }, [outfits, wardrobe, refreshOutfits]);

  const getSuggestion = useCallback((items: ClothingItem[]) => {
    return outfitService.getSuggestion(items);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([refreshOutfits(), refreshPlans()]);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [refreshOutfits, refreshPlans]);

  const value = useMemo(() => ({
    outfits,
    plans,
    loading,
    error,
    refreshOutfits,
    refreshPlans,
    addOutfit,
    updateOutfit,
    deleteOutfit,
    addPlan,
    updatePlan,
    deletePlan,
    recordOutfitWear,
    getSuggestion,
  }), [
    outfits, plans, loading, error,
    refreshOutfits, refreshPlans,
    addOutfit, updateOutfit, deleteOutfit,
    addPlan, updatePlan, deletePlan,
    recordOutfitWear, getSuggestion
  ]);

  return (
    <OutfitContext.Provider value={value}>
      {children}
    </OutfitContext.Provider>
  );
}

export function useOutfits() {
  const ctx = useContext(OutfitContext);
  if (!ctx) throw new Error('useOutfits must be used within OutfitProvider');
  return ctx;
}
