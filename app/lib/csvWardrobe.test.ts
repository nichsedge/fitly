import { describe, it, expect } from 'vitest';
import { buildItemsCsv, parseItemsCsv, csvFilename } from './csvWardrobe';
import { ClothingItem } from './types';

const item = (overrides: Partial<ClothingItem> = {}): ClothingItem => ({
  id: 'i1',
  name: 'Oxford Shirt',
  category: 'top',
  color: '#1a1a1a',
  status: 'ready',
  condition: 'good',
  createdAt: 1700000000000,
  ...overrides,
} as ClothingItem);

describe('buildItemsCsv', () => {
  it('produces a header row plus one row per item', () => {
    const csv = buildItemsCsv([item()]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('id,name,category');
  });

  it('quotes fields containing quotes and joins tags with semicolons', () => {
    const csv = buildItemsCsv([
      item({ name: 'Shirt "Limited"', tags: ['work', 'casual'] }),
    ]);
    expect(csv).toContain('"Shirt ""Limited"""');
    expect(csv).toContain('"work;casual"');
  });

  it('defaults condition to good and locationId to loc-home', () => {
    const csv = buildItemsCsv([item({ condition: undefined })]);
    expect(csv.split('\n')[1]).toContain(',good,');
    expect(csv.split('\n')[1]).toContain('loc-home');
  });
});

describe('parseItemsCsv', () => {
  it('returns empty array for header-only or empty input', () => {
    expect(parseItemsCsv('')).toEqual([]);
    expect(parseItemsCsv(buildItemsCsv([]))).toEqual([]);
  });

  it('round-trips items through export and parse', () => {
    const original = item({
      name: 'Linen Pants',
      brand: 'Uniqlo',
      price: 750000,
      color: '#f5f5f5',
      tags: ['summer', 'work'],
      material: '100% Linen',
      careInstructions: 'Cold wash',
      locationId: 'loc-office',
      condition: 'excellent',
    });
    const drafts = parseItemsCsv(buildItemsCsv([original]));
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      name: 'Linen Pants',
      category: 'top',
      brand: 'Uniqlo',
      price: 750000,
      color: '#f5f5f5',
      tags: ['summer', 'work'],
      condition: 'excellent',
      material: '100% Linen',
      careInstructions: 'Cold wash',
      locationId: 'loc-office',
    });
  });

  it('skips rows without a usable name and header-like rows', () => {
    const csv = [
      'id,name,category',
      'i1,,top', // empty name -> skipped
      'i2,Real Item,bottom',
    ].join('\n');
    const drafts = parseItemsCsv(csv);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({ name: 'Real Item', category: 'bottom' });
  });

  it('applies defaults for missing optional fields', () => {
    const drafts = parseItemsCsv('id,name,category\nx1,Bare,top');
    expect(drafts[0]).toMatchObject({
      color: '#1a1a1a',
      tags: [],
      condition: 'good',
      locationId: 'loc-home',
    });
    expect(drafts[0].brand).toBeUndefined();
    expect(drafts[0].price).toBeUndefined();
  });
});

describe('csvFilename', () => {
  it('uses ISO date in the filename', () => {
    expect(csvFilename(new Date('2024-06-15T12:00:00Z'))).toBe('fitly-wardrobe-2024-06-15.csv');
  });
});
