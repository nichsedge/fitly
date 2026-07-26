import { ClothingItem, Category } from '../types';

export interface WardrobeStats {
  totalItems: number;
  totalValue: number;
  avgPrice: number;
  totalWears: number;
  avgCPW: number | null;
  dirtyCount: number;
  cleaningCount: number;
  readyCount: number;
  topWornItems: ClothingItem[];
  leastWornItems: ClothingItem[];
  categoryBreakdown: Record<Category, number>;
  brandBreakdown: { brand: string; count: number; value: number }[];
}

export function calculateWardrobeStats(items: ClothingItem[]): WardrobeStats {
  const totalItems = items.length;

  let totalValue = 0;
  let pricedItemCount = 0;
  let totalWears = 0;
  let cpwSum = 0;
  let cpwCount = 0;

  let dirtyCount = 0;
  let cleaningCount = 0;
  let readyCount = 0;

  const categoryBreakdown: Record<Category, number> = {
    top: 0,
    bottom: 0,
    underwear: 0,
    shoes: 0,
    outerwear: 0,
    accessory: 0,
    bag: 0,
  };

  const brandMap = new Map<string, { count: number; value: number }>();

  items.forEach((item) => {
    // Value
    if (item.price !== undefined && item.price > 0) {
      totalValue += item.price;
      pricedItemCount++;
    }

    // Wears
    const wears = item.wearLogs ? item.wearLogs.length : item.lastWornAt ? 1 : 0;
    totalWears += wears;

    // CPW
    if (item.price !== undefined && item.price > 0 && wears > 0) {
      cpwSum += item.price / wears;
      cpwCount++;
    }

    // Status
    if (item.status === 'dirty') dirtyCount++;
    else if (item.status === 'cleaning') cleaningCount++;
    else readyCount++;

    // Category
    if (item.category in categoryBreakdown) {
      categoryBreakdown[item.category]++;
    }

    // Brand
    if (item.brand && item.brand.trim() !== '') {
      const brand = item.brand.trim();
      const existing = brandMap.get(brand) || { count: 0, value: 0 };
      brandMap.set(brand, {
        count: existing.count + 1,
        value: existing.value + (item.price || 0),
      });
    }
  });

  const avgPrice = pricedItemCount > 0 ? totalValue / pricedItemCount : 0;
  const avgCPW = cpwCount > 0 ? cpwSum / cpwCount : null;

  // Top Worn Items
  const topWornItems = [...items]
    .filter((i) => (i.wearLogs?.length || 0) > 0)
    .sort((a, b) => (b.wearLogs?.length || 0) - (a.wearLogs?.length || 0))
    .slice(0, 5);

  // Least Worn Items
  const leastWornItems = [...items]
    .sort((a, b) => (a.wearLogs?.length || 0) - (b.wearLogs?.length || 0))
    .slice(0, 5);

  // Brand Breakdown
  const brandBreakdown = Array.from(brandMap.entries())
    .map(([brand, data]) => ({ brand, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalItems,
    totalValue,
    avgPrice,
    totalWears,
    avgCPW,
    dirtyCount,
    cleaningCount,
    readyCount,
    topWornItems,
    leastWornItems,
    categoryBreakdown,
    brandBreakdown,
  };
}
