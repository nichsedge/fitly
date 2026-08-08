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

describe('Grid/List view mode state persistence across page navigation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists WardrobeView grid/list and density selection in localStorage across remounts', () => {
    const { unmount } = render(<WardrobeView />);
    
    const gridBtn = screen.getByTitle('Grid View');
    const compactBtn = screen.getByTitle('Compact View');
    const listBtn = screen.getByTitle('List View');

    // Default should be grid view with normal density
    expect(gridBtn.getAttribute('aria-pressed')).toBe('true');
    expect(compactBtn.getAttribute('aria-pressed')).toBe('false');
    expect(listBtn.getAttribute('aria-pressed')).toBe('false');

    // Select List View
    fireEvent.click(listBtn);
    expect(listBtn.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('fitly_wardrobe_view_mode')).toBe('list');

    // Simulate changing page (unmounting component)
    unmount();

    // Simulate returning to WardrobeView (remounting component)
    render(<WardrobeView />);
    const remountedListBtn = screen.getByTitle('List View');
    expect(remountedListBtn.getAttribute('aria-pressed')).toBe('true');

    // Select Compact View
    const remountedCompactBtn = screen.getByTitle('Compact View');
    fireEvent.click(remountedCompactBtn);
    expect(remountedCompactBtn.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('fitly_wardrobe_view_mode')).toBe('grid');
    expect(localStorage.getItem('fitly_wardrobe_grid_density')).toBe('compact');
  });

  it('persists OutfitsView view mode selection in localStorage across remounts', () => {
    const { unmount } = render(<OutfitsView />);

    const gridBtn = screen.getByLabelText('View mode toggle').children[0];
    const listBtn = screen.getByLabelText('View mode toggle').children[1];

    expect(gridBtn.getAttribute('aria-pressed')).toBe('true');
    expect(listBtn.getAttribute('aria-pressed')).toBe('false');

    // Switch to list view
    fireEvent.click(listBtn);
    expect(listBtn.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('fitly_outfits_view_mode')).toBe('list');

    // Simulate changing page (unmounting component)
    unmount();

    // Simulate returning to OutfitsView (remounting component)
    render(<OutfitsView />);
    const remountedListBtn = screen.getByLabelText('View mode toggle').children[1];
    expect(remountedListBtn.getAttribute('aria-pressed')).toBe('true');
  });
});
