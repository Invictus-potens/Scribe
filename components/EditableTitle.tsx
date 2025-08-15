'use client';

import { useState, useRef, useEffect } from 'react';

export interface EditableTitleProps {
  title: string;
  isEditing: boolean;
  canEdit: boolean;
  onStartEdit: () => void;
  onSave: (newTitle: string) => void;
  onCancel: () => void;
  className?: string;
  placeholder?: string;
  maxLength?: number;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'column' | 'board';
}

export default function EditableTitle({
  title,
  isEditing,
  canEdit,
  onStartEdit,
  onSave,
  onCancel,
  className = '',
  placeholder = 'Enter title...',
  maxLength = 100,
  loading = false,
  size = 'md',
  variant = 'default',
}: EditableTitleProps) {
  const [editValue, setEditValue] = useState(title);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update edit value when title changes (for real-time updates)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(title);
      setHasError(false);
    }
  }, [title, isEditing]);

  // Auto-focus and select text when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Small delay to ensure the input is rendered
      const timeoutId = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 10);
      return () => clearTimeout(timeoutId);
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    
    // Validation
    if (!trimmedValue) {
      setHasError(true);
      if (inputRef.current) {
        inputRef.current.focus();
      }
      return;
    }
    
    if (trimmedValue.length > maxLength) {
      setHasError(true);
      if (inputRef.current) {
        inputRef.current.focus();
      }
      return;
    }
    
    // Only save if there are actual changes
    if (trimmedValue !== title) {
      onSave(trimmedValue);
    } else {
      onCancel();
    }
  };

  const handleCancel = () => {
    setEditValue(title);
    setHasError(false);
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
    // Clear error on typing
    if (hasError && e.key !== 'Enter' && e.key !== 'Escape') {
      setHasError(false);
    }
  };

  const handleBlur = () => {
    // Small delay to allow click events on other elements
    setTimeout(() => {
      if (isEditing) {
        handleSave();
      }
    }, 100);
  };

  const handleClick = () => {
    if (canEdit && !isEditing && !loading) {
      onStartEdit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditValue(value);
    
    // Clear error when user starts typing valid content
    if (hasError && value.trim()) {
      setHasError(false);
    }
  };

  // Get size-based styles
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-sm px-1 py-0.5';
      case 'lg':
        return 'text-lg px-3 py-2';
      default:
        return 'text-base px-2 py-1';
    }
  };

  // Get variant-based styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'column':
        return 'font-semibold text-gray-800 dark:text-gray-100';
      case 'board':
        return 'font-bold text-xl text-gray-900 dark:text-gray-50';
      default:
        return 'font-medium text-gray-700 dark:text-gray-200';
    }
  };

  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={loading}
          className={`
            bg-white dark:bg-gray-700 border rounded focus:outline-none focus:ring-2 
            ${hasError 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-blue-500 focus:ring-blue-500'
            }
            ${getSizeStyles()} ${getVariantStyles()}
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            ${className}
          `}
        />
        {hasError && (
          <div className="absolute top-full left-0 mt-1 text-xs text-red-600 dark:text-red-400">
            {!editValue.trim() ? 'Title cannot be empty' : `Title must be ${maxLength} characters or less`}
          </div>
        )}
        {loading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <span
      onClick={handleClick}
      className={`
        ${canEdit && !loading
          ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors duration-150'
          : 'cursor-default'
        }
        ${getSizeStyles()} ${getVariantStyles()}
        ${loading ? 'opacity-50' : ''}
        ${className}
      `}
      title={canEdit && !loading ? 'Click to edit' : undefined}
      role={canEdit ? 'button' : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onKeyDown={canEdit ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      } : undefined}
    >
      {loading && (
        <span className="inline-block w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50"></span>
      )}
      {title}
    </span>
  );
}