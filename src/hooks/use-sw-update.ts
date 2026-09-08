import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export function useSWUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !('serviceWorker' in navigator)) return;

    let checkInterval: ReturnType<typeof setInterval> | null = null;
    let refreshing = false;

    navigator.serviceWorker.ready.then((reg) => {
      registrationRef.current = reg;

      // Check for updates periodically
      checkInterval = setInterval(() => {
        reg.update();
      }, 60 * 1000); // every minute

      // Listen for controller change (new SW took over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      // Listen for update found
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      });
    });

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  const applyUpdate = () => {
    if (registrationRef.current?.waiting) {
      registrationRef.current.waiting.postMessage('SKIP_WAITING');
    }
  };

  return { updateAvailable, applyUpdate };
}