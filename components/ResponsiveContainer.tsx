'use client';

import { useRef, useEffect, useState } from 'react';
import { useColumnWidths } from '../hooks/useColumnWidths';
import type { KanbanColumn, KanbanCard } from '../lib/kanbanHelpers';

export interface ResponsiveContainerProps {
  columns: (KanbanColumn & { cards: KanbanCard[] })[];
  children: React.ReactNode;
  minColumnWidth?: number;
  maxColumnWidth?: number;
  gap?: number;
  padding?: number;
  className?: string;
  onLayoutChange?: (layout: {
    layout: 'mobile-stack' | 'mobile-scroll' | 'tablet-wrap' | 'desktop';
    columnsPerRow: number;
    totalWidth: number;
  }) => void;
}

export default function ResponsiveContainer({
  columns,
  children,
  minColumnWidth = 280,
  maxColumnWidth = 400,
  gap = 24,
  padding = 48,
  className = '',
  onLayoutChange,
}: ResponsiveContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  
  const {
    columnStyles,
    responsiveLayout,
    totalWidth,
  } = useColumnWidths(columns, {
    minColumnWidth,
    maxColumnWidth,
    gap,
    padding,
  });

  // Notify parent of layout changes
  useEffect(() => {
    if (onLayoutChange) {
      onLayoutChange({
        layout: responsiveLayout.layout,
        columnsPerRow: responsiveLayout.columnsPerRow,
        totalWidth,
      });
    }
  }, [responsiveLayout, totalWidth, onLayoutChange]);

  // Handle scroll events for performance optimization
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Get container classes based on responsive layout
  const getContainerClasses = () => {
    const baseClasses = [
      'kanban-responsive-container',
      isScrolling ? 'scrolling' : '',
      className
    ];

    switch (responsiveLayout.layout) {
      case 'mobile-stack':
        baseClasses.push('mobile-stack');
        break;
      case 'mobile-scroll':
        baseClasses.push('mobile-scroll');
        break;
      case 'tablet-wrap':
        baseClasses.push('tablet-wrap');
        break;
      case 'desktop':
        baseClasses.push('desktop');
        break;
    }

    return baseClasses.filter(Boolean).join(' ');
  };

  // Get container styles
  const getContainerStyles = (): React.CSSProperties & Record<string, any> => {
    const styles: React.CSSProperties & Record<string, any> = {
      '--kanban-column-gap': `${gap}px`,
      '--kanban-container-padding': `${padding}px`,
      '--kanban-columns-count': columns.length,
    };

    // Add layout-specific styles
    if (responsiveLayout.layout === 'tablet-wrap') {
      styles['--kanban-columns-per-row'] = responsiveLayout.columnsPerRow;
    }

    return styles;
  };

  return (
    <div
      ref={containerRef}
      className={getContainerClasses()}
      style={getContainerStyles()}
      role="region"
      aria-label="Kanban board columns"
    >
      {children}
    </div>
  );
}