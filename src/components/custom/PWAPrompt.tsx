import { useEffect } from 'react';
import { toast } from 'sonner';
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWAPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log('SW Registered:', r);
      // Auto-check for updates every 15 minutes
      if (r) {
        setInterval(() => {
          r.update();
        }, 15 * 60 * 1000);
      }
    },
    onRegisterError(error: any) {
      console.error('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast.info('🚀 ¡Nueva versión de FIMAGADI disponible!', {
        description: 'Hemos subido mejoras al sistema. Para evitar errores o pantallas desactualizadas, por favor actualiza la aplicación ahora.',
        action: {
          label: 'Refrescar Aplicación',
          onClick: () => updateServiceWorker(true),
        },
        duration: Infinity, // Se queda hasta que hagan clic
        position: 'top-center',
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}
