import JSZip from 'jszip';
import { ClothingItem, Outfit, CustomTag, WardrobeLocation, Trip } from '../lib/types';
import { imageRepository } from '../repositories/ImageRepository';
import { restoreFromBackup } from '../lib/db';
import { ClothingItemSchema, OutfitSchema, CustomTagSchema, WardrobeLocationSchema, TripSchema } from '../lib/schemas/wardrobeSchemas';
import { z } from 'zod';

export interface WardrobeBackupData {
  version: number;
  timestamp: number;
  items: ClothingItem[];
  outfits: Outfit[];
  tags: CustomTag[];
  locations: WardrobeLocation[];
  trips: Trip[];
}

export interface ZipBackupData extends WardrobeBackupData {
  images: Record<string, string>; // base64 encoded images keyed by image ID
}

/**
 * Validates backup data against Zod schemas
 */
export function validateBackupData(data: unknown): { valid: boolean; errors: string[]; data?: WardrobeBackupData } {
  const schema = z.object({
    version: z.number().optional().default(1),
    timestamp: z.number().optional().default(Date.now),
    items: z.array(ClothingItemSchema).optional().default([]),
    outfits: z.array(OutfitSchema).optional().default([]),
    tags: z.array(CustomTagSchema).optional().default([]),
    locations: z.array(WardrobeLocationSchema).optional().default([]),
    trips: z.array(TripSchema).optional().default([]),
  });

  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
    };
  }
  return { valid: true, errors: [], data: result.data as unknown as WardrobeBackupData };
}

/**
 * Collects all image IDs referenced by items
 */
function collectImageIds(items: ClothingItem[]): string[] {
  const imageIds = new Set<string>();
  for (const item of items) {
    for (const img of item.images || []) {
      if (img && !img.startsWith('data:') && !img.startsWith('http') && !img.startsWith('blob:')) {
        imageIds.add(img);
      }
    }
  }
  return Array.from(imageIds);
}

/**
 * Exports wardrobe data as a ZIP file containing wardrobe.json and images/ folder
 */
export async function exportWardrobeZip(
  items: ClothingItem[],
  outfits: Outfit[],
  tags: CustomTag[],
  locations: WardrobeLocation[],
  trips: Trip[]
): Promise<Blob> {
  const zip = new JSZip();

  // Collect image IDs from items
  const imageIds = collectImageIds(items);
  
  // Fetch all images from IndexedDB
  const imagesMap = await imageRepository.getMultiple(imageIds);

  // Create wardrobe.json with embedded base64 images
  const backupData: ZipBackupData = {
    version: 2,
    timestamp: Date.now(),
    items,
    outfits,
    tags,
    locations,
    trips,
    images: {}
  };

  // Convert images to base64 and embed in JSON
  for (const [id, blob] of imagesMap.entries()) {
    backupData.images[id] = await blobToBase64(blob);
  }

  // Add wardrobe.json to ZIP
  zip.file('wardrobe.json', JSON.stringify(backupData, null, 2));

  // Also add images as separate files in images/ folder for external access
  const imagesFolder = zip.folder('images');
  if (imagesFolder) {
    for (const [id, base64] of Object.entries(backupData.images)) {
      // Extract mime type from base64 header
      const mimeMatch = base64.match(/^data:([^;]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const extension = mimeType.split('/')[1] || 'jpg';
      
      // Convert base64 to blob and add as file
      const byteString = atob(base64.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      imagesFolder.file(`${id}.${extension}`, new Blob([ab], { type: mimeType }));
    }
  }

  // Generate ZIP blob
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return zipBlob;
}

/**
 * Imports wardrobe data from a ZIP file
 */
export async function importWardrobeZip(file: File): Promise<{
  success: boolean;
  errors: string[];
  data?: WardrobeBackupData;
  images?: Record<string, Blob>;
}> {
  try {
    const zip = new JSZip();
    const arrayBuffer = await file.arrayBuffer();
    const zipContent = await zip.loadAsync(arrayBuffer);

    // Read wardrobe.json - look at root or any subfolder
    let wardrobeFile = zipContent.file('wardrobe.json');
    if (!wardrobeFile) {
      const found = Object.keys(zipContent.files).find(name => name.endsWith('wardrobe.json'));
      if (found) {
        wardrobeFile = zipContent.file(found);
      }
    }

    if (!wardrobeFile) {
      return { success: false, errors: ['ZIP file missing wardrobe.json'] };
    }

    const jsonContent = await wardrobeFile.async('string');
    const backupData = JSON.parse(jsonContent) as ZipBackupData;

    // Validate against Zod schemas
    const validation = validateBackupData(backupData);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const extractedImages: Record<string, Blob> = {};

    // 1. Extract images from embedded base64 if present
    if (backupData.images && typeof backupData.images === 'object') {
      for (const [id, base64] of Object.entries(backupData.images)) {
        if (base64 && typeof base64 === 'string' && base64.startsWith('data:')) {
          try {
            const blob = await base64ToBlob(base64);
            extractedImages[id] = blob;
          } catch (err) {
            console.warn(`Failed to parse base64 image ${id}:`, err);
          }
        }
      }
    }

    // 2. Extract images from any images/ folder at any depth as fallback
    for (const [filename, zipFile] of Object.entries(zipContent.files)) {
      if (zipFile.dir) continue;
      const isImageFile = filename.includes('/images/') || filename.startsWith('images/');
      if (isImageFile) {
        const parts = filename.split('/');
        const imgName = parts[parts.length - 1];
        const id = imgName.replace(/\.[^/.]+$/, ''); // Remove extension
        if (id && !extractedImages[id]) {
          try {
            const blob = await zipFile.async('blob');
            extractedImages[id] = blob;
          } catch (err) {
            console.warn(`Failed to parse image file ${filename}:`, err);
          }
        }
      }
    }

    return { success: true, errors: [], data: validation.data, images: extractedImages };
  } catch (error) {
    console.error('ZIP import failed:', error);
    return { 
      success: false, 
      errors: [error instanceof Error ? error.message : 'Unknown error during ZIP import'] 
    };
  }
}

/**
 * Restores wardrobe images to IndexedDB
 */
export async function restoreZipImages(images: Record<string, Blob>): Promise<void> {
  await imageRepository.clear();
  for (const [id, blob] of Object.entries(images)) {
    await imageRepository.add(id, blob);
  }
}

/**
 * Restores wardrobe data to IndexedDB
 */
export async function restoreWardrobeData(
  items: ClothingItem[],
  outfits: Outfit[],
  tags: CustomTag[],
  locations: WardrobeLocation[],
  trips: Trip[]
): Promise<void> {
  await restoreFromBackup(items, outfits, tags, locations, trips);
}

/**
 * Converts Blob to base64 data URL
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts base64 data URL to Blob
 */
function base64ToBlob(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const [header, base64] = dataUrl.split(',');
      const mimeMatch = header.match(/^data:([^;]+);base64$/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      
      const byteString = atob(base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      resolve(new Blob([ab], { type: mimeType }));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Downloads a ZIP blob as a file
 */
export function downloadZipBlob(blob: Blob, filename?: string): void {
  const defaultFilename = `fitly-wardrobe-${new Date().toISOString().split('T')[0]}.zip`;
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || defaultFilename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, 10000);
}