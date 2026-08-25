import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WardrobeView from './WardrobeView';
import OutfitsView from './OutfitsView';

// Mock WardrobeContext
vi.mock('../contexts/WardrobeContext', () => ({
  useWardrobe: () => ({
    items: [
      { id: 'item-1', name: 'Shirt 1', category: 'top', tags: [], createdAt: 1000 },
    ],
    tags: [],
    locations: [],
    activeLocationId: 'all',
    loadSampleData: vi.fn(),
    updateItem: vi.fn(),
    batchMoveItemsLocation: vi.fn(),
  }),
}));

// Mock SettingsContext
vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({
    t: (key: string) => key,
  }),
}));

// Mock OutfitContext
vi.mock('../contexts/OutfitContext', () => ({
  useOutfits: () => ({
    outfits: [
      { id: '1', name: 'Outfit 1', itemIds: [], createdAt: 1000 },
      { id: '2', name: 'Outfit 2', itemIds: [], createdAt: 2000 },
    ],
    addOutfit: vi.fn(),
  }),
}));

describe('Sort by state persistence across view changes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists WardrobeView sort selection in localStorage across remounts', () => {
    const { unmount } = render(<WardrobeView />);
    
    const select = screen.getByLabelText('Sort items') as HTMLSelectElement;
    expect(select.value).toBe('newest');

    // Change sort option to "most-worn"
    fireEvent.change(select, { target: { value: 'most-worn' } });
    expect(select.value).toBe('most-worn');
    expect(localStorage.getItem('fitly_wardrobe_sort_by')).toBe('most-worn');

    // Simulate changing page (unmounting component)
    unmount();

    // Simulate returning to page (remounting component)
    render(<WardrobeView />);
    const remountedSelect = screen.getByLabelText('Sort items') as HTMLSelectElement;
    expect(remountedSelect.value).toBe('most-worn');
  });

  it('persists OutfitsView sort selection in localStorage across remounts', () => {
    const { unmount } = render(<OutfitsView />);

    const select = screen.getByLabelText('Sort outfits') as HTMLSelectElement;
    expect(select.value).toBe('newest');

    // Change sort option to "name"
    fireEvent.change(select, { target: { value: 'name' } });
    expect(select.value).toBe('name');
    expect(localStorage.getItem('fitly_outfits_sort_by')).toBe('name');

    // Simulate changing page (unmounting component)
    unmount();

    // Simulate returning to page (remounting component)
    render(<OutfitsView />);
    const remountedSelect = screen.getByLabelText('Sort outfits') as HTMLSelectElement;
    expect(remountedSelect.value).toBe('name');
  });
});
