import { useUser } from '@/context/UserContext';
import { useCallback } from 'react';

export function useNavigationAccess() {
  const { roles, permissions } = useUser();

  const canAccess = useCallback((path: string) => {
    if (!roles) return false;

    // Los administradores tienen acceso irrestricto
    const isAdmin = roles.some(r => r.toLowerCase() === 'admin');
    if (isAdmin) return true;

    // Rutas públicas básicas para cualquier usuario autenticado
    const openPaths = ['/dashboard', '/reportes', '/jornada', '/inventory', '/presupuestos', '/ayuda', '/expenses', '/aprobaciones', '/cajas'];
    if (openPaths.includes(path)) return true;

    // Validación especial para Auditoría
    if (path === '/audit') {
      const isFinanzas = roles.some(r => ['finanzas_senior', 'finanzas_junior'].includes(r.toLowerCase()));
      return isFinanzas && (permissions?.has('/settings') ?? false);
    }

    // Validación estricta usando el Set "permissions" de UserContext
    // Este Set incluye tanto resource_permissions del Rol como custom_permissions individuales
    if (permissions && permissions.has(path)) {
      return true;
    }

    return false;
  }, [roles, permissions]);

  return { canAccess };
}
