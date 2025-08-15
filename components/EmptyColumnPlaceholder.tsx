'use client';

export interface EmptyColumnPlaceholderProps {
  onAddCard?: () => void;
  canAddCard?: boolean;
  columnTitle?: string;
  className?: string;
}

export default function EmptyColumnPlaceholder({
  onAddCard,
  canAddCard = false,
  columnTitle = 'this column',
  className = '',
}: EmptyColumnPlaceholderProps) {
  return (
    <div 
      className={`kanban-column-empty ${className}`}
      onClick={canAddCard ? onAddCard : undefined}
      role={canAddCard ? 'button' : undefined}
      tabIndex={canAddCard ? 0 : undefined}
      onKeyDown={canAddCard ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAddCard?.();
        }
      } : undefined}
    >
      <div className="kanban-column-empty-icon">
        <i className="ri-inbox-line"></i>
      </div>
      <div className="kanban-column-empty-text">
        No cards in {columnTitle}
      </div>
      {canAddCard && (
        <div className="kanban-column-empty-hint">
          Click to add your first card
        </div>
      )}
    </div>
  );
}