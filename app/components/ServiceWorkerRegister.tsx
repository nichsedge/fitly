'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from './AppIcon';

/**
 * Registers the service worker and detects when a new version has been
 * deployed. When the updated worker finishes activating (our sw.js calls
 * skipWaiting automatically), shows a dismissible banner offering a refresh.
 */
export default function ServiceWorkerRegister() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;

    const onStateChange = () => {
      // installing worker reached 'activated' -> next reload serves the new version
      if (registration?.installing && registration.installing.state === 'activated') {
        setUpdateReady(true);
      }
    };

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          registration = reg;

          // Check for updates on each visit after the initial one.
          if (document.visibilityState === 'visible' && performance.getEntriesByType('navigation').length > 0) {
            reg.update().catch(() => { });
          }

          if (reg.waiting || (reg.installing && reg.installing.state === 'installed')) {
            setUpdateReady(true);
          }

          reg.addEventListener('updatefound', () => {
            reg.installing?.addEventListener('statechange', onStateChange);
          });
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
    };

    window.addEventListener('load', register);
    return () => {
      window.removeEventListener('load', register);
      registration?.installing?.removeEventListener('statechange', onStateChange);
    };
  }, []);

  return (
    <>
      {updateReady && (
        <div
          role="status"
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'calc(var(--space-5, 20px) + env(safe-area-inset-bottom, 0px))',
            zIndex: 130,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--surface, #fff)',
            border: '1px solid var(--accent)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
          }}
        >
          <Sparkles size={15} color="var(--accent)" />
          <span>New version available</span>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', fontSize: 12 }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          <button
            aria-label="Dismiss"
            onClick={() => setUpdateReady(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
