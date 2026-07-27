import { describe, it, expect, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { validateBackupData, importWardrobeZip, restoreZipImages } from './zipBackup';
import { imageRepository } from '../repositories/ImageRepository';

describe('ZIP Backup & Restore', () => {
  beforeEach(async () => {
    await imageRepository.clear();
  });

  describe('validateBackupData', () => {
    it('should pass validation with null values for optional fields', () => {
      const validData = {
        version: 2,
        timestamp: Date.now(),
        items: [
          {
            id: 'item-1',
            name: 'T-Shirt',
            category: 'top',
            color: '#1a1a1a',
            tags: [],
            images: [],
            createdAt: Date.now(),
            status: 'ready',
            brand: null, // null instead of undefined
            price: null,
            purchaseDate: null,
            material: null,
            careInstructions: null,
            condition: null,
            locationId: null,
          }
        ],
        outfits: [],
        tags: [],
        locations: [],
        trips: []
      };

      const result = validateBackupData(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.data?.items[0].brand).toBeNull();
    });

    it('should support retirement fields in ClothingItemSchema', () => {
      const retiredData = {
        version: 2,
        timestamp: Date.now(),
        items: [
          {
            id: 'item-2',
            name: 'Old Jeans',
            category: 'bottom',
            color: '#0000ff',
            tags: [],
            images: [],
            createdAt: Date.now(),
            status: 'ready',
            retiredAt: 1700000000000,
            retirementReason: 'donated',
            donationTarget: 'Charity Shop',
          }
        ]
      };

      const result = validateBackupData(retiredData);
      expect(result.valid).toBe(true);
      expect(result.data?.items[0].retiredAt).toBe(1700000000000);
      expect(result.data?.items[0].retirementReason).toBe('donated');
      expect(result.data?.items[0].donationTarget).toBe('Charity Shop');
    });
  });

  describe('importWardrobeZip', () => {
    const sampleBackupData = {
      version: 2,
      timestamp: Date.now(),
      items: [
        {
          id: 'item-1',
          name: 'T-Shirt',
          category: 'top',
          color: '#1a1a1a',
          tags: [],
          images: ['image-1'],
          createdAt: Date.now(),
          status: 'ready'
        }
      ],
      outfits: [],
      tags: [],
      locations: [],
      trips: [],
      images: {
        'image-1': 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
      }
    };

    it('should import zip with files at root and not write to DB immediately', async () => {
      const zip = new JSZip();
      zip.file('wardrobe.json', JSON.stringify(sampleBackupData));
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const file = new File([zipBlob], 'backup.zip', { type: 'application/zip' });

      // Run import
      const result = await importWardrobeZip(file);
      
      expect(result.success).toBe(true);
      expect(result.data?.items.length).toBe(1);
      expect(result.images).toBeDefined();
      expect(result.images?.['image-1']).toBeDefined();

      // Verify no images written to DB yet (to ensure no side-effects prior to confirmation)
      const dbImage = await imageRepository.get('image-1');
      expect(dbImage).toBeUndefined();
    });

    it('should import zip wrapped in a subfolder (nested files)', async () => {
      const zip = new JSZip();
      // Files nested inside a folder
      zip.file('my-backup/wardrobe.json', JSON.stringify(sampleBackupData));
      
      // Add image file separately in images folder inside subfolder
      const dummyBlob = new Blob(['dummy image content'], { type: 'image/png' });
      zip.file('my-backup/images/image-2.png', dummyBlob);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const file = new File([zipBlob], 'nested_backup.zip', { type: 'application/zip' });

      const result = await importWardrobeZip(file);

      expect(result.success).toBe(true);
      expect(result.data?.items.length).toBe(1);
      
      // Should have parsed both embedded 'image-1' and folder file 'image-2'
      expect(result.images?.['image-1']).toBeDefined();
      expect(result.images?.['image-2']).toBeDefined();
      
      // Verify content of image-2
      const img2Blob = result.images?.['image-2'];
      expect(img2Blob).toBeDefined();
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(img2Blob!);
      });
      expect(text).toBe('dummy image content');
    });
  });

  describe('restoreZipImages', () => {
    it('should clear existing images and write new ones', async () => {
      // Seed an existing image
      const seedBlob = new Blob(['old image'], { type: 'image/png' });
      await imageRepository.add('image-old', seedBlob);

      // Restore images map
      const newBlob = new Blob(['new image'], { type: 'image/png' });
      const imagesToRestore = {
        'image-new': newBlob
      };

      await restoreZipImages(imagesToRestore);

      // Verify old image is deleted
      const oldImg = await imageRepository.get('image-old');
      expect(oldImg).toBeUndefined();

      // Verify new image is written
      const newImg = await imageRepository.get('image-new');
      expect(newImg).toBeDefined();
    });
  });
});
