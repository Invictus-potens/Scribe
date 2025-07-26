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
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-xs">
      <div className="space-y-1">
        <div><strong>Resolução:</strong> {screenSize.width} × {screenSize.height}</div>
        <div><strong>Breakpoint:</strong> {screenSize.breakpoint}</div>
        <div><strong>Orientação:</strong> {orientation}</div>
        <div><strong>Touch:</strong> {isTouchDevice ? 'Sim' : 'Não'}</div>
        <div><strong>Densidade:</strong> {pixelDensity}x</div>
        <div><strong>Mobile:</strong> {screenSize.isMobile ? 'Sim' : 'Não'}</div>
        <div><strong>Tablet:</strong> {screenSize.isTablet ? 'Sim' : 'Não'}</div>
        <div><strong>Desktop:</strong> {screenSize.isDesktop ? 'Sim' : 'Não'}</div>
        <div><strong>Large Desktop:</strong> {screenSize.isLargeDesktop ? 'Sim' : 'Não'}</div>
        <div><strong>Ultra Wide:</strong> {screenSize.isUltraWide ? 'Sim' : 'Não'}</div>
      </div>
    </div>
  );
} 