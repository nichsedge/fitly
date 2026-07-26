import { dataUrlToBlob, getOrCreateObjectUrl, revokeObjectUrl } from '../lib/mediaStorage';
import { imageRepository } from '../repositories/ImageRepository';
import { v4 as uuidv4 } from 'uuid';

export class ImageService {
  private static readonly MAX_WIDTH = 1024;
  private static readonly MAX_HEIGHT = 1024;
  private static readonly QUALITY = 0.8;
  private static readonly THUMBNAIL_SIZE = 200;

  static async compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > this.MAX_WIDTH || height > this.MAX_HEIGHT) {
            if (width > height) {
              height = Math.round((height * this.MAX_WIDTH) / width);
              width = this.MAX_WIDTH;
            } else {
              width = Math.round((width * this.MAX_HEIGHT) / height);
              height = this.MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrlToBlob(e.target?.result as string));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(blob => {
            resolve(blob || dataUrlToBlob(e.target?.result as string));
          }, 'image/jpeg', this.QUALITY);
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  }

  static getDisplayUrl(id: string, imageSource: string | Blob): string {
    if (!imageSource) return '';
    return getOrCreateObjectUrl(id, imageSource);
  }

  static async saveImageBlob(blob: Blob): Promise<string> {
    const imageId = `img-${uuidv4()}`;
    await imageRepository.add(imageId, blob);
    return imageId;
  }

  static async resolveImageUrl(imageRef: string): Promise<string> {
    if (!imageRef) return '';
    if (imageRef.startsWith('data:') || imageRef.startsWith('http') || imageRef.startsWith('blob:')) {
      return imageRef;
    }
    const blob = await imageRepository.get(imageRef);
    if (blob) {
      return getOrCreateObjectUrl(imageRef, blob);
    }
    return imageRef;
  }

  static cleanupUrl(id: string): void {
    revokeObjectUrl(id);
  }

  static async convertBase64ToBlobUrl(id: string, base64: string): Promise<string> {
    if (!base64 || !base64.startsWith('data:')) return base64;
    const blob = dataUrlToBlob(base64);
    return getOrCreateObjectUrl(id, blob);
  }
}
