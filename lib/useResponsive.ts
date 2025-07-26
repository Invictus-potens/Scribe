import { useState, useEffect } from 'react';

interface ScreenSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  isUltraWide: boolean;
  breakpoint: string;
}

export function useResponsive(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    width: 0,
    height: 0,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLargeDesktop: false,
    isUltraWide: false,
    breakpoint: 'xs'
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    function updateScreenSize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      let breakpoint = 'xs';
      let isMobile = false;
      let isTablet = false;
      let isDesktop = false;
      let isLargeDesktop = false;
      let isUltraWide = false;

      if (width >= 3840) {
        breakpoint = '5xl';
        isUltraWide = true;
      } else if (width >= 2560) {
        breakpoint = '4xl';
        isUltraWide = true;
      } else if (width >= 1920) {
        breakpoint = '3xl';
        isLargeDesktop = true;
      } else if (width >= 1536) {
        breakpoint = '2xl';
        isLargeDesktop = true;
      } else if (width >= 1280) {
        breakpoint = 'xl';
        isDesktop = true;
      } else if (width >= 1024) {
        breakpoint = 'lg';
        isDesktop = true;
      } else if (width >= 768) {
        breakpoint = 'md';
        isTablet = true;
      } else if (width >= 640) {
        breakpoint = 'sm';
        isMobile = true;
      } else {
        breakpoint = 'xs';
        isMobile = true;
      }

      setScreenSize({
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
        isLargeDesktop,
        isUltraWide,
        breakpoint
      });
    }

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return screenSize;
}

export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    function updateOrientation() {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    }

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
}

export function useTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }
  }, []);

  return isTouchDevice;
}

export function usePixelDensity() {
  const [pixelDensity, setPixelDensity] = useState(1);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPixelDensity(window.devicePixelRatio || 1);
    }
  }, []);

  return pixelDensity;
} 