/**
 * Compresses a Base64 image URL or File using HTML Canvas.
 * Resizes the image to fit within maxWidth x maxHeight and compresses quality.
 */
export async function compressImageDataUrl(
  dataUrl: string,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.8
): Promise<string> {
  // SVG or non-raster formats don't need compression
  if (!dataUrl || dataUrl.startsWith('data:image/svg+xml')) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // If dimensions are within bounds and already small, return original
      if (width <= maxWidth && height <= maxHeight && dataUrl.length < 200000) {
        resolve(dataUrl);
        return;
      }

      // Calculate new dimensions maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Export compressed image as JPEG data URL
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}
