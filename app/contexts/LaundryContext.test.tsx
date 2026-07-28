import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LaundryProvider, useLaundry } from './LaundryContext';

// Mock WardrobeContext
vi.mock('./WardrobeContext', () => ({
  useWardrobe: () => ({
    items: [],
    updateItem: vi.fn(),
  }),
}));

function TestComponent() {
  const { laundryCategories, setLaundryCategories } = useLaundry();
  return (
    <div>
      <span data-testid="categories">{JSON.stringify(laundryCategories)}</span>
      <button
        data-testid="update-btn"
        onClick={() => setLaundryCategories(['shoes', 'accessories'])}
      >
        Update
      </button>
    </div>
  );
}

describe('LaundryContext persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with default categories when localStorage is empty', () => {
    render(
      <LaundryProvider>
        <TestComponent />
      </LaundryProvider>
    );

    const categoriesText = screen.getByTestId('categories').textContent;
    expect(JSON.parse(categoriesText || '[]')).toEqual(['top', 'bottom', 'underwear', 'outerwear']);
  });

  it('initializes from localStorage if saved categories exist', () => {
    localStorage.setItem('laundryCategories', JSON.stringify(['shoes', 'onepiece']));

    render(
      <LaundryProvider>
        <TestComponent />
      </LaundryProvider>
    );

    const categoriesText = screen.getByTestId('categories').textContent;
    expect(JSON.parse(categoriesText || '[]')).toEqual(['shoes', 'onepiece']);
  });

  it('saves updated categories to localStorage when modified', () => {
    render(
      <LaundryProvider>
        <TestComponent />
      </LaundryProvider>
    );

    act(() => {
      screen.getByTestId('update-btn').click();
    });

    const saved = localStorage.getItem('laundryCategories');
    expect(saved).not.toBeNull();
    expect(JSON.parse(saved!)).toEqual(['shoes', 'accessories']);
  });
});
