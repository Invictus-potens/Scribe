'use client';

import { useResponsive, useOrientation, useTouchDevice, usePixelDensity } from '../lib/useResponsive';

interface ResponsiveDebugProps {
  show?: boolean;
}

export default function ResponsiveDebug({ show = false }: ResponsiveDebugProps) {
  const screenSize = useResponsive();
  const orientation = useOrientation();
  const isTouchDevice = useTouchDevice();
  const pixelDensity = usePixelDensity();

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 text-xs">
      <div className="font-semibold mb-2 text-gray-900 dark:text-white">Debug Info</div>
      <div className="space-y-1 text-gray-600 dark:text-gray-300">
        <div><strong>Largura:</strong> {screenSize.width}px</div>
        <div><strong>Altura:</strong> {screenSize.height}px</div>
        <div><strong>Orientação:</strong> {orientation}</div>
        <div><strong>Touch:</strong> {isTouchDevice ? 'Sim' : 'Não'}</div>
        <div><strong>Densidade:</strong> {pixelDensity}x</div>
        <div><strong>Mobile:</strong> {screenSize.isMobile ? 'Sim' : 'Não'}</div>
        <div><strong>Tablet:</strong> {screenSize.isTablet ? 'Sim' : 'Não'}</div>
        <div><strong>Desktop:</strong> {screenSize.isDesktop ? 'Sim' : 'Não'}</div>
      </div>
    </div>
  );
} 