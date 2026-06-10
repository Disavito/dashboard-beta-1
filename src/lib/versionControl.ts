/**
 * Este archivo se asegura de que cada vez que EasyPanel compila una nueva versión,
 * el navegador de todos los empleados se auto-destruya y limpie completamente su caché
 * (Service Workers viejos, caché HTTP) sin que el empleado tenga que hacer absolutamente nada.
 */

export async function ensureLatestVersion() {
  // @ts-ignore
  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown';
  const savedVersion = localStorage.getItem('fimagadi_app_version');

  // Si es la misma versión o estamos en dev sin la variable, no hacemos nada
  if (!savedVersion || savedVersion === currentVersion || currentVersion === 'unknown') {
    if (!savedVersion && currentVersion !== 'unknown') {
      localStorage.setItem('fimagadi_app_version', currentVersion);
    }
    return;
  }

  console.warn(`[Auto-Cura] Nueva versión detectada (${currentVersion}). Purgando sistema viejo (${savedVersion})...`);

  try {
    // 1. Eliminar todos los Service Workers (El famoso "Unregister Worker")
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }

    // 2. Eliminar todas las memorias Caché (El famoso "Clear Storage / Site Data")
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    }

    // 3. Guardar la nueva versión para que no entre en bucle infinito
    localStorage.setItem('fimagadi_app_version', currentVersion);

    // 4. Recargar la página automáticamente forzando descarga desde el servidor (Hard F5)
    window.location.reload();
  } catch (err) {
    console.error('Error al purgar la caché en la actualización:', err);
  }
}
