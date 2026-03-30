'use client';

import { useState, useEffect } from 'react';

/**
 * PWA install prompt.
 * Shows "Add to Home Screen" banner when the browser supports it.
 * Uses beforeinstallprompt event (Chrome/Edge/Samsung).
 * Falls back to manual instructions for Safari.
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem('sos-pwa-dismissed')) return;

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Safari: show manual prompt after 3 visits
    const visits = parseInt(localStorage.getItem('sos-visit-count') || '0') + 1;
    localStorage.setItem('sos-visit-count', String(visits));
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    if (isSafari && visits >= 3) {
      setShowBanner(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('sos-pwa-dismissed', 'true');
  }

  if (!showBanner || dismissed) return null;

  const isSafari = typeof navigator !== 'undefined' && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto">
      <div className="bg-sos-blue-800 text-white rounded-xl p-4 shadow-xl flex items-center gap-3">
        <img src="/logomark.svg" alt="SOS" className="h-10 w-10 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold">Add SOS to Home Screen</p>
          <p className="text-[10px] text-white/60">
            {isSafari
              ? 'Tap the share button, then "Add to Home Screen"'
              : 'Quick access, works offline, gets updates'}
          </p>
        </div>
        {deferredPrompt ? (
          <button onClick={handleInstall} className="text-xs font-bold px-3 py-2 rounded-lg bg-sos-red-500 hover:bg-sos-red-600 transition-colors flex-shrink-0">
            Install
          </button>
        ) : (
          <button onClick={handleDismiss} className="text-xs text-white/40 hover:text-white flex-shrink-0">✕</button>
        )}
      </div>
    </div>
  );
}
