'use client';

import React, { useEffect, useState } from 'react';
import { ImageService } from '../services/ImageService';

interface ResolvedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallback?: React.ReactNode;
}

/** Sources that can be used directly in an <img> without IndexedDB resolution. */
function isDirectSrc(src?: string): boolean {
  return !src || src.startsWith('data:') || src.startsWith('http') || src.startsWith('blob:');
}

export function ResolvedImage({ src, fallback, alt = '', ...props }: ResolvedImageProps) {
  // State is only needed for asynchronous blob-reference resolution.
  const [resolvedBlobUrl, setResolvedBlobUrl] = useState<string>('');

  const needsResolution = !!src && !isDirectSrc(src);

  useEffect(() => {
    if (!needsResolution || !src) return;
    let active = true;
    ImageService.resolveImageUrl(src).then(url => {
      if (active) setResolvedBlobUrl(url);
    });
    return () => {
      active = false;
    };
  }, [src, needsResolution]);

  const resolvedSrc = needsResolution ? resolvedBlobUrl : (src || '');

  if (!resolvedSrc) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      {...props}
      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', ...props.style }}
    />
  );
}
