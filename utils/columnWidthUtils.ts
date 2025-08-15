import type { KanbanColumn, KanbanCard } from '../lib/kanbanHelpers';

export interface ContentMetrics {
  titleLength: number;
  cardCount: number;
  avgCardTitleLength: number;
  complexityScore: number;
  hasLongDescriptions: boolean;
  hasMultipleTags: boolean;
  hasAssignees: boolean;
  hasDueDates: boolean;
}

export interface WidthCalculationConfig {
  minWidth: number;
  maxWidth: number;
  baseWidthPerChar: number;
  titleWeight: number;
  descriptionWeight: number;
  tagWeight: number;
  assigneeWeight: number;
  dueDateWeight: number;
  cardCountBonus: number;
  maxComplexityBonus: number;
}

export const DEFAULT_WIDTH_CONFIG: WidthCalculationConfig = {
  minWidth: 280,
  maxWidth: 400,
  baseWidthPerChar: 8,
  titleWeight: 2,
  descriptionWeight: 0.5,
  tagWeight: 10,
  assigneeWeight: 20,
  dueDateWeight: 15,
  cardCountBonus: 5,
  maxComplexityBonus: 100,
};

/**
 * Analyzes the content of a column to extract metrics for width calculation
 */
export function analyzeColumnContent(column: KanbanColumn & { cards: KanbanCard[] }): ContentMetrics {
  const titleLength = column.title.length;
  const cardCount = column.cards.length;
  
  if (cardCount === 0) {
    return {
      titleLength,
      cardCount: 0,
      avgCardTitleLength: 0,
      complexityScore: 0,
      hasLongDescriptions: false,
      hasMultipleTags: false,
      hasAssignees: false,
      hasDueDates: false,
    };
  }

  const avgCardTitleLength = column.cards.reduce((sum, card) => sum + card.title.length, 0) / cardCount;
  
  let complexityScore = 0;
  let longDescriptionCount = 0;
  let multipleTagsCount = 0;
  let assigneeCount = 0;
  let dueDateCount = 0;

  column.cards.forEach(card => {
    // Title contribution
    complexityScore += card.title.length * DEFAULT_WIDTH_CONFIG.titleWeight;
    
    // Description contribution
    const descLength = card.description?.length || 0;
    complexityScore += descLength * DEFAULT_WIDTH_CONFIG.descriptionWeight;
    if (descLength > 100) longDescriptionCount++;
    
    // Tags contribution
    const tagCount = card.tags?.length || 0;
    complexityScore += tagCount * DEFAULT_WIDTH_CONFIG.tagWeight;
    if (tagCount > 2) multipleTagsCount++;
    
    // Assignee contribution
    if (card.assignee) {
      complexityScore += DEFAULT_WIDTH_CONFIG.assigneeWeight;
      assigneeCount++;
    }
    
    // Due date contribution
    if (card.due_date) {
      complexityScore += DEFAULT_WIDTH_CONFIG.dueDateWeight;
      dueDateCount++;
    }
  });

  return {
    titleLength,
    cardCount,
    avgCardTitleLength,
    complexityScore,
    hasLongDescriptions: longDescriptionCount > cardCount * 0.3, // 30% threshold
    hasMultipleTags: multipleTagsCount > cardCount * 0.2, // 20% threshold
    hasAssignees: assigneeCount > cardCount * 0.5, // 50% threshold
    hasDueDates: dueDateCount > cardCount * 0.3, // 30% threshold
  };
}

/**
 * Calculates the optimal width for a column based on its content
 */
export function calculateOptimalWidth(
  metrics: ContentMetrics,
  config: WidthCalculationConfig = DEFAULT_WIDTH_CONFIG
): number {
  // Start with base width from title
  let width = Math.max(200, metrics.titleLength * config.baseWidthPerChar + 100);
  
  // Adjust for card content if there are cards
  if (metrics.cardCount > 0) {
    // Use average card title length as a baseline
    const cardBasedWidth = metrics.avgCardTitleLength * 6 + 120;
    width = Math.max(width, cardBasedWidth);
    
    // Add complexity bonus (capped)
    const complexityBonus = Math.min(
      metrics.complexityScore * 0.1,
      config.maxComplexityBonus
    );
    width += complexityBonus;
    
    // Add card count bonus for readability
    if (metrics.cardCount > 5) {
      const cardCountBonus = Math.min(
        (metrics.cardCount - 5) * config.cardCountBonus,
        50 // Cap at 50px bonus
      );
      width += cardCountBonus;
    }
    
    // Additional adjustments based on content characteristics
    if (metrics.hasLongDescriptions) width += 20;
    if (metrics.hasMultipleTags) width += 15;
    if (metrics.hasAssignees) width += 10;
    if (metrics.hasDueDates) width += 10;
  }
  
  // Ensure width is within bounds
  return Math.round(Math.max(config.minWidth, Math.min(config.maxWidth, width)));
}

/**
 * Distributes available width among columns proportionally
 */
export function distributeWidthProportionally(
  columns: (KanbanColumn & { cards: KanbanCard[] })[],
  availableWidth: number,
  config: WidthCalculationConfig = DEFAULT_WIDTH_CONFIG
): Record<string, number> {
  if (columns.length === 0) return {};
  
  const metrics = columns.map(col => ({
    id: col.id,
    metrics: analyzeColumnContent(col),
    optimalWidth: calculateOptimalWidth(analyzeColumnContent(col), config)
  }));
  
  const totalOptimalWidth = metrics.reduce((sum, { optimalWidth }) => sum + optimalWidth, 0);
  const widths: Record<string, number> = {};
  
  if (totalOptimalWidth <= availableWidth) {
    // All columns fit at optimal width
    metrics.forEach(({ id, optimalWidth }) => {
      widths[id] = optimalWidth;
    });
  } else {
    // Distribute proportionally
    metrics.forEach(({ id, optimalWidth }) => {
      const proportion = optimalWidth / totalOptimalWidth;
      const distributedWidth = availableWidth * proportion;
      widths[id] = Math.max(config.minWidth, Math.round(distributedWidth));
    });
  }
  
  return widths;
}

/**
 * Calculates responsive breakpoints for column layout
 */
export function getResponsiveLayout(
  columnCount: number,
  viewportWidth: number,
  minColumnWidth: number = 280,
  gap: number = 24,
  padding: number = 48,
  isMobile: boolean = false,
  isLandscape: boolean = false
): {
  layout: 'mobile-stack' | 'mobile-scroll' | 'tablet-wrap' | 'desktop';
  columnsPerRow: number;
  columnWidth: number;
} {
  const availableWidth = viewportWidth - padding;
  
  // Mobile breakpoint
  if (viewportWidth < 768) {
    const singleColumnWidth = availableWidth;
    
    // In landscape mode on mobile, prefer horizontal scroll even with limited width
    if (isLandscape || singleColumnWidth >= minColumnWidth) {
      return {
        layout: 'mobile-scroll',
        columnsPerRow: 1,
        columnWidth: Math.max(minColumnWidth, singleColumnWidth)
      };
    } else {
      // Stack vertically in portrait mode when width is too small
      return {
        layout: 'mobile-stack',
        columnsPerRow: 1,
        columnWidth: availableWidth
      };
    }
  }
  
  // Tablet breakpoint
  if (viewportWidth < 1024) {
    const maxColumnsPerRow = Math.floor((availableWidth + gap) / (minColumnWidth + gap));
    // In landscape mode, prefer 3 columns; in portrait, prefer 2
    const preferredColumns = isLandscape ? 3 : 2;
    const columnsPerRow = Math.min(columnCount, Math.max(preferredColumns, Math.min(maxColumnsPerRow, preferredColumns)));
    const columnWidth = (availableWidth - (columnsPerRow - 1) * gap) / columnsPerRow;
    
    return {
      layout: 'tablet-wrap',
      columnsPerRow,
      columnWidth: Math.max(minColumnWidth, columnWidth)
    };
  }
  
  // Desktop
  const maxColumnsPerRow = Math.floor((availableWidth + gap) / (minColumnWidth + gap));
  const columnsPerRow = Math.min(columnCount, maxColumnsPerRow);
  const columnWidth = (availableWidth - (columnsPerRow - 1) * gap) / columnsPerRow;
  
  return {
    layout: 'desktop',
    columnsPerRow,
    columnWidth: Math.max(minColumnWidth, columnWidth)
  };
}

/**
 * Debounced function creator for width recalculation
 */
export function createDebouncedWidthCalculator(
  callback: () => void,
  delay: number = 150
): () => void {
  let timeoutId: NodeJS.Timeout;
  
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
  };
}