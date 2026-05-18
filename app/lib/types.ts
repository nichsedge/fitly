export type Category = 'top' | 'bottom' | 'shoes' | 'outerwear' | 'accessory' | 'bag';

export interface CustomTag {
  id: string;
  label: string;
}

export const DEFAULT_TAG_NAMES = ['Casual', 'Formal', 'Gym', 'Party', 'Work', 'Streetwear', 'Beach', 'Date Night'];

export type ItemStatus = 'ready' | 'dirty' | 'cleaning';

export type ItemCondition = 'new' | 'excellent' | 'good' | 'fair' | 'poor' | 'needs-repair' | 'retired';

export interface ClothingItem {
  id: string;
  name: string;
  category: Category;
  color: string;
  tags: string[];
  images: string[]; // array of base64 data URLs
  createdAt: number;
  lastWornAt?: number; // legacy, keeping for compatibility during migration
  wearLogs?: number[]; // array of timestamps when worn
  brand?: string;
  price?: number;
  purchaseDate?: number;
  status: ItemStatus;
  material?: string;
  careInstructions?: string;
  condition?: ItemCondition;
}

export interface Outfit {
  id: string;
  name: string;
  note: string;
  itemIds: string[];
  createdAt: number;
  lastWornAt?: number; // legacy
  wearLogs?: number[];
}

export interface PlannedOutfit {
  id: string;
  date: string; // YYYY-MM-DD
  outfitId?: string;
  itemIds: string[];
  note?: string;
  weather?: {
    temp?: number;
    icon?: string;
    description?: string;
  };
}

export type ActiveTab = 'wardrobe' | 'outfits' | 'calendar' | 'add' | 'insights';

export const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'top', label: 'Top', emoji: '👕' },
  { value: 'bottom', label: 'Bottom', emoji: '👖' },
  { value: 'shoes', label: 'Shoes', emoji: '👟' },
  { value: 'outerwear', label: 'Outerwear', emoji: '🧥' },
  { value: 'accessory', label: 'Accessory', emoji: '⌚' },
  { value: 'bag', label: 'Bag', emoji: '👜' },
];


export const COLORS = [
  { value: '#1a1a1a', label: 'Black' },
  { value: '#f5f5f5', label: 'White' },
  { value: '#6b7280', label: 'Gray' },
  { value: '#dc2626', label: 'Red' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#16a34a', label: 'Green' },
  { value: '#ca8a04', label: 'Yellow' },
  { value: '#9333ea', label: 'Purple' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#db2777', label: 'Pink' },
  { value: '#854d0e', label: 'Brown' },
  { value: '#0e7490', label: 'Teal' },
  { value: '#1d4ed8', label: 'Navy' },
  { value: '#d4a373', label: 'Beige' },
];

export interface Trip {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  itemIds: string[];
  outfitIds?: string[];
  destination?: string;
  completed?: boolean;
}

