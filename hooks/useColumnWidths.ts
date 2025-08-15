import { useState, useEffect, useCallback, useMemo } from 'react';
import { useResponsive } from './useResponsive';
import type { KanbanColumn, KanbanCard } from '../lib/kanbanHelpers';

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
}

const DEFAULT_OPTIONS: Required<UseColumnWidthsOptions> = {
  minColumnWidth: 280,
  maxColumnWidth: 400,
  gap: 24,
  padding: 48, // 24px on each side
};

export function useColumnWidths(
  columns: (KanbanColumn & { cards: KanbanCard[] })[],
  options: UseColumnWidthsOptions = {}
) {
  const { isMobile, isTablet, width: viewportWidth } = useResponsive();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [columnWidths, setColumnWidths] = useState<Record<string, ColumnDimensions>>({});

  // Calculate content-based width for a column
  const calculateContentWidth = useCallback((column: KanbanColumn & { cards: KanbanCard[] }): number => {
    // Base width calculation factors:
    // - Column title length
    // - Number of cards
    // - Average card title length
    // - Card content complexity (description, tags, etc.)
    
    const titleLength = column.title.length;
    const cardCount = column.cards.length;
    const avgCardTitleLength = cardCount > 0 
      ? column.cards.reduce((sum, card) => sum + card.title.length, 0) / cardCount 
      : 0;
    
    // Calculate complexity score
    const complexityScore = column.cards.reduce((score, card) => {
      let cardScore = 0;
      cardScore += card.title.length * 2; // Title weight
      cardScore += (card.description?.length || 0) * 0.5; // Description weight
      cardScore += (card.tags?.length || 0) * 10; // Tags weight
      cardScore += card.assignee ? 20 : 0; // Assignee weight
      cardScore += card.due_date ? 15 : 0; // Due date weight
      return score + cardScore;
    }, 0);
    
    // Base width from title
    let contentWidth = Math.max(200, titleLength * 8 + 100);
    
    // Adjust for card content
    if (cardCount > 0) {
      contentWidth = Math.max(contentWidth, avgCardTitleLength * 6 + 120);
      contentWidth += Math.min(complexityScore * 0.1, 100); // Cap complexity bonus
    }
    
    // Adjust for card count (more cards = slightly wider for better readability)
    if (cardCount > 5) {
      contentWidth += Math.min((cardCount - 5) * 5, 50);
    }
    
    return Math.round(contentWidth);
  }, []);

  // Calculate optimal widths for all columns
  const calculateColumnWidths = useCallback(() => {
    if (columns.length === 0) return {};
    
    const newWidths: Record<string, ColumnDimensions> = {};
    
    // Mobile: all columns use mobile width
    if (isMobile) {
      const mobileWidth = Math.max(opts.minColumnWidth, viewportWidth - opts.padding);
      columns.forEach(column => {
        newWidths[column.id] = {
          minWidth: mobileWidth,
          maxWidth: mobileWidth,
          calculatedWidth: mobileWidth,
          contentWidth: mobileWidth,
        };
      });
      return newWidths;
    }
    
    // Tablet: 2-3 columns per row
    if (isTablet) {
      const availableWidth = viewportWidth - opts.padding;
      const columnsPerRow = columns.length <= 2 ? columns.length : Math.min(3, columns.length);
      const tabletWidth = Math.max(
        opts.minColumnWidth,
        (availableWidth - (columnsPerRow - 1) * opts.gap) / columnsPerRow
      );
      
      columns.forEach(column => {
        newWidths[column.id] = {
          minWidth: opts.minColumnWidth,
          maxWidth: tabletWidth,
          calculatedWidth: tabletWidth,
          contentWidth: calculateContentWidth(column),
        };
      });
      return newWidths;
    }
    
    // Desktop: dynamic widths based on content
    const availableWidth = viewportWidth - opts.padding - (columns.length - 1) * opts.gap;
    const totalContentWidth = columns.reduce((sum, col) => sum + calculateContentWidth(col), 0);
    
    columns.forEach(column => {
      const contentWidth = calculateContentWidth(column);
      let calculatedWidth: number;
      
      if (totalContentWidth <= availableWidth) {
        // All columns fit comfortably, use content-based width
        calculatedWidth = Math.max(opts.minColumnWidth, Math.min(opts.maxColumnWidth, contentWidth));
      } else {
        // Need to distribute available space proportionally
        const proportion = contentWidth / totalContentWidth;
        calculatedWidth = Math.max(opts.minColumnWidth, availableWidth * proportion);
      }
      
      newWidths[column.id] = {
        minWidth: opts.minColumnWidth,
        maxWidth: opts.maxColumnWidth,
        calculatedWidth: Math.round(calculatedWidth),
        contentWidth,
      };
    });
    
    return newWidths;
  }, [columns, isMobile, isTablet, viewportWidth, opts, calculateContentWidth]);

  // Debounced width calculation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const newWidths = calculateColumnWidths();
      setColumnWidths(newWidths);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [calculateColumnWidths]);

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

  return {
    columnWidths,
    columnStyles,
    isMobile,
    isTablet,
    recalculate: calculateColumnWidths,
  };
}