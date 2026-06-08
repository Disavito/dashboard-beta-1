import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/context/UserContext';
import { toast } from 'sonner';

export function usePushNotifications() {
  const { user } = useUser();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (e) {
      console.error('Error checking push subscription', e);
    }
  };

  // Esta funcion convierte la VAPID public key de base64 a Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
  
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
  
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para activar notificaciones.');
      return;
    }

    try {
      // 1. Pedir permisos si no los tenemos
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm !== 'granted') {
        toast.warning('Permiso denegado para notificaciones.');
        return;
      }

      // 2. Registrar Service Worker si no está registrado
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }

      // 3. Suscribirse usando la VAPID Key pública
      const vapidPublicKey = ((window as any).APP_ENV?.VITE_VAPID_PUBLIC_KEY) || import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VITE_VAPID_PUBLIC_KEY no configurado en el archivo .env o en APP_ENV');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // 4. Guardar en Supabase
      const subJson = subscription.toJSON();
      
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth
      }, { onConflict: 'endpoint' });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success('¡Notificaciones de escritorio activadas con éxito!');

    } catch (error: any) {
      console.error('Error al suscribirse:', error);
      toast.error('Hubo un problema al activar notificaciones', { description: error.message });
    }
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribeToPush
  };
}
