'use client';

import React, { useState, useEffect, useRef, useMemo, ReactNode } from 'react';

interface Props<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  itemHeight?: number;
  columns?: number;
  className?: string;
  emptyState?: ReactNode;
}

export default function VirtualizedGrid<T>({
  items,
  renderItem,
  keyExtractor,
  itemHeight = 220,
  columns = 2,
  className = '',
  emptyState = null,
}: Props<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);
  const buffer = 2; // Extra rows above and below window

  const [topOffset, setTopOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollTop(window.scrollY || document.documentElement.scrollTop);
      if (containerRef.current) {
        setTopOffset(containerRef.current.getBoundingClientRect().top + window.scrollY);
      }
    };

    const handleResize = () => {
      setContainerHeight(window.innerHeight || 800);
      if (containerRef.current) {
        setTopOffset(containerRef.current.getBoundingClientRect().top + window.scrollY);
      }
    };

    handleResize();
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const totalRows = Math.ceil(items.length / columns);
  const totalHeight = totalRows * itemHeight;

  const { startRow, visibleItems } = useMemo(() => {
    const relativeScroll = Math.max(0, scrollTop - topOffset);

    const calculatedStartRow = Math.max(0, Math.floor(relativeScroll / itemHeight) - buffer);
    const calculatedEndRow = Math.min(totalRows, Math.ceil((relativeScroll + containerHeight) / itemHeight) + buffer);

    const startIndex = calculatedStartRow * columns;
    const endIndex = Math.min(items.length, calculatedEndRow * columns);

    const visibleSlice = items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      originalIndex: startIndex + index,
      row: Math.floor((startIndex + index) / columns),
      col: (startIndex + index) % columns,
    }));

    return {
      startRow: calculatedStartRow,
      visibleItems: visibleSlice,
    };
  }, [items, columns, itemHeight, scrollTop, topOffset, containerHeight, totalRows]);

  if (items.length === 0) {
    return <>{emptyState}</>;
  }

  // If item count is small (< 30), render directly without virtual wrapper for minimal overhead
  if (items.length < 30) {
    return (
      <div className={className}>
        {items.map((item, index) => (
          <React.Fragment key={keyExtractor(item)}>
            {renderItem(item, index)}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="virtualized-grid-container"
      style={{
        position: 'relative',
        minHeight: totalHeight,
        width: '100%',
      }}
    >
      <div
        className={className}
        style={{
          position: 'absolute',
          top: startRow * itemHeight,
          left: 0,
          right: 0,
          display: 'grid',
        }}
      >
        {visibleItems.map(({ item, originalIndex }) => (
          <React.Fragment key={keyExtractor(item)}>
            {renderItem(item, originalIndex)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
