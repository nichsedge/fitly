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
  icon: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const ClothingItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Item name is required'),
  category: CategorySchema,
  color: z.string().default('#1a1a1a'),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  createdAt: z.number(),
  lastWornAt: z.number().optional(),
  wearLogs: z.array(z.number()).optional(),
  brand: z.string().optional(),
  price: z.number().nonnegative().optional(),
  purchaseDate: z.number().optional(),
  status: ItemStatusSchema.default('ready'),
  material: z.string().optional(),
  careInstructions: z.string().optional(),
  condition: ItemConditionSchema.optional(),
  lastWashedAt: z.number().optional(),
  washLogs: z.array(z.number()).optional(),
  locationId: z.string().optional(),
});

export const OutfitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Outfit name is required'),
  note: z.string().default(''),
  itemIds: z.array(z.string()).default([]),
  createdAt: z.number(),
  lastWornAt: z.number().optional(),
  wearLogs: z.array(z.number()).optional(),
});

export const PlannedOutfitSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  outfitId: z.string().optional(),
  itemIds: z.array(z.string()).default([]),
  note: z.string().optional(),
  weather: z
    .object({
      temp: z.number().optional(),
      icon: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
});

export const TripSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Trip name is required'),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  itemIds: z.array(z.string()).default([]),
  outfitIds: z.array(z.string()).optional(),
  destination: z.string().optional(),
  completed: z.boolean().optional(),
});

export const BackupDataSchema = z.object({
  items: z.array(ClothingItemSchema),
  outfits: z.array(OutfitSchema),
  tags: z.array(CustomTagSchema).optional(),
  locations: z.array(WardrobeLocationSchema).optional(),
  trips: z.array(TripSchema).optional(),
});
