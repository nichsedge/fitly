import { Category, ItemCondition } from './types';

/** Draft item produced by CSV parsing; the caller assigns id/createdAt/images. */
export interface CsvItemDraft {
  name: string;
  category: Category;
  brand?: string;
  price?: number;
  color: string;
  tags: string[];
  condition: ItemCondition;
  material?: string;
  careInstructions?: string;
  locationId: string;
}

const CSV_HEADERS = ['id', 'name', 'category', 'brand', 'price', 'color', 'tags', 'status', 'condition', 'material', 'careInstructions', 'locationId', 'createdAt', 'wearCount'];

interface CsvExportableItem {
  id: string;
  name?: string;
  category: string;
  brand?: string;
  price?: number;
  color?: string;
  tags?: string[];
  status?: string;
  condition?: string;
  material?: string;
  careInstructions?: string;
  locationId?: string;
  createdAt?: number;
  wearLogs?: number[];
}

const quote = (value: string): string => `"${value.replace(/"/g, '""')}"`;

export function buildItemsCsv(items: CsvExportableItem[]): string {
  const rows = items.map(item => [
    item.id,
    quote(item.name || ''),
    item.category,
    quote(item.brand || ''),
    item.price || '',
    item.color,
    quote((item.tags || []).join(';')),
    item.status,
    item.condition || 'good',
    quote(item.material || ''),
    quote(item.careInstructions || ''),
    item.locationId || 'loc-home',
    item.createdAt ?? '',
    item.wearLogs ? item.wearLogs.length : 0,
  ].join(','));

  return [CSV_HEADERS.join(','), ...rows].join('\n');
}

const clean = (val: string | undefined): string =>
  (val || '').replace(/^"|"$/g, '').replace(/""/g, '"').trim();

/**
 * Parse the naive CSV format produced by buildItemsCsv.
 * Returns only rows with a usable name; header rows are skipped.
 */
export function parseItemsCsv(text: string): CsvItemDraft[] {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const drafts: CsvItemDraft[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 2) continue;

    const name = clean(parts[1]);
    if (!name || name.toLowerCase() === 'name') continue;

    drafts.push({
      name,
      category: (clean(parts[2]) as Category) || 'top',
      brand: clean(parts[3]) || undefined,
      price: parts[4] ? parseFloat(clean(parts[4])) || undefined : undefined,
      color: clean(parts[5]) || '#1a1a1a',
      tags: clean(parts[6]) ? clean(parts[6]).split(';').map(t => t.trim()) : [],
      condition: (clean(parts[8]) as ItemCondition) || 'good',
      material: clean(parts[9]) || undefined,
      careInstructions: clean(parts[10]) || undefined,
      locationId: clean(parts[11]) || 'loc-home',
    });
  }
  return drafts;
}

export function csvFilename(now: Date = new Date()): string {
  return `fitly-wardrobe-${now.toISOString().split('T')[0]}.csv`;
}
