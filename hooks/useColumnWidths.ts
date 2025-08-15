import { useState, useEffect, useCallback, useMemo } from 'react';
import { useResponsive } from './useResponsive';
import type { KanbanColumn, KanbanCard } from '../lib/kanbanHelpers';
import {
  analyzeColumnContent,
  calculateOptimalWidth,
  distributeWidthProportionally,
  getResponsiveLayout,
  createDebouncedWidthCalculator,
  DEFAULT_WIDTH_CONFIG,
  type WidthCalculationConfig
} from '../utils/columnWidthUtils';

export interface ColumnDimensions {
  minWidth: number;
  maxWidth: number;
  calculatedWidth: number;
  contentWidth: number;
}

export interface UseColumnWidthsOptions {
  minColumnWidth?: number;
  maxColumnWidth?: number;
  gap?: number;
  padding?: number;
  widthConfig?: Partial<WidthCalculationConfig>;
}

const DEFAULT_OPTIONS: Required<Omit<UseColumnWidthsOptions, 'widthConfig'>> = {
  minColumnWidth: 280,
  maxColumnWidth: 400,
  gap: 24,
  padding: 48, // 24px on each side
};

export function useColumnWidths(
  columns: (KanbanColumn & { cards: KanbanCard[] })[],
  options: UseColumnWidthsOptions = {}
) {
  const { isMobile, isTablet, isLandscape, width: viewportWidth } = useResponsive();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const widthConfig = { ...DEFAULT_WIDTH_CONFIG, ...options.widthConfig };
  
  const [columnWidths, setColumnWidths] = useState<Record<string, ColumnDimensions>>({});

  // Calculate content-based width for a column using enhanced utilities
  const calculateContentWidth = useCallback((column: KanbanColumn & { cards: KanbanCard[] }): number => {
    const metrics = analyzeColumnContent(column);
    return calculateOptimalWidth(metrics, widthConfig);
  }, [widthConfig]);

  // Calculate optimal widths for all columns using enhanced utilities
  const calculateColumnWidths = useCallback(() => {
    if (columns.length === 0) return {};
    
    const newWidths: Record<string, ColumnDimensions> = {};
    const layout = getResponsiveLayout(
      columns.length,
      viewportWidth,
      opts.minColumnWidth,
      opts.gap,
      opts.padding,
      isMobile,
      isLandscape
    );
    
    // Handle different responsive layouts
    if (layout.layout === 'mobile-stack' || layout.layout === 'mobile-scroll') {
      // Mobile: uniform width
      columns.forEach(column => {
        const contentWidth = calculateContentWidth(column);
        newWidths[column.id] = {
          minWidth: layout.columnWidth,
          maxWidth: layout.columnWidth,
          calculatedWidth: layout.columnWidth,
          contentWidth,
        };
      });
    } else if (layout.layout === 'tablet-wrap') {
      // Tablet: uniform width per row
      columns.forEach(column => {
        const contentWidth = calculateContentWidth(column);
        newWidths[column.id] = {
          minWidth: opts.minColumnWidth,
          maxWidth: layout.columnWidth,
          calculatedWidth: layout.columnWidth,
          contentWidth,
        };
      });
    } else {
      // Desktop: dynamic widths based on content
      const availableWidth = viewportWidth - opts.padding - (columns.length - 1) * opts.gap;
      const distributedWidths = distributeWidthProportionally(columns, availableWidth, widthConfig);
      
      columns.forEach(column => {
        const contentWidth = calculateContentWidth(column);
        const calculatedWidth = distributedWidths[column.id] || opts.minColumnWidth;
        
        newWidths[column.id] = {
          minWidth: opts.minColumnWidth,
          maxWidth: opts.maxColumnWidth,
          calculatedWidth,
          contentWidth,
        };
      });
    }
    
    return newWidths;
  }, [columns, viewportWidth, opts, widthConfig, calculateContentWidth, isMobile, isLandscape]);

  // Debounced width calculation using utility
  const debouncedCalculator = useMemo(
    () => createDebouncedWidthCalculator(() => {
      const newWidths = calculateColumnWidths();
      setColumnWidths(newWidths);
    }, 150),
    [calculateColumnWidths]
  );

  useEffect(() => {
    debouncedCalculator();
  }, [debouncedCalculator]);

  // Memoized CSS custom properties for each column
  const columnStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    
    Object.entries(columnWidths).forEach(([columnId, dimensions]) => {
      styles[columnId] = {
        '--kanban-column-calculated-width': `${dimensions.calculatedWidth}px`,
        '--kanban-column-min-width': `${dimensions.minWidth}px`,
        '--kanban-column-max-width': `${dimensions.maxWidth}px`,
      } as React.CSSProperties;
    });
    
    return styles;
  }, [columnWidths]);

  // Get current responsive layout info
  const responsiveLayout = useMemo(() => 
    getResponsiveLayout(
      columns.length,
      viewportWidth,
      opts.minColumnWidth,
      opts.gap,
      opts.padding,
      isMobile,
      isLandscape
    ),
    [columns.length, viewportWidth, opts, isMobile, isLandscape]
  );

  // Calculate total width for layout callback
  const totalWidth = useMemo(() => {
    const widthSum = Object.values(columnWidths).reduce(
      (sum, dimensions) => sum + dimensions.calculatedWidth, 
      0
    );
    return widthSum + (columns.length - 1) * opts.gap;
  }, [columnWidths, columns.length, opts.gap]);

  return {
    columnWidths,
    columnStyles,
    responsiveLayout,
    totalWidth,
    recalculate: calculateColumnWidths,
  };
}