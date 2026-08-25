'use client';

import { useState } from 'react';
import { ClothingItem, Category, ItemStatus, ItemCondition, SparkJoyStatus } from '../../lib/types';

export interface ItemFormData {
  name: string;
  brand: string;
  price: string;
  purchaseDate: string;
  category: Category;
  locationId: string;
  color: string;
  status: ItemStatus;
  condition: ItemCondition;
  material: string;
  careInstructions: string;
  tags: string[];
  sparkJoy: SparkJoyStatus | undefined;
}

const formatDateForInput = (timestamp?: number): string => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function itemToForm(item: ClothingItem): ItemFormData {
  return {
    name: item.name,
    brand: item.brand || '',
    price: item.price !== undefined ? String(item.price) : '',
    purchaseDate: formatDateForInput(item.purchaseDate),
    category: item.category,
    locationId: item.locationId || 'loc-home',
    color: item.color,
    status: item.status,
    condition: item.condition || 'good',
    material: item.material || '',
    careInstructions: item.careInstructions || '',
    tags: item.tags || [],
    sparkJoy: item.sparkJoy,
  };
}

/**
 * Form state hook for editing an item's details.
 * Keeps raw string values while editing; converts back on save.
 */
export function useItemForm(item: ClothingItem) {
  const [fields, setFields] = useState<ItemFormData>(() => itemToForm(item));

  const setField = <K extends keyof ItemFormData>(key: K, value: ItemFormData[K]) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const reset = () => setFields(itemToForm(item));

  /** Build the persisted ClothingItem from current form values. */
  const buildUpdatedItem = (): ClothingItem => ({
    ...item,
    name: fields.name.trim(),
    category: fields.category,
    locationId: fields.locationId || 'loc-home',
    brand: fields.brand.trim() || undefined,
    price: fields.price.trim() !== '' ? parseFloat(fields.price) : undefined,
    purchaseDate: fields.purchaseDate ? new Date(fields.purchaseDate).getTime() : undefined,
    color: fields.color,
    status: fields.status,
    condition: fields.condition,
    material: fields.material.trim() || undefined,
    careInstructions: fields.careInstructions.trim() || undefined,
    tags: fields.tags,
    sparkJoy: fields.sparkJoy,
  });

  return { fields, setField, reset, buildUpdatedItem };
}

export function isValidForm(fields: ItemFormData): boolean {
  return fields.name.trim().length > 0;
}
