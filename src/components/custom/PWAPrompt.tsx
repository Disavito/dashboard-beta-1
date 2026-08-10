import { useEffect } from 'react';
import { toast } from 'sonner';

export function PWAPrompt() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;
    let cleanups: Array<() => void> = [];

    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.indexedDB.deleteDatabase('dashboard-offline-db');
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    cleanups.push(() => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange));

    const checkUpdate = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        
        if (reg.waiting) {
          promptUserToUpdate(reg);
        }

        const handleUpdateFound = () => {
          const newWorker = reg.installing;
          if (newWorker) {
            const handleStateChange = () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                promptUserToUpdate(reg);
              }
            };
            newWorker.addEventListener('statechange', handleStateChange);
            cleanups.push(() => newWorker.removeEventListener('statechange', handleStateChange));
          }
        };
        reg.addEventListener('updatefound', handleUpdateFound);
        cleanups.push(() => reg.removeEventListener('updatefound', handleUpdateFound));

      } catch (err) {
        console.error('PWA Registration Error:', err);
      }
    };

    checkUpdate();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.getRegistration().then(reg => reg?.update());
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    cleanups.push(() => window.removeEventListener('visibilitychange', handleVisibility));

    return () => {
      cleanups.forEach(fn => fn());
    };
  }, []);

  const promptUserToUpdate = (reg: ServiceWorkerRegistration) => {
    toast.info('🚀 ¡Nueva versión del sistema lista! (Prueba Final)', {
      description: 'Hemos subido mejoras a FIMAGADI. Haz clic en "Refrescar" para aplicar los últimos cambios.',
      action: {
        label: 'Refrescar Aplicación',
        onClick: () => {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        },
      },
      duration: Infinity, 
      position: 'top-center',
      id: 'pwa-update-toast', // ID único para que no salgan 10 alertas
    });
  };

  return null;
}
