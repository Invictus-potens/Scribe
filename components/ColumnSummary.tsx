'use client';

import { useMemo } from 'react';
import type { KanbanCard } from '../lib/kanbanHelpers';

export interface ColumnSummaryProps {
  cards: KanbanCard[];
  wipLimit?: number | null;
  showPriorityBreakdown?: boolean;
  showDueDateWarnings?: boolean;
  filteredCount?: number;
  className?: string;
}

interface PriorityBreakdown {
  high: number;
  medium: number;
  low: number;
}

interface DateWarnings {
  overdue: number;
  upcoming: number; // Due within 3 days
}

export default function ColumnSummary({
  cards,
  wipLimit,
  showPriorityBreakdown = true,
  showDueDateWarnings = true,
  filteredCount,
  className = '',
}: ColumnSummaryProps) {
  // Calculate priority breakdown
  const priorityBreakdown = useMemo((): PriorityBreakdown => {
    return cards.reduce(
      (acc, card) => {
        acc[card.priority]++;
        return acc;
      },
      { high: 0, medium: 0, low: 0 }
    );
  }, [cards]);

  // Calculate date warnings
  const dateWarnings = useMemo((): DateWarnings => {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    return cards.reduce(
      (acc, card) => {
        if (card.due_date) {
          const dueDate = new Date(card.due_date);
          if (dueDate < now) {
            acc.overdue++;
          } else if (dueDate <= threeDaysFromNow) {
            acc.upcoming++;
          }
        }
        return acc;
      },
      { overdue: 0, upcoming: 0 }
    );
  }, [cards]);

  const totalCards = cards.length;
  const displayCount = filteredCount !== undefined ? filteredCount : totalCards;
  const isFiltered = filteredCount !== undefined && filteredCount !== totalCards;

  // WIP limit status
  const wipStatus = useMemo(() => {
    if (typeof wipLimit !== 'number' || wipLimit < 0) return null;
    
    const isExceeded = totalCards > wipLimit;
    const isAtLimit = totalCards === wipLimit;
    
    return {
      limit: wipLimit,
      current: totalCards,
      isExceeded,
      isAtLimit,
      percentage: wipLimit > 0 ? (totalCards / wipLimit) * 100 : 0,
    };
  }, [totalCards, wipLimit]);

  return (
    <div className={`kanban-column-summary ${className}`}>
      {/* Card count and WIP limit */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isFiltered ? `${displayCount}/${totalCards}` : totalCards} 
            {totalCards === 1 ? ' card' : ' cards'}
          </span>
          
          {wipStatus && (
            <div className="flex items-center space-x-1">
              <div
                className={`
                  text-xs px-2 py-1 rounded-full font-medium
                  ${wipStatus.isExceeded 
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                    : wipStatus.isAtLimit
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }
                `}
                title={`WIP Limit: ${wipStatus.current}/${wipStatus.limit}`}
              >
                WIP {wipStatus.limit}
              </div>
              
              {/* WIP progress bar */}
              <div className="w-8 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className={`
                    h-full transition-all duration-300 ease-out
                    ${wipStatus.isExceeded 
                      ? 'bg-red-500' 
                      : wipStatus.isAtLimit
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                    }
                  `}
                  style={{ 
                    width: `${Math.min(100, wipStatus.percentage)}%` 
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Priority breakdown */}
      {showPriorityBreakdown && totalCards > 0 && (
        <div className="mb-2">
          <div className="flex items-center space-x-3 text-xs">
            {priorityBreakdown.high > 0 && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">
                  {priorityBreakdown.high} high
                </span>
              </div>
            )}
            
            {priorityBreakdown.medium > 0 && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">
                  {priorityBreakdown.medium} med
                </span>
              </div>
            )}
            
            {priorityBreakdown.low > 0 && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">
                  {priorityBreakdown.low} low
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Due date warnings */}
      {showDueDateWarnings && (dateWarnings.overdue > 0 || dateWarnings.upcoming > 0) && (
        <div className="flex items-center space-x-3 text-xs">
          {dateWarnings.overdue > 0 && (
            <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
              <i className="ri-alarm-warning-line w-3 h-3"></i>
              <span>{dateWarnings.overdue} overdue</span>
            </div>
          )}
          
          {dateWarnings.upcoming > 0 && (
            <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
              <i className="ri-time-line w-3 h-3"></i>
              <span>{dateWarnings.upcoming} due soon</span>
            </div>
          )}
        </div>
      )}

      {/* Empty state message */}
      {totalCards === 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 italic">
          No cards yet
        </div>
      )}
    </div>
  );
}