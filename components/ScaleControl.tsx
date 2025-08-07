'use client';

import { useState, useEffect } from 'react';

interface ScaleControlProps {
  show?: boolean;
}

export default function ScaleControl({ show = false }: ScaleControlProps) {
  const [currentScale, setCurrentScale] = useState(0.75);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const scale = parseFloat(computedStyle.getPropertyValue('--app-scale').trim()) || 0.75;
    setCurrentScale(scale);
  }, []);

  const updateScale = (newScale: number) => {
    const root = document.documentElement;
    root.style.setProperty('--app-scale', newScale.toString());
    setCurrentScale(newScale);
  };

  const scaleOptions = [
    { value: 0.75, label: '75% (Padrão)' },
    { value: 0.8, label: '80%' },
    { value: 0.85, label: '85%' },
    { value: 0.9, label: '90%' },
    { value: 0.95, label: '95%' },
    { value: 1, label: '100%' },
  ];

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 min-w-48">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Escala da Aplicação
        </h3>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {isVisible ? '−' : '+'}
        </button>
      </div>
      
      {isVisible && (
        <div className="space-y-2">
          {scaleOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updateScale(option.value)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                currentScale === option.value
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
          
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Escala atual: {Math.round(currentScale * 100)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
