'use client';

import { useResponsive, useOrientation, useTouchDevice, usePixelDensity } from '../lib/useResponsive';
import { useState, useEffect } from 'react';

interface ResponsiveDebugProps {
  show?: boolean;
}

export default function ResponsiveDebug({ show = false }: ResponsiveDebugProps) {
  const screenSize = useResponsive();
  const orientation = useOrientation();
  const isTouchDevice = useTouchDevice();
  const pixelDensity = usePixelDensity();
  const [appScale, setAppScale] = useState('0.75');

  useEffect(() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const scale = computedStyle.getPropertyValue('--app-scale').trim() || '0.75';
    setAppScale(scale);
  }, []);

  if (!show) return null;

  return (
<<<<<<< HEAD
    <div className="fixed bottom-4 left-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 text-xs">
      <div className="font-semibold mb-2 text-gray-900 dark:text-white">Debug Info</div>
      <div className="space-y-1 text-gray-600 dark:text-gray-300">
        <div><strong>Largura:</strong> {screenSize.width}px</div>
        <div><strong>Altura:</strong> {screenSize.height}px</div>
=======
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-xs">
      <div className="space-y-1">
        <div><strong>Resolução:</strong> {screenSize.width} × {screenSize.height}</div>
        <div><strong>Breakpoint:</strong> {screenSize.breakpoint}</div>
>>>>>>> parent of 5e1e5ca (Reverter)
        <div><strong>Orientação:</strong> {orientation}</div>
        <div><strong>Touch:</strong> {isTouchDevice ? 'Sim' : 'Não'}</div>
        <div><strong>Densidade:</strong> {pixelDensity}x</div>
        <div><strong>Escala App:</strong> {appScale}</div>
        <div><strong>Mobile:</strong> {screenSize.isMobile ? 'Sim' : 'Não'}</div>
        <div><strong>Tablet:</strong> {screenSize.isTablet ? 'Sim' : 'Não'}</div>
        <div><strong>Desktop:</strong> {screenSize.isDesktop ? 'Sim' : 'Não'}</div>
        <div><strong>Large Desktop:</strong> {screenSize.isLargeDesktop ? 'Sim' : 'Não'}</div>
        <div><strong>Ultra Wide:</strong> {screenSize.isUltraWide ? 'Sim' : 'Não'}</div>
      </div>
    </div>
  );
} 