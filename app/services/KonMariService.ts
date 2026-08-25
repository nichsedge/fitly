import { ClothingItem, Category } from '../lib/types';

export const KONMARI_CATEGORY_ORDER: Category[] = [
  'top',
  'bottom',
  'outerwear',
  'shoes',
  'bag',
  'accessory',
  'underwear',
];

export interface KonMariCategoryStat {
  category: Category;
  label: string;
  count: number;
  joyCount: number;
  essentialCount: number;
  noJoyCount: number;
  unratedCount: number;
  targetMin: number;
  targetMax: number;
  isOverTarget: boolean;
}

export interface DuplicateCluster {
  id: string;
  category: Category;
  colorOrTag: string;
  itemCount: number;
  unwornCount: number;
  items: ClothingItem[];
  suggestion: string;
}

export interface KonMariStats {
  totalItems: number;
  joyCount: number;
  essentialCount: number;
  noJoyCount: number;
  unratedCount: number;
  retiredCount: number;
  joyIndex: number; // 0-100%
  auditCompletionRate: number; // 0-100%
  minimalismScore: number; // 0-100
  hibernatingCount: number;
  clutterCount: number;
  declutterQueueCount: number;
  utilizationRate: number; // 0-100%
  categories: KonMariCategoryStat[];
  minimalismStage: 'Overloaded' | 'Transitioning' | 'Intentional' | 'Mastered';
  minimalismStageDescription: string;
}

export const IDEAL_CAPSULE_BENCHMARKS: Record<Category, { min: number; max: number; label: string }> = {
  top: { min: 8, max: 18, label: 'Tops & Shirts' },
  bottom: { min: 4, max: 10, label: 'Pants & Skirts' },
  outerwear: { min: 2, max: 6, label: 'Jackets & Coats' },
  shoes: { min: 3, max: 8, label: 'Footwear' },
  bag: { min: 2, max: 5, label: 'Bags & Packs' },
  accessory: { min: 3, max: 12, label: 'Accessories' },
  underwear: { min: 7, max: 16, label: 'Undergarments' },
};

export class KonMariService {
  /**
   * Calculates comprehensive KonMari minimalism and Tokimeki stats for the wardrobe.
   */
  calculateKonMariStats(items: ClothingItem[]): KonMariStats {
    const activeItems = items.filter(i => !i.retiredAt);
    const retiredCount = items.filter(i => !!i.retiredAt).length;
    const totalItems = activeItems.length;

    let joyCount = 0;
    let essentialCount = 0;
    let noJoyCount = 0;
    let unratedCount = 0;

    const now = Date.now();
    const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

    let hibernatingCount = 0;
    let wornRecentlyCount = 0;

    activeItems.forEach(item => {
      if (item.sparkJoy === 'joy') joyCount++;
      else if (item.sparkJoy === 'essential') essentialCount++;
      else if (item.sparkJoy === 'no-joy') noJoyCount++;
      else unratedCount++;

      const lastWorn = item.wearLogs && item.wearLogs.length > 0
        ? Math.max(...item.wearLogs)
        : (item.lastWornAt || 0);

      const isHibernating = (item.createdAt < sixMonthsAgo && lastWorn < sixMonthsAgo);
      if (isHibernating) hibernatingCount++;

      const wornRecently = item.wearLogs?.some(t => t >= sixtyDaysAgo) || lastWorn >= sixtyDaysAgo;
      if (wornRecently) wornRecentlyCount++;
    });

    const ratedCount = joyCount + essentialCount + noJoyCount;
    const joyIndex = ratedCount > 0
      ? Math.round(((joyCount + (essentialCount * 0.5)) / ratedCount) * 100)
      : 0;

    const auditCompletionRate = totalItems > 0
      ? Math.round((ratedCount / totalItems) * 100)
      : 100;

    const utilizationRate = totalItems > 0
      ? Math.round((wornRecentlyCount / totalItems) * 100)
      : 0;

    // Clutter includes items explicitly marked no-joy, plus hibernating unworn items
    const clutterCount = noJoyCount + activeItems.filter(i => i.sparkJoy !== 'joy' && i.createdAt < sixMonthsAgo && (!i.wearLogs || i.wearLogs.length === 0)).length;

    // Minimalism composite score (0-100)
    let minimalismScore = 0;
    if (totalItems > 0) {
      // 1. Joy ratio (40% weight)
      const joyScore = ratedCount > 0 ? (joyCount / ratedCount) * 40 : 20;
      // 2. Active rotation / utilization (35% weight)
      const utilScore = (utilizationRate / 100) * 35;
      // 3. Low clutter penalty (25% weight)
      const clutterRatio = Math.min(1, (clutterCount / Math.max(1, totalItems)));
      const cleanlinessScore = Math.max(0, (1 - clutterRatio) * 25);

      minimalismScore = Math.min(100, Math.max(0, Math.round(joyScore + utilScore + cleanlinessScore)));
    }

    // Category breakdown in official KonMari sequence
    const categories: KonMariCategoryStat[] = KONMARI_CATEGORY_ORDER.map(cat => {
      const benchmark = IDEAL_CAPSULE_BENCHMARKS[cat];
      const catItems = activeItems.filter(i => i.category === cat);
      const cJoy = catItems.filter(i => i.sparkJoy === 'joy').length;
      const cEssential = catItems.filter(i => i.sparkJoy === 'essential').length;
      const cNoJoy = catItems.filter(i => i.sparkJoy === 'no-joy').length;
      const cUnrated = catItems.filter(i => !i.sparkJoy).length;

      return {
        category: cat,
        label: benchmark.label,
        count: catItems.length,
        joyCount: cJoy,
        essentialCount: cEssential,
        noJoyCount: cNoJoy,
        unratedCount: cUnrated,
        targetMin: benchmark.min,
        targetMax: benchmark.max,
        isOverTarget: catItems.length > benchmark.max,
      };
    });

    let minimalismStage: KonMariStats['minimalismStage'] = 'Intentional';
    let minimalismStageDescription = 'Your closet is balanced and mindful.';

    if (minimalismScore >= 85) {
      minimalismStage = 'Mastered';
      minimalismStageDescription = 'Pure Tokimeki. Every piece serves an intentional purpose or sparks authentic joy.';
    } else if (minimalismScore >= 65) {
      minimalismStage = 'Intentional';
      minimalismStageDescription = 'A mindful wardrobe with high utility and strong joy alignment.';
    } else if (minimalismScore >= 40) {
      minimalismStage = 'Transitioning';
      minimalismStageDescription = 'Good progress, but several dormant or unworn items are cluttering your space.';
    } else {
      minimalismStage = 'Overloaded';
      minimalismStageDescription = 'Significant clutter detected. Time to conduct a category-by-category KonMari audit.';
    }

    return {
      totalItems,
      joyCount,
      essentialCount,
      noJoyCount,
      unratedCount,
      retiredCount,
      joyIndex,
      auditCompletionRate,
      minimalismScore,
      hibernatingCount,
      clutterCount,
      declutterQueueCount: noJoyCount,
      utilizationRate,
      categories,
      minimalismStage,
      minimalismStageDescription,
    };
  }

  /**
   * Organizes items by category in the official KonMari tidying sequence.
   */
  getItemsByCategoryInKonMariOrder(items: ClothingItem[]): Array<{ category: Category; items: ClothingItem[] }> {
    const active = items.filter(i => !i.retiredAt);
    return KONMARI_CATEGORY_ORDER.map(cat => ({
      category: cat,
      items: active.filter(i => i.category === cat),
    })).filter(group => group.items.length > 0);
  }

  /**
   * Returns items ready for review during the Tokimeki audit.
   * Can filter by category or return all unrated items first, followed by already-rated items.
   */
  getAuditQueue(items: ClothingItem[], category?: Category | 'all'): ClothingItem[] {
    const active = items.filter(i => !i.retiredAt);
    const filtered = (!category || category === 'all')
      ? active
      : active.filter(i => i.category === category);

    // Unrated items first, then sort by KonMari category order
    return [...filtered].sort((a, b) => {
      const aRated = a.sparkJoy ? 1 : 0;
      const bRated = b.sparkJoy ? 1 : 0;
      if (aRated !== bRated) return aRated - bRated;

      const aCatIndex = KONMARI_CATEGORY_ORDER.indexOf(a.category);
      const bCatIndex = KONMARI_CATEGORY_ORDER.indexOf(b.category);
      return aCatIndex - bCatIndex;
    });
  }

  /**
   * Detects clusters of duplicate or redundant items that may be adding clutter.
   */
  getDuplicateClusters(items: ClothingItem[]): DuplicateCluster[] {
    const active = items.filter(i => !i.retiredAt);
    const clusters: DuplicateCluster[] = [];

    // Group by category and color
    const groupMap = new Map<string, ClothingItem[]>();

    active.forEach(item => {
      const key = `${item.category}__${item.color?.toLowerCase() || 'nocolor'}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(item);
    });

    const now = Date.now();
    const threeMonthsAgo = now - 90 * 24 * 60 * 60 * 1000;

    groupMap.forEach((groupItems, key) => {
      if (groupItems.length >= 3) {
        const [category] = key.split('__') as [Category, string];
        const unwornOrRare = groupItems.filter(item => {
          const lastWorn = item.wearLogs && item.wearLogs.length > 0
            ? Math.max(...item.wearLogs)
            : (item.lastWornAt || 0);
          const wears = item.wearLogs?.length || 0;
          return wears <= 1 || (item.createdAt < threeMonthsAgo && lastWorn < threeMonthsAgo);
        });

        if (unwornOrRare.length >= 2) {
          clusters.push({
            id: key,
            category,
            colorOrTag: groupItems[0].color || 'same color',
            itemCount: groupItems.length,
            unwornCount: unwornOrRare.length,
            items: groupItems,
            suggestion: `You have ${groupItems.length} similar ${category}s, but ${unwornOrRare.length} are rarely worn. Consider keeping only your favorites.`,
          });
        }
      }
    });

    return clusters;
  }

  /**
   * Returns items recommended for the "Thank & Release" gratitude declutter studio.
   */
  getDeclutterCandidates(items: ClothingItem[]): ClothingItem[] {
    const active = items.filter(i => !i.retiredAt);
    const now = Date.now();
    const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;

    return active.filter(item => {
      // 1. Explicitly marked as no-joy
      if (item.sparkJoy === 'no-joy') return true;

      // 2. Poor condition and rarely worn
      if ((item.condition === 'poor' || item.condition === 'needs-repair') && (!item.wearLogs || item.wearLogs.length <= 1)) {
        return true;
      }

      // 3. Unworn for > 6 months and added > 6 months ago
      const lastWorn = item.wearLogs && item.wearLogs.length > 0
        ? Math.max(...item.wearLogs)
        : (item.lastWornAt || 0);
      if (item.createdAt < sixMonthsAgo && lastWorn < sixMonthsAgo && (!item.wearLogs || item.wearLogs.length <= 1)) {
        return true;
      }

      return false;
    }).sort((a, b) => {
      // no-joy first
      if (a.sparkJoy === 'no-joy' && b.sparkJoy !== 'no-joy') return -1;
      if (b.sparkJoy === 'no-joy' && a.sparkJoy !== 'no-joy') return 1;
      return (a.wearLogs?.length || 0) - (b.wearLogs?.length || 0);
    });
  }

  /**
   * Generates warm, contextual KonMari gratitude reflections when letting an item go.
   */
  getGratitudePrompt(item: ClothingItem): string {
    const wearCount = item.wearLogs?.length || 0;

    if (wearCount >= 15) {
      return `Thank you for being my go-to ${item.name} and serving me faithfully through so many great moments.`;
    }

    if (wearCount >= 3) {
      return `Thank you for keeping me styled and confident whenever I wore you.`;
    }

    if (wearCount === 1 || wearCount === 2) {
      return `Thank you for being there for that special occasion and giving me an experience to remember.`;
    }

    // Unworn items
    return `Thank you for teaching me what cuts and colors don't fit my lifestyle, giving me clarity for the future.`;
  }
}

export const konMariService = new KonMariService();
