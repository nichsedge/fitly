import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MinimalismAnalyzerModal from './MinimalismAnalyzerModal';
import { ClothingItem } from '../lib/types';

const mockUpdateItem = vi.fn();
const mockDeleteItem = vi.fn();

const sampleItems: ClothingItem[] = [
  {
    id: 'item-1',
    name: 'White Linen Shirt',
    category: 'top',
    color: '#ffffff',
    tags: ['Casual'],
    images: [],
    status: 'ready',
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    sparkJoy: 'joy',
    wearLogs: [Date.now()],
  },
  {
    id: 'item-2',
    name: 'Old Unused Pants',
    category: 'bottom',
    color: '#1a1a1a',
    tags: ['Work'],
    images: [],
    status: 'ready',
    createdAt: Date.now() - 200 * 24 * 60 * 60 * 1000,
    sparkJoy: 'no-joy',
    wearLogs: [],
  },
  {
    id: 'item-3',
    name: 'Blue Denim Jacket',
    category: 'outerwear',
    color: '#2563eb',
    tags: ['Casual'],
    images: [],
    status: 'ready',
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
  },
];

vi.mock('../contexts/WardrobeContext', () => ({
  useWardrobe: () => ({
    items: sampleItems,
    updateItem: mockUpdateItem,
    deleteItem: mockDeleteItem,
  }),
}));

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({
    formatPrice: (p: number) => `$${p}`,
    t: (key: string) => {
      const dict: Record<string, string> = {
        minimalismAnalyzer: 'Marie Kondo Minimalism',
        minimalismDesc: 'Tokimeki joy audit, gratitude declutter & capsule harmony',
        joyScore: 'Joy Index',
        sparkJoyPrompt: 'Does this spark joy when you hold and wear it?',
        gratitudeRitual: 'Gratitude Declutter Ritual',
        auditCompletion: 'Audit Progress',
        startAudit: 'Start KonMari Audit',
        donate: 'Donate',
        sell: 'Sell',
        recycle: 'Recycle',
      };
      return dict[key] || key;
    },
  }),
}));

describe('MinimalismAnalyzerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders overview tab with Joy Index and score', () => {
    const handleClose = vi.fn();
    render(<MinimalismAnalyzerModal onClose={handleClose} />);

    expect(screen.getByText(/Marie Kondo Minimalism/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByText(/Joy Index/i)).toBeInTheDocument();
  });

  it('switches between tabs (Overview, Tokimeki Audit, Thank & Release, Capsule Guide)', () => {
    const handleClose = vi.fn();
    render(<MinimalismAnalyzerModal onClose={handleClose} />);

    // Click Tokimeki tab button
    const auditTabBtn = screen.getByRole('button', { name: /Tokimeki/i });
    fireEvent.click(auditTabBtn);
    expect(screen.getByText(/Does this spark joy/i)).toBeInTheDocument();

    // Click Release tab button
    const releaseTabBtn = screen.getByRole('button', { name: /Release/i });
    fireEvent.click(releaseTabBtn);
    expect(screen.getByText(/Gratitude Declutter Ritual/i)).toBeInTheDocument();

    // Click Capsule tab button
    const capsuleTabBtn = screen.getByRole('button', { name: /Capsule/i });
    fireEvent.click(capsuleTabBtn);
    expect(screen.getByText(/The 6 KonMari Rules of Tidying/i)).toBeInTheDocument();
  });

  it('handles Tokimeki audit decision and calls updateItem', async () => {
    const handleClose = vi.fn();
    render(<MinimalismAnalyzerModal onClose={handleClose} />);

    // Go to audit tab
    fireEvent.click(screen.getByRole('button', { name: /Tokimeki/i }));

    // Find the Sparks Joy button
    const joyBtn = screen.getByRole('button', { name: /Sparks Joy/i });
    fireEvent.click(joyBtn);

    await waitFor(() => {
      expect(mockUpdateItem).toHaveBeenCalled();
    });
  });

  it('handles Thank & Release action on a declutter candidate', async () => {
    const handleClose = vi.fn();
    render(<MinimalismAnalyzerModal onClose={handleClose} />);

    // Go to release tab
    fireEvent.click(screen.getByRole('button', { name: /Release/i }));

    // Click Donate
    const donateBtn = screen.getAllByRole('button', { name: /Donate/i })[0];
    fireEvent.click(donateBtn);

    await waitFor(() => {
      expect(mockUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          retiredAt: expect.any(Number),
          retirementReason: 'donated',
          sparkJoy: 'no-joy',
        })
      );
    });
  });
});
