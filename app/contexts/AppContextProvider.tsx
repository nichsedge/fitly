'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { SettingsProvider, useSettings } from './SettingsContext';
import { WardrobeProvider, useWardrobe } from './WardrobeContext';
import { OutfitProvider, useOutfits } from './OutfitContext';
import { LaundryProvider } from './LaundryContext';
import { TripProvider, useTrips } from './TripContext';
import { ClothingItem, Outfit, CustomTag, WardrobeLocation, Trip } from '../lib/types';
import { restoreFromBackup } from '../lib/db';

interface UnifiedAppState {
  // From Wardrobe
  items: ReturnType<typeof useWardrobe>['items'];
  tags: ReturnType<typeof useWardrobe>['tags'];
  locations: ReturnType<typeof useWardrobe>['locations'];
  activeLocationId: ReturnType<typeof useWardrobe>['activeLocationId'];
  setActiveLocationId: ReturnType<typeof useWardrobe>['setActiveLocationId'];
  refreshItems: ReturnType<typeof useWardrobe>['refreshItems'];
  refreshTags: ReturnType<typeof useWardrobe>['refreshTags'];
  refreshLocations: ReturnType<typeof useWardrobe>['refreshLocations'];
  loadSampleData: ReturnType<typeof useWardrobe>['loadSampleData'];
  addItem: ReturnType<typeof useWardrobe>['addItem'];
  updateItem: ReturnType<typeof useWardrobe>['updateItem'];
  deleteItem: ReturnType<typeof useWardrobe>['deleteItem'];
  batchMoveItemsLocation: ReturnType<typeof useWardrobe>['batchMoveItemsLocation'];
  addLocation: ReturnType<typeof useWardrobe>['addLocation'];
  updateLocation: ReturnType<typeof useWardrobe>['updateLocation'];
  deleteLocation: ReturnType<typeof useWardrobe>['deleteLocation'];
  addTag: ReturnType<typeof useWardrobe>['addTag'];
  updateTag: ReturnType<typeof useWardrobe>['updateTag'];
  deleteTag: ReturnType<typeof useWardrobe>['deleteTag'];

  // From Outfits
  outfits: ReturnType<typeof useOutfits>['outfits'];
  plans: ReturnType<typeof useOutfits>['plans'];
  refreshOutfits: ReturnType<typeof useOutfits>['refreshOutfits'];
  refreshPlans: ReturnType<typeof useOutfits>['refreshPlans'];
  addOutfit: ReturnType<typeof useOutfits>['addOutfit'];
  updateOutfit: ReturnType<typeof useOutfits>['updateOutfit'];
  deleteOutfit: ReturnType<typeof useOutfits>['deleteOutfit'];
  addPlan: ReturnType<typeof useOutfits>['addPlan'];
  updatePlan: ReturnType<typeof useOutfits>['updatePlan'];
  deletePlan: ReturnType<typeof useOutfits>['deletePlan'];

  // From Trips
  trips: ReturnType<typeof useTrips>['trips'];
  refreshTrips: ReturnType<typeof useTrips>['refreshTrips'];
  addTrip: ReturnType<typeof useTrips>['addTrip'];
  updateTrip: ReturnType<typeof useTrips>['updateTrip'];
  deleteTrip: ReturnType<typeof useTrips>['deleteTrip'];

  // From Settings
  theme: ReturnType<typeof useSettings>['theme'];
  toggleTheme: ReturnType<typeof useSettings>['toggleTheme'];
  currency: ReturnType<typeof useSettings>['currency'];
  setCurrency: ReturnType<typeof useSettings>['setCurrency'];
  language: ReturnType<typeof useSettings>['language'];
  setLanguage: ReturnType<typeof useSettings>['setLanguage'];
  t: ReturnType<typeof useSettings>['t'];
  formatPrice: ReturnType<typeof useSettings>['formatPrice'];
  isOffline: ReturnType<typeof useSettings>['isOffline'];
  isInstallable: ReturnType<typeof useSettings>['isInstallable'];
  promptInstallApp: ReturnType<typeof useSettings>['promptInstallApp'];

  // Combined Loading & Backup
  loading: boolean;
  restoreBackup: (items: ClothingItem[], outfits: Outfit[], tags?: CustomTag[], locations?: WardrobeLocation[], trips?: Trip[]) => Promise<void>;
}

const LoadingContext = createContext<boolean>(true);
const RestoreBackupContext = createContext<((items: ClothingItem[], outfits: Outfit[], tags?: CustomTag[], locations?: WardrobeLocation[], trips?: Trip[]) => Promise<void>) | null>(null);

const AppContext = createContext<UnifiedAppState | null>(null);

function AppStateBridge({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const wardrobe = useWardrobe();
  const outfits = useOutfits();
  const trips = useTrips();

  const loading = wardrobe.loading || outfits.loading || trips.loading;

  const restoreBackupData = useCallback(async (
    newItems: ClothingItem[],
    newOutfits: Outfit[],
    newTags?: CustomTag[],
    newLocations?: WardrobeLocation[],
    newTrips?: Trip[]
  ) => {
    await restoreFromBackup(newItems, newOutfits, newTags, newLocations, newTrips);
    await Promise.all([
      wardrobe.refreshItems(),
      wardrobe.refreshTags(),
      wardrobe.refreshLocations(),
      outfits.refreshOutfits(),
      trips.refreshTrips(),
    ]);
  }, [wardrobe, outfits, trips]);

  const value = useMemo(() => ({
    // Wardrobe
    items: wardrobe.items,
    tags: wardrobe.tags,
    locations: wardrobe.locations,
    activeLocationId: wardrobe.activeLocationId,
    setActiveLocationId: wardrobe.setActiveLocationId,
    refreshItems: wardrobe.refreshItems,
    refreshTags: wardrobe.refreshTags,
    refreshLocations: wardrobe.refreshLocations,
    loadSampleData: wardrobe.loadSampleData,
    addItem: wardrobe.addItem,
    updateItem: wardrobe.updateItem,
    deleteItem: wardrobe.deleteItem,
    batchMoveItemsLocation: wardrobe.batchMoveItemsLocation,
    addLocation: wardrobe.addLocation,
    updateLocation: wardrobe.updateLocation,
    deleteLocation: wardrobe.deleteLocation,
    addTag: wardrobe.addTag,
    updateTag: wardrobe.updateTag,
    deleteTag: wardrobe.deleteTag,

    // Outfits
    outfits: outfits.outfits,
    plans: outfits.plans,
    refreshOutfits: outfits.refreshOutfits,
    refreshPlans: outfits.refreshPlans,
    addOutfit: outfits.addOutfit,
    updateOutfit: outfits.updateOutfit,
    deleteOutfit: outfits.deleteOutfit,
    addPlan: outfits.addPlan,
    updatePlan: outfits.updatePlan,
    deletePlan: outfits.deletePlan,

    // Trips
    trips: trips.trips,
    refreshTrips: trips.refreshTrips,
    addTrip: trips.addTrip,
    updateTrip: trips.updateTrip,
    deleteTrip: trips.deleteTrip,

    // Settings
    theme: settings.theme,
    toggleTheme: settings.toggleTheme,
    currency: settings.currency,
    setCurrency: settings.setCurrency,
    language: settings.language,
    setLanguage: settings.setLanguage,
    t: settings.t,
    formatPrice: settings.formatPrice,
    isOffline: settings.isOffline,
    isInstallable: settings.isInstallable,
    promptInstallApp: settings.promptInstallApp,

    // Combined
    loading,
    restoreBackup: restoreBackupData,
  }), [wardrobe, outfits, trips, settings, loading, restoreBackupData]);

  return (
    <LoadingContext.Provider value={loading}>
      <RestoreBackupContext.Provider value={restoreBackupData}>
        <AppContext.Provider value={value}>
          {children}
        </AppContext.Provider>
      </RestoreBackupContext.Provider>
    </LoadingContext.Provider>
  );
}

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <WardrobeProvider>
        <OutfitProvider>
          <LaundryProvider>
            <TripProvider>
              <AppStateBridge>
                {children}
              </AppStateBridge>
            </TripProvider>
          </LaundryProvider>
        </OutfitProvider>
      </WardrobeProvider>
    </SettingsProvider>
  );
}

export function useAppLoading() {
  return useContext(LoadingContext);
}

export function useRestoreBackup() {
  const ctx = useContext(RestoreBackupContext);
  if (!ctx) throw new Error('useRestoreBackup must be used within AppContextProvider');
  return ctx;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppContextProvider');
  return ctx;
}
