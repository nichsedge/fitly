'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ClothingItem, Outfit, CustomTag, PlannedOutfit, WardrobeLocation } from '../lib/types';
import * as db from '../lib/db';
import { getFreshSampleItems } from '../lib/seedData';
import { Language, Currency, translations, formatCurrency } from '../lib/i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface AppState {
  items: ClothingItem[];
  outfits: Outfit[];
  tags: CustomTag[];
  plans: PlannedOutfit[];
  locations: WardrobeLocation[];
  activeLocationId: string; // 'all' or specific location id
  setActiveLocationId: (id: string) => void;
  loading: boolean;
  isOffline: boolean;
  isInstallable: boolean;
  currency: Currency;
  language: Language;
  setCurrency: (c: Currency) => void;
  setLanguage: (l: Language) => void;
  t: (key: keyof typeof translations['en']) => string;
  formatPrice: (amount: number | undefined | null) => string;
  promptInstallApp: () => Promise<void>;
  loadSampleData: () => Promise<void>;
  refreshItems: () => Promise<void>;
  refreshOutfits: () => Promise<void>;
  refreshTags: () => Promise<void>;
  refreshPlans: () => Promise<void>;
  refreshLocations: () => Promise<void>;
  addItem: (item: ClothingItem) => Promise<void>;
  updateItem: (item: ClothingItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  batchMoveItemsLocation: (itemIds: string[], locationId: string) => Promise<void>;
  addLocation: (loc: WardrobeLocation) => Promise<void>;
  updateLocation: (loc: WardrobeLocation) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  addOutfit: (outfit: Outfit) => Promise<void>;
  updateOutfit: (outfit: Outfit) => Promise<void>;
  deleteOutfit: (id: string) => Promise<void>;
  addPlan: (plan: PlannedOutfit) => Promise<void>;
  updatePlan: (plan: PlannedOutfit) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  addTag: (tag: CustomTag) => Promise<void>;
  updateTag: (tag: CustomTag, oldLabel: string) => Promise<void>;
  deleteTag: (id: string, label: string) => Promise<void>;
  restoreBackup: (items: ClothingItem[], outfits: Outfit[], tags?: CustomTag[]) => Promise<void>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [tags, setTags] = useState<CustomTag[]>([]);
  const [plans, setPlans] = useState<PlannedOutfit[]>([]);
  const [locations, setLocations] = useState<WardrobeLocation[]>([]);
  const [activeLocationId, setActiveLocationIdState] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currency, setCurrencyState] = useState<Currency>('IDR');
  const [language, setLanguageState] = useState<Language>('en');
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const setActiveLocationId = useCallback((id: string) => {
    setActiveLocationIdState(id);
    localStorage.setItem('activeLocationId', id);
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('currency', c);
  }, []);

  const setLanguage = useCallback((l: Language) => {
    setLanguageState(l);
    localStorage.setItem('language', l);
  }, []);

  const t = useCallback((key: keyof typeof translations['en']): string => {
    const langDict = translations[language] || translations.en;
    return langDict[key] || translations.en[key] || String(key);
  }, [language]);

  const formatPrice = useCallback((amount: number | undefined | null): string => {
    return formatCurrency(amount, currency);
  }, [currency]);

  const refreshItems = useCallback(async () => {
    const all = await db.getAllItems();
    setItems(all.sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  const refreshOutfits = useCallback(async () => {
    const all = await db.getAllOutfits();
    setOutfits(all.sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  const refreshTags = useCallback(async () => {
    const all = await db.getAllTags();
    setTags(all.sort((a, b) => a.label.localeCompare(b.label)));
  }, []);

  const refreshPlans = useCallback(async () => {
    const all = await db.getAllPlans();
    setPlans(all.sort((a, b) => a.date.localeCompare(b.date)));
  }, []);

  const refreshLocations = useCallback(async () => {
    const all = await db.getAllLocations();
    setLocations(all);
  }, []);

  useEffect(() => {
    const init = async () => {
      // Theme init
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.dataset.theme = savedTheme;
      } else {
        document.documentElement.dataset.theme = 'dark';
      }

      // Active location init
      const savedLocation = localStorage.getItem('activeLocationId');
      if (savedLocation) {
        setActiveLocationIdState(savedLocation);
      }

      // Currency init
      const savedCurrency = localStorage.getItem('currency') as Currency | null;
      if (savedCurrency && ['IDR', 'USD', 'EUR', 'GBP'].includes(savedCurrency)) {
        setCurrencyState(savedCurrency);
      } else {
        setCurrencyState('IDR');
      }

      // Language init
      const savedLang = localStorage.getItem('language') as Language | null;
      if (savedLang && ['en', 'id'].includes(savedLang)) {
        setLanguageState(savedLang);
      } else {
        setLanguageState('en');
      }

      // Online/Offline tracking
      if (typeof window !== 'undefined') {
        setIsOffline(!navigator.onLine);
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // PWA beforeinstallprompt handler
        const handleBeforeInstall = (e: Event) => {
          e.preventDefault();
          setDeferredPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
      }
    };

    init().then(async () => {
      await db.seedTagsIfEmpty();
      await db.seedLocationsIfEmpty();
      await Promise.all([refreshItems(), refreshOutfits(), refreshTags(), refreshPlans(), refreshLocations()]);
      setLoading(false);
    });
  }, [refreshItems, refreshOutfits, refreshTags, refreshPlans, refreshLocations]);

  const loadSampleData = useCallback(async () => {
    const sampleItems = getFreshSampleItems();
    await Promise.all(sampleItems.map(item => db.addItem(item)));
    await refreshItems();
  }, [refreshItems]);

  const promptInstallApp = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.dataset.theme = next;
  }, [theme]);

  const addItem = useCallback(async (item: ClothingItem) => {
    await db.addItem(item);
    await refreshItems();
  }, [refreshItems]);

  const updateItem = useCallback(async (item: ClothingItem) => {
    await db.updateItem(item);
    await refreshItems();
  }, [refreshItems]);

  const deleteItem = useCallback(async (id: string) => {
    await db.deleteItem(id);
    await refreshItems();
  }, [refreshItems]);

  const batchMoveItemsLocation = useCallback(async (itemIds: string[], locationId: string) => {
    for (const id of itemIds) {
      const item = items.find(i => i.id === id);
      if (item) {
        await db.updateItem({ ...item, locationId });
      }
    }
    await refreshItems();
  }, [items, refreshItems]);

  const addLocation = useCallback(async (loc: WardrobeLocation) => {
    await db.addLocation(loc);
    await refreshLocations();
  }, [refreshLocations]);

  const updateLocation = useCallback(async (loc: WardrobeLocation) => {
    await db.updateLocation(loc);
    await refreshLocations();
  }, [refreshLocations]);

  const deleteLocation = useCallback(async (id: string) => {
    await db.deleteLocation(id);
    // Reassign items with deleted location to default home
    const affected = items.filter(i => i.locationId === id);
    for (const item of affected) {
      await db.updateItem({ ...item, locationId: 'loc-home' });
    }
    await refreshLocations();
    await refreshItems();
  }, [items, refreshLocations, refreshItems]);

  const addOutfit = useCallback(async (outfit: Outfit) => {
    await db.addOutfit(outfit);
    await refreshOutfits();
  }, [refreshOutfits]);

  const updateOutfit = useCallback(async (outfit: Outfit) => {
    await db.updateOutfit(outfit);
    await refreshOutfits();
  }, [refreshOutfits]);

  const deleteOutfit = useCallback(async (id: string) => {
    await db.deleteOutfit(id);
    await refreshOutfits();
  }, [refreshOutfits]);

  const addPlan = useCallback(async (plan: PlannedOutfit) => {
    await db.addPlan(plan);
    await refreshPlans();
  }, [refreshPlans]);

  const updatePlan = useCallback(async (plan: PlannedOutfit) => {
    await db.updatePlan(plan);
    await refreshPlans();
  }, [refreshPlans]);

  const deletePlan = useCallback(async (id: string) => {
    await db.deletePlan(id);
    await refreshPlans();
  }, [refreshPlans]);

  const addTag = useCallback(async (tag: CustomTag) => {
    await db.addTag(tag);
    await refreshTags();
  }, [refreshTags]);

  const updateTag = useCallback(async (updatedTag: CustomTag, oldLabel: string) => {
    await db.updateTag(updatedTag);
    const itemsToUpdate = items.filter(item => item.tags.includes(oldLabel));
    for (const item of itemsToUpdate) {
      await db.updateItem({
        ...item,
        tags: item.tags.map(t => t === oldLabel ? updatedTag.label : t)
      });
    }
    await refreshTags();
    await refreshItems();
  }, [items, refreshTags, refreshItems]);

  const deleteTag = useCallback(async (id: string, label: string) => {
    await db.deleteTag(id);
    const itemsToUpdate = items.filter(item => item.tags.includes(label));
    for (const item of itemsToUpdate) {
      await db.updateItem({
        ...item,
        tags: item.tags.filter(t => t !== label)
      });
    }
    await refreshTags();
    await refreshItems();
  }, [items, refreshTags, refreshItems]);

  const restoreBackup = useCallback(async (newItems: ClothingItem[], newOutfits: Outfit[], newTags?: CustomTag[]) => {
    await db.restoreFromBackup(newItems, newOutfits, newTags);
    await refreshItems();
    await refreshOutfits();
    await refreshTags();
  }, [refreshItems, refreshOutfits, refreshTags]);

  return (
    <AppContext.Provider value={{
      items, outfits, tags, plans, locations, activeLocationId, setActiveLocationId, loading,
      isOffline,
      isInstallable: !!deferredPrompt,
      currency,
      language,
      setCurrency,
      setLanguage,
      t,
      formatPrice,
      promptInstallApp,
      loadSampleData,
      refreshItems, refreshOutfits, refreshTags, refreshPlans, refreshLocations,
      addItem, updateItem, deleteItem, batchMoveItemsLocation,
      addLocation, updateLocation, deleteLocation,
      addOutfit, updateOutfit, deleteOutfit,
      addPlan, updatePlan, deletePlan,
      addTag, updateTag, deleteTag,
      restoreBackup,
      theme,
      toggleTheme,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
