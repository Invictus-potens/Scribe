'use client';

import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';

type ToastType = 'info' | 'success' | 'error';

interface ToastItem {
  id: string;
  type: ToastType;
  text: string;
  durationMs?: number;
}

interface ToastContextValue {
  toast: {
    show: (text: string, type?: ToastType, durationMs?: number) => void;
    info: (text: string, durationMs?: number) => void;
    success: (text: string, durationMs?: number) => void;
    error: (text: string, durationMs?: number) => void;
  }
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((text: string, type: ToastType = 'info', durationMs = 3000) => {
    // Do Not Disturb: suppress toasts when enabled
    try {
      if (typeof window !== 'undefined') {
        const dnd = localStorage.getItem('settings:dnd') === 'true';
        if (dnd) return;
      }
    } catch {}
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, text, type, durationMs }]);
    // Play sound if enabled
    try {
      if (typeof window !== 'undefined') {
        const soundOn = localStorage.getItem('settings:notificationSound') !== 'false';
        if (soundOn) {
          const volumeStr = localStorage.getItem('settings:notificationSoundVolume') || '0.6';
          const parsed = parseFloat(volumeStr);
          const volume = isNaN(parsed) ? 0.6 : Math.max(0, Math.min(1, parsed));
          void (async () => {
            try {
              const selectedFile = localStorage.getItem('settings:notificationSoundFile') || '';
              let src = '';
              if (selectedFile) {
                src = `/notification-sounds/${selectedFile}`;
              } else {
                const cachedFirst = localStorage.getItem('settings:notificationSoundFirstFile') || '';
                if (cachedFirst) {
                  src = `/notification-sounds/${cachedFirst}`;
                } else {
                  try {
                    const res = await fetch('/notification-sounds/manifest.json');
                    if (res.ok) {
                      const json = await res.json();
                      const first = Array.isArray(json?.sounds) && json.sounds[0]?.file;
                      if (first) {
                        try { localStorage.setItem('settings:notificationSoundFirstFile', first); } catch {}
                        src = `/notification-sounds/${first}`;
                      }
                    }
                  } catch {
                    // ignore
                  }
                }
                if (!src) src = '/notification-sounds/notif.wav';
              }
              const audio = new Audio();
              const tryPlay = async (path: string) => {
                return new Promise<void>((resolve, reject) => {
                  audio.src = `${path}?ts=${Date.now()}`;
                  audio.preload = 'auto';
                  audio.volume = volume;
                  audio.oncanplay = () => {
                    audio.play().then(() => resolve()).catch(reject);
                  };
                  audio.onerror = () => reject(new Error('audio element error for ' + path));
                });
              };
              const ext = (src.split('.').pop() || '').toLowerCase();
              const base = src.slice(0, src.length - ext.length - 1);
              try {
                await tryPlay(src);
              } catch {
                // Try alternative extension (wav<->mp3)
                const alt = ext === 'wav' ? `${base}.mp3` : `${base}.wav`;
                try { await tryPlay(alt); } catch {}
              }
            } catch {}
          })();
        }
      }
    } catch {}
    if (durationMs > 0) {
      setTimeout(() => remove(id), durationMs);
    }
  }, [remove]);

  const value = useMemo<ToastContextValue>(() => ({
    toast: {
      show,
      info: (text, durationMs) => show(text, 'info', durationMs),
      success: (text, durationMs) => show(text, 'success', durationMs),
      error: (text, durationMs) => show(text, 'error', durationMs),
    }
  }), [show]);

  // ESC para limpar todos os toasts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setToasts([]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Container */}
      <div className="fixed top-4 right-4 z-[1000] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
               className={`pointer-events-auto rounded-md px-4 py-3 shadow-md text-sm flex items-start gap-3 transition-opacity 
               ${t.type === 'error' ? 'bg-red-600 text-white' : t.type === 'success' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}
          >
            <span className="flex-1">{t.text}</span>
            <button onClick={() => remove(t.id)} className="opacity-80 hover:opacity-100">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}


