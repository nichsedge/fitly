import { v4 as uuidv4 } from 'uuid';
import { ClothingItem } from './types';

const colorMap: Record<string, string> = {
  hitam: '#1a1a1a',
  navy: '#1d4ed8',
  biru: '#2563eb',
  coklat: '#854d0e',
  putih: '#f5f5f5',
  abu: '#6b7280',
  cream: '#d4a373',
  mocca: '#854d0e',
  merah: '#dc2626',
  hijau: '#16a34a',
  kuning: '#ca8a04',
};

function inferColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, hex] of Object.entries(colorMap)) {
    if (lower.includes(keyword)) return hex;
  }
  return '#6b7280';
}

export function getFreshSampleItems(): ClothingItem[] {
  const now = Date.now();
  return [
    // Outerwear
    { id: uuidv4(), name: 'Black Jacket', category: 'outerwear', color: inferColor('hitam'), tags: ['Casual', 'Work'], images: [], createdAt: now - 11000, status: 'ready', condition: 'good' },
    { id: uuidv4(), name: 'Navy Blazer', category: 'outerwear', color: inferColor('navy'), tags: ['Formal', 'Work'], images: [], createdAt: now - 10000, status: 'ready', condition: 'excellent' },
    { id: uuidv4(), name: 'Blue Flannel', category: 'outerwear', color: inferColor('biru'), tags: ['Casual', 'Streetwear'], images: [], createdAt: now - 9000, status: 'ready', condition: 'good' },

    // Tops
    { id: uuidv4(), name: 'Brown Henley Shirt', category: 'top', color: inferColor('coklat'), tags: ['Casual'], images: [], createdAt: now - 8000, status: 'ready', condition: 'good' },
    { id: uuidv4(), name: 'Blue Denim Shirt', category: 'top', color: inferColor('biru'), tags: ['Casual', 'Streetwear'], images: [], createdAt: now - 7000, status: 'ready', condition: 'good' },
    { id: uuidv4(), name: 'White Crew Tee', category: 'top', color: inferColor('putih'), tags: ['Casual', 'Basic'], images: [], createdAt: now - 6000, status: 'ready', condition: 'new' },
    { id: uuidv4(), name: 'Grey Heather Tee', category: 'top', color: inferColor('abu'), tags: ['Casual', 'Basic'], images: [], createdAt: now - 5000, status: 'ready', condition: 'good' },

    // Bottoms
    { id: uuidv4(), name: 'Cream Chinos', category: 'bottom', color: inferColor('cream'), tags: ['Casual', 'Work'], images: [], createdAt: now - 4000, status: 'ready', condition: 'good' },
    { id: uuidv4(), name: 'Black Slim Jeans', category: 'bottom', color: inferColor('hitam'), tags: ['Casual', 'Streetwear'], images: [], createdAt: now - 3000, status: 'ready', condition: 'excellent' },
    { id: uuidv4(), name: 'Grey Tailored Trousers', category: 'bottom', color: inferColor('abu'), tags: ['Formal', 'Work'], images: [], createdAt: now - 2000, status: 'ready', condition: 'good' },

    // Shoes
    { id: uuidv4(), name: 'White Leather Sneakers', category: 'shoes', color: inferColor('putih'), tags: ['Casual', 'Basic'], images: [], createdAt: now - 1000, status: 'ready', condition: 'good' },
  ];
}

export const DEFAULT_ITEMS = getFreshSampleItems();
