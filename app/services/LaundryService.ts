import { ClothingItem, Category } from '../lib/types';

export class LaundryService {
  private defaultLaundryCategories: Category[] = ['top', 'bottom', 'underwear', 'outerwear'];

  getWornItems(
    items: ClothingItem[],
    selectedCategories: Category[] = this.defaultLaundryCategories,
    showAll: boolean = false
  ): Array<{ item: ClothingItem; wearsSinceWash: number }> {
    const allWorn = items
      .map(item => {
        const lastWash = item.lastWashedAt || 0;
        const wearsSinceWash = (item.wearLogs || []).filter(ts => ts > lastWash).length;
        return { item, wearsSinceWash };
      })
      .filter(entry => entry.wearsSinceWash > 0 || entry.item.status === 'dirty' || entry.item.status === 'cleaning')
      .sort((a, b) => b.wearsSinceWash - a.wearsSinceWash);

    if (showAll) return allWorn;
    return allWorn.filter(({ item }) => selectedCategories.includes(item.category));
  }

  getWashHistory(items: ClothingItem[]): Array<{ key: string; date: Date; items: ClothingItem[] }> {
    const historyMap: Record<string, { date: Date; items: ClothingItem[] }> = {};
    items.forEach(item => {
      const logs = (item.washLogs && item.washLogs.length > 0) ? item.washLogs : (item.lastWashedAt ? [item.lastWashedAt] : []);
      logs.forEach(ts => {
        const d = new Date(ts);
        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!historyMap[dayKey]) historyMap[dayKey] = { date: d, items: [] };
        if (!historyMap[dayKey].items.find(i => i.id === item.id)) {
          historyMap[dayKey].items.push(item);
        }
      });
    });
    return Object.entries(historyMap)
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  createWashedItemUpdate(item: ClothingItem, timestamp: number = Date.now()): ClothingItem {
    const existingLogs = (item.washLogs && item.washLogs.length > 0) ? item.washLogs : (item.lastWashedAt ? [item.lastWashedAt] : []);
    return {
      ...item,
      lastWashedAt: timestamp,
      washLogs: [...existingLogs, timestamp],
      status: 'ready',
    };
  }

  getDayKey(ts: number): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

export const laundryService = new LaundryService();
