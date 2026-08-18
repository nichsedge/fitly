import { z } from 'zod';

export const CategorySchema = z.enum([
  'top',
  'bottom',
  'underwear',
  'shoes',
  'outerwear',
  'accessory',
  'bag',
]);

export const ItemStatusSchema = z.enum(['ready', 'dirty', 'cleaning']);

export const ItemConditionSchema = z.enum([
  'new',
  'excellent',
  'good',
  'fair',
  'poor',
  'needs-repair',
  'retired',
]);

export const CustomTagSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export const WardrobeLocationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().nullable().optional(),
  isDefault: z.boolean().nullable().optional(),
});

export const ClothingItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Item name is required'),
  category: CategorySchema,
  color: z.string().default('#1a1a1a'),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  createdAt: z.number(),
  lastWornAt: z.number().nullable().optional(),
  wearLogs: z.array(z.number()).nullable().optional(),
  brand: z.string().nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  purchaseDate: z.number().nullable().optional(),
  status: ItemStatusSchema.default('ready'),
  material: z.string().nullable().optional(),
  careInstructions: z.string().nullable().optional(),
  condition: ItemConditionSchema.nullable().optional(),
  lastWashedAt: z.number().nullable().optional(),
  washLogs: z.array(z.number()).nullable().optional(),
  locationId: z.string().nullable().optional(),
  retiredAt: z.number().nullable().optional(),
  retirementReason: z.enum(['donated', 'sold', 'recycled', 'discarded']).nullable().optional(),
  donationTarget: z.string().nullable().optional(),
  sparkJoy: z.enum(['joy', 'essential', 'no-joy']).nullable().optional(),
  gratitudeNote: z.string().nullable().optional(),
});

export const OutfitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Outfit name is required'),
  note: z.string().default(''),
  itemIds: z.array(z.string()).default([]),
  createdAt: z.number(),
  lastWornAt: z.number().nullable().optional(),
  wearLogs: z.array(z.number()).nullable().optional(),
});

export const PlannedOutfitSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  outfitId: z.string().nullable().optional(),
  itemIds: z.array(z.string()).default([]),
  note: z.string().nullable().optional(),
  weather: z
    .object({
      temp: z.number().nullable().optional(),
      icon: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
    })
    .nullable().optional(),
});

export const TripSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Trip name is required'),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  itemIds: z.array(z.string()).default([]),
  outfitIds: z.array(z.string()).nullable().optional(),
  destination: z.string().nullable().optional(),
  completed: z.boolean().nullable().optional(),
});

export const BackupDataSchema = z.object({
  items: z.array(ClothingItemSchema),
  outfits: z.array(OutfitSchema),
  tags: z.array(CustomTagSchema).optional(),
  locations: z.array(WardrobeLocationSchema).optional(),
  trips: z.array(TripSchema).optional(),
});
