import { useEffect } from 'react';
import { toast } from 'sonner';

export function PWAPrompt() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;

    // Escuchar cuando el nuevo SW toma el control para forzar la recarga
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    const checkUpdate = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        
        // Si ya hay un SW esperando en cola
        if (reg.waiting) {
          promptUserToUpdate(reg);
        }

        // Si se detecta la llegada de un nuevo SW
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              // Si terminó de instalarse y hay un controlador anterior (es decir, es una actualización)
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                promptUserToUpdate(reg);
              }
            });
          }
        });

      } catch (err) {
        console.error('PWA Registration Error:', err);
      }
    };

    checkUpdate();

    // Forzar chequeo a la nube cada vez que el usuario vuelve a abrir la pestaña
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.getRegistration().then(reg => reg?.update());
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);

    return () => window.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const promptUserToUpdate = (reg: ServiceWorkerRegistration) => {
    toast.info('🚀 ¡Nueva versión del sistema lista!', {
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
