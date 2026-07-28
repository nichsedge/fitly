export type Category = 'top' | 'bottom' | 'underwear' | 'shoes' | 'outerwear' | 'accessory' | 'bag';

export interface CustomTag {
  id: string;
  label: string;
}

export interface WardrobeLocation {
  id: string;
  name: string;
  icon?: string;
  isDefault?: boolean;
}

export const DEFAULT_LOCATIONS: WardrobeLocation[] = [
  { id: 'loc-home', name: 'Home', icon: 'home', isDefault: true },
  { id: 'loc-rent', name: 'Rent Room', icon: 'building-2', isDefault: true },
];

export const DEFAULT_TAG_NAMES = ['Casual', 'Formal', 'Gym', 'Party', 'Work', 'Streetwear', 'Beach', 'Date Night'];

export type ItemStatus = 'ready' | 'dirty' | 'cleaning';

export type ItemCondition = 'new' | 'excellent' | 'good' | 'fair' | 'poor' | 'needs-repair' | 'retired';

export type RetirementReason = 'donated' | 'sold' | 'recycled' | 'discarded';

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
  lastWashedAt?: number;
  washLogs?: number[]; // array of timestamps when washed
  locationId?: string;
  retiredAt?: number;
  retirementReason?: RetirementReason;
  donationTarget?: string;
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

export type ActiveTab = 'wardrobe' | 'outfits' | 'laundry' | 'calendar' | 'trips' | 'add' | 'insights';

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'underwear', label: 'Underwear' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'bag', label: 'Bag' },
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

export function getColorLabel(hex: string): string {
  if (!hex) return 'Unknown';
  const found = COLORS.find(c => c.value.toLowerCase() === hex.toLowerCase());
  if (found) return found.label;

  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return hex;

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;

  let minDistance = Infinity;
  let closestLabel = hex;

  COLORS.forEach(c => {
    const cHex = c.value.replace('#', '');
    const cr = parseInt(cHex.substring(0, 2), 16);
    const cg = parseInt(cHex.substring(2, 4), 16);
    const cb = parseInt(cHex.substring(4, 6), 16);

    const dist = Math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2);
    if (dist < minDistance) {
      minDistance = dist;
      closestLabel = `${c.label} (${hex.toUpperCase()})`;
    }
  });

  return closestLabel;
}

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
