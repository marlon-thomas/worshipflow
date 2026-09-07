import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export function useSWUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || !('serviceWorker' in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker.ready.then((reg) => {
      registration = reg;

      // Check for updates periodically
      const checkInterval = setInterval(() => {
        reg.update();
      }, 60 * 1000); // every minute

      // Listen for controller change (new SW took over)
      let refreshing = false;
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

      return () => {
        clearInterval(checkInterval);
      };
    });

    return () => {
      // cleanup
    };
  }, []);

  const applyUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage('SKIP_WAITING');
    }
  };

  return { updateAvailable, applyUpdate };
}