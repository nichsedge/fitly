'use client';

import React, { useEffect, useState } from 'react';
import { ImageService } from '../services/ImageService';

interface ResolvedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallback?: React.ReactNode;
}

export function ResolvedImage({ src, fallback, ...props }: ResolvedImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string>('');

  useEffect(() => {
    let active = true;
    if (!src) {
      setResolvedSrc('');
      return;
    }
    if (src.startsWith('data:') || src.startsWith('http') || src.startsWith('blob:')) {
      setResolvedSrc(src);
    } else {
      ImageService.resolveImageUrl(src).then(url => {
        if (active) setResolvedSrc(url);
      });
    }
    return () => {
      active = false;
    };
  }, [src]);

  if (!resolvedSrc) {
    return fallback ? <>{fallback}</> : null;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={resolvedSrc}
      {...props}
      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', ...props.style }}
    />
  );
}

