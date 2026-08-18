import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import CalendarTab from './CalendarTab';

// Mock ResolvedImage
vi.mock('./ResolvedImage', () => ({
  ResolvedImage: () => <div data-testid="resolved-image" />,
}));

// Mock WardrobeContext
vi.mock('../contexts/WardrobeContext', () => ({
  useWardrobe: () => ({
    items: [
      { id: 'item-1', name: 'Blue Oxford Shirt', category: 'top', tags: [], createdAt: 1000 },
      { id: 'item-2', name: 'Slim Chinos', category: 'bottom', tags: [], createdAt: 2000 },
    ],
    updateItem: vi.fn(),
  }),
}));

// Mock OutfitContext
vi.mock('../contexts/OutfitContext', () => ({
  useOutfits: () => ({
    outfits: [
      { id: 'outfit-1', name: 'Work Casual Look', itemIds: ['item-1', 'item-2'], createdAt: 1000 },
    ],
    plans: [],
    updateOutfit: vi.fn(),
    deletePlan: vi.fn(),
    updatePlan: vi.fn(),
    addPlan: vi.fn(),
    recordOutfitWear: vi.fn(),
  }),
}));

describe('CalendarTab & Drag & Plan', () => {
  it('renders Drag & Plan view with tabs and droppable calendar targets', () => {
    render(<CalendarTab />);

    // View tabs
    expect(screen.getByText(/Drag & Plan/i)).toBeInTheDocument();
    expect(screen.getByText(/Week View/i)).toBeInTheDocument();
    expect(screen.getByText(/Month View/i)).toBeInTheDocument();
    expect(screen.getByText(/Style Feed/i)).toBeInTheDocument();

    // Drag & Plan studio helper
    expect(screen.getByText(/Interactive Planner:/i)).toBeInTheDocument();
    expect(screen.getByText(/Wardrobe & Outfits Palette/i)).toBeInTheDocument();

    // Draggable outfit card
    expect(screen.getByText('Work Casual Look')).toBeInTheDocument();
    // Draggable items
    expect(screen.getByText('Blue Oxford Shirt')).toBeInTheDocument();
    expect(screen.getByText('Slim Chinos')).toBeInTheDocument();
  });

  it('switches between Week grid and Month grid in planner sub-views', () => {
    render(<CalendarTab />);

    const monthGridBtn = screen.getByRole('button', { name: /Month Grid/i });
    fireEvent.click(monthGridBtn);

    // Check weekday headers in month grid
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();

    const weekGridBtn = screen.getByRole('button', { name: /Week Grid/i });
    fireEvent.click(weekGridBtn);
    expect(screen.getByText(/Wardrobe & Outfits Palette/i)).toBeInTheDocument();
  });

  it('allows switching to other main views like Month View and Style Feed', () => {
    render(<CalendarTab />);

    const monthTabBtn = screen.getByRole('button', { name: /Month View/i });
    fireEvent.click(monthTabBtn);
    expect(screen.getByText('Today')).toBeInTheDocument();

    const feedTabBtn = screen.getByRole('button', { name: /Style Feed/i });
    fireEvent.click(feedTabBtn);
    expect(screen.getByPlaceholderText(/Search wear history/i)).toBeInTheDocument();
  });
});
