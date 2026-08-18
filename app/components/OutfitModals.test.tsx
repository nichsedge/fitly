import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OutfitDetailModal from './OutfitDetailModal';
import LogWearModal from './LogWearModal';
import { Outfit, ClothingItem } from '../lib/types';

const mockUpdateItem = vi.fn();
const mockDeleteOutfit = vi.fn();
const mockUpdateOutfit = vi.fn();
const mockAddOutfit = vi.fn();

vi.mock('../contexts/WardrobeContext', () => ({
  useWardrobe: () => ({
    items: [],
    updateItem: mockUpdateItem,
  }),
}));

vi.mock('../contexts/OutfitContext', () => ({
  useOutfits: () => ({
    outfits: [],
    deleteOutfit: mockDeleteOutfit,
    updateOutfit: mockUpdateOutfit,
    addOutfit: mockAddOutfit,
  }),
}));

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({
    formatPrice: (p: number) => `$${p}`,
  }),
}));

describe('OutfitDetailModal and LogWearModal updates', () => {
  const sampleOutfit: Outfit = {
    id: 'outfit-123',
    name: 'Summer Look',
    note: 'Great for warm days',
    itemIds: ['item-1'],
    createdAt: 1700000000000,
  };

  const sampleItems: ClothingItem[] = [
    {
      id: 'item-1',
      name: 'Linen Shirt',
      category: 'top',
      color: '#ffffff',
      tags: [],
      images: [],
      status: 'ready',
      createdAt: 1700000000000,
    },
  ];

  it('renders top action buttons in OutfitDetailModal including duplicate button and handles duplication', async () => {
    const handleClose = vi.fn();
    const handleEdit = vi.fn();

    render(
      <OutfitDetailModal
        outfit={sampleOutfit}
        items={sampleItems}
        onClose={handleClose}
        onEdit={handleEdit}
      />
    );

    // Verify button presence and IDs
    const wearBtn = screen.getByRole('button', { name: /wearing this today/i });
    expect(wearBtn.id).toBe('btn-wear-outfit');

    const duplicateBtn = screen.getByRole('button', { name: /duplicate/i });
    expect(duplicateBtn.id).toBe('btn-duplicate-outfit');

    const editBtn = screen.getByRole('button', { name: /edit outfit/i });
    expect(editBtn.id).toBe('btn-edit-outfit');

    const deleteBtn = screen.getByRole('button', { name: /delete outfit/i });
    expect(deleteBtn.id).toBe('btn-delete-outfit');

    // Click duplicate button
    fireEvent.click(duplicateBtn);

    expect(mockAddOutfit).toHaveBeenCalledTimes(1);
    const createdOutfit = mockAddOutfit.mock.calls[0][0];
    expect(createdOutfit.name).toBe('Summer Look');
    expect(createdOutfit.note).toBe('Great for warm days');
    expect(createdOutfit.itemIds).toEqual(['item-1']);
    expect(createdOutfit.id).not.toBe('outfit-123');
    expect(typeof createdOutfit.id).toBe('string');
    expect(createdOutfit.createdAt).toBeGreaterThan(0);

    // Wait for toast and close callback
    await waitFor(() => {
      expect(screen.getByText('✓ Outfit duplicated')).toBeInTheDocument();
    });
  });

  it('sorts outfits alphabetically case-insensitively in LogWearModal', () => {
    const unsortedOutfits: Outfit[] = [
      { id: '1', name: 'zebra outfit', note: '', itemIds: [], createdAt: 100 },
      { id: '2', name: 'Alpha style', note: '', itemIds: [], createdAt: 200 },
      { id: '3', name: '', note: '', itemIds: [], createdAt: 300 }, // Untitled Outfit
      { id: '4', name: 'beta look', note: '', itemIds: [], createdAt: 400 },
      { id: '5', name: 'Active wear', note: '', itemIds: [], createdAt: 500 },
    ];

    render(
      <LogWearModal
        isOpen={true}
        onClose={vi.fn()}
        outfits={unsortedOutfits}
        items={[]}
      />
    );

    const outfitHeadings = screen.getAllByText(/Active wear|Alpha style|beta look|Untitled Outfit|zebra outfit/i);
    const displayedNames = outfitHeadings.map(el => el.textContent);

    expect(displayedNames).toEqual([
      'Active wear',
      'Alpha style',
      'beta look',
      'Untitled Outfit',
      'zebra outfit',
    ]);
  });
});
