import { describe, it, expect } from 'vitest';
import { konMariService, KONMARI_CATEGORY_ORDER } from './KonMariService';
import { ClothingItem } from '../lib/types';

describe('KonMariService', () => {
  const baseItem: ClothingItem = {
    id: 'item-1',
    name: 'White Oxford Shirt',
    category: 'top',
    color: '#f5f5f5',
    tags: ['Work', 'Casual'],
    images: [],
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    status: 'ready',
    wearLogs: [Date.now() - 5 * 24 * 60 * 60 * 1000],
  };

  it('handles empty wardrobe gracefully', () => {
    const stats = konMariService.calculateKonMariStats([]);
    expect(stats.totalItems).toBe(0);
    expect(stats.joyIndex).toBe(0);
    expect(stats.auditCompletionRate).toBe(100);
    expect(stats.minimalismScore).toBe(0);
    expect(stats.categories.length).toBe(KONMARI_CATEGORY_ORDER.length);
  });

  it('calculates Joy Index and audit completion rate correctly', () => {
    const items: ClothingItem[] = [
      { ...baseItem, id: '1', sparkJoy: 'joy' },
      { ...baseItem, id: '2', sparkJoy: 'essential' },
      { ...baseItem, id: '3', sparkJoy: 'no-joy' },
      { ...baseItem, id: '4' }, // unrated
    ];

    const stats = konMariService.calculateKonMariStats(items);
    expect(stats.totalItems).toBe(4);
    expect(stats.joyCount).toBe(1);
    expect(stats.essentialCount).toBe(1);
    expect(stats.noJoyCount).toBe(1);
    expect(stats.unratedCount).toBe(1);
    expect(stats.auditCompletionRate).toBe(75); // 3 out of 4 rated = 75%
    // Joy Index: (1 + 0.5) / 3 = 50%
    expect(stats.joyIndex).toBe(50);
  });

  it('excludes retired items from active stats but counts retiredCount', () => {
    const items: ClothingItem[] = [
      { ...baseItem, id: '1', sparkJoy: 'joy' },
      { ...baseItem, id: '2', sparkJoy: 'no-joy', retiredAt: Date.now(), retirementReason: 'donated' },
    ];

    const stats = konMariService.calculateKonMariStats(items);
    expect(stats.totalItems).toBe(1);
    expect(stats.retiredCount).toBe(1);
    expect(stats.joyCount).toBe(1);
    expect(stats.noJoyCount).toBe(0);
  });

  it('identifies duplicate clusters when multiple items share category and color with low wear', () => {
    const items: ClothingItem[] = [
      { ...baseItem, id: '1', category: 'top', color: '#1a1a1a', wearLogs: [] },
      { ...baseItem, id: '2', category: 'top', color: '#1a1a1a', wearLogs: [] },
      { ...baseItem, id: '3', category: 'top', color: '#1a1a1a', wearLogs: [Date.now()] },
    ];

    const clusters = konMariService.getDuplicateClusters(items);
    expect(clusters.length).toBe(1);
    expect(clusters[0].itemCount).toBe(3);
    expect(clusters[0].unwornCount).toBe(3); // wearCount <= 1 counts
  });

  it('returns declutter candidates prioritizing no-joy items', () => {
    const items: ClothingItem[] = [
      { ...baseItem, id: '1', sparkJoy: 'joy', wearLogs: [Date.now()] },
      { ...baseItem, id: '2', sparkJoy: 'no-joy', wearLogs: [Date.now()] },
      { ...baseItem, id: '3', condition: 'poor', wearLogs: [] },
    ];

    const candidates = konMariService.getDeclutterCandidates(items);
    expect(candidates.map(c => c.id)).toEqual(['2', '3']);
  });

  it('generates thoughtful gratitude prompts', () => {
    const faithfulItem: ClothingItem = { ...baseItem, wearLogs: new Array(20).fill(Date.now()) };
    const unwornItem: ClothingItem = { ...baseItem, wearLogs: [] };

    const prompt1 = konMariService.getGratitudePrompt(faithfulItem);
    expect(prompt1).toContain('serving me faithfully');

    const prompt2 = konMariService.getGratitudePrompt(unwornItem);
    expect(prompt2).toContain('teaching me');
  });

  it('orders audit queue with unrated items first in KonMari sequence', () => {
    const items: ClothingItem[] = [
      { ...baseItem, id: '1', category: 'shoes', sparkJoy: 'joy' },
      { ...baseItem, id: '2', category: 'bottom' }, // unrated
      { ...baseItem, id: '3', category: 'top' }, // unrated
    ];

    const queue = konMariService.getAuditQueue(items);
    // Unrated items first in KonMari order: top ('3') then bottom ('2'), then rated shoes ('1')
    expect(queue.map(i => i.id)).toEqual(['3', '2', '1']);
  });
});
