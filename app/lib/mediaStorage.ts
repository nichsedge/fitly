/**
 * Utility functions to manage Blob storage and Object URLs for image assets.
 * Converting base64 data URLs to binary Blobs drastically reduces memory footprint,
 * improves IndexedDB read/write speeds, and avoids long string serialization overhead.
 */

// Cache of generated Object URLs to avoid memory leaks
const objectUrlCache = new Map<string, string>();

/**
 * Converts a Base64 Data URL to a Blob object.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return new Blob([], { type: 'image/jpeg' });
  }

  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Converts a Blob object to a Base64 Data URL.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Creates or retrieves a cached Object URL for a given Blob or Base64 string.
 */
export function getOrCreateObjectUrl(id: string, source: string | Blob): string {
  if (typeof source === 'string') {
    if (!source.startsWith('data:')) {
      return source; // Already an HTTP/Object URL
    }
    if (objectUrlCache.has(id)) {
      return objectUrlCache.get(id)!;
    }
    const blob = dataUrlToBlob(source);
    const url = URL.createObjectURL(blob);
    objectUrlCache.set(id, url);
    return url;
  } else {
    if (objectUrlCache.has(id)) {
      return objectUrlCache.get(id)!;
    }
    const url = URL.createObjectURL(source);
    objectUrlCache.set(id, url);
    return url;
  }
}

/**
 * Revokes a cached Object URL to free memory.
 */
export function revokeObjectUrl(id: string): void {
  const url = objectUrlCache.get(id);
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(id);
  }
}
