import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useItemForm, itemToForm, isValidForm } from './useItemForm';
import { ClothingItem } from '../../lib/types';
import '@testing-library/jest-dom';

const baseItem = (overrides: Partial<ClothingItem> = {}): ClothingItem => ({
  id: 'i1',
  name: 'Oxford Shirt',
  category: 'top',
  color: '#1a1a1a',
  status: 'ready',
  createdAt: new Date('2024-03-15').getTime(),
  updatedAt: 0,
  brand: 'Uniqlo',
  price: 499000,
  purchaseDate: new Date('2024-01-02').getTime(),
  tags: ['work'],
  ...overrides,
} as ClothingItem);

describe('itemToForm', () => {
  it('converts item fields to form strings', () => {
    const form = itemToForm(baseItem());
    expect(form.name).toBe('Oxford Shirt');
    expect(form.brand).toBe('Uniqlo');
    expect(form.price).toBe('499000');
    expect(form.purchaseDate).toBe('2024-01-02');
    expect(form.locationId).toBe('loc-home'); // default
    expect(form.condition).toBe('good'); // default
  });

  it('falls back to empty strings for missing optional fields', () => {
    const form = itemToForm(baseItem({ brand: undefined, price: undefined, purchaseDate: undefined }));
    expect(form.brand).toBe('');
    expect(form.price).toBe('');
    expect(form.purchaseDate).toBe('');
  });
});

describe('useItemForm', () => {
  it('initializes from the item', () => {
    const { result } = renderHook(() => useItemForm(baseItem()));
    expect(result.current.fields.name).toBe('Oxford Shirt');
  });

  it('setField updates a single field immutably', () => {
    const { result } = renderHook(() => useItemForm(baseItem()));
    act(() => result.current.setField('name', 'New Name'));
    act(() => result.current.setField('price', '100'));
    expect(result.current.fields.name).toBe('New Name');
    expect(result.current.fields.price).toBe('100');
    expect(result.current.fields.brand).toBe('Uniqlo'); // untouched
  });

  it('reset restores original item values after edits', () => {
    const { result } = renderHook(() => useItemForm(baseItem()));
    act(() => result.current.setField('name', 'Changed'));
    act(() => result.current.reset());
    expect(result.current.fields.name).toBe('Oxford Shirt');
  });

  it('buildUpdatedItem trims strings and converts types back', () => {
    const { result } = renderHook(() => useItemForm(baseItem()));
    act(() => {
      result.current.setField('name', '  Padded Name  ');
      result.current.setField('brand', '   '); // blank -> undefined
      result.current.setField('price', '250000');
      result.current.setField('purchaseDate', '2024-06-01');
    });

    const updated = result.current.buildUpdatedItem();
    expect(updated.name).toBe('Padded Name');
    expect(updated.brand).toBeUndefined();
    expect(updated.price).toBe(250000);
    expect(updated.purchaseDate).toBe(new Date('2024-06-01').getTime());
    expect(updated.wearLogs).toBeUndefined(); // untouched fields pass through
  });

  it('buildUpdatedItem keeps wear logs from the original item', () => {
    const item = baseItem({ wearLogs: [111, 222] });
    const { result } = renderHook(() => useItemForm(item));
    act(() => result.current.setField('status', 'dirty'));
    const updated = result.current.buildUpdatedItem();
    expect(updated.wearLogs).toEqual([111, 222]);
    expect(updated.status).toBe('dirty');
  });
});

describe('isValidForm', () => {
  it('rejects blank/whitespace names', () => {
    expect(isValidForm({ ...itemToForm(baseItem()), name: '' })).toBe(false);
    expect(isValidForm({ ...itemToForm(baseItem()), name: '   ' })).toBe(false);
  });
  it('accepts a valid name', () => {
    expect(isValidForm(itemToForm(baseItem()))).toBe(true);
  });
});
