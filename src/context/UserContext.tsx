import React, { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

// Define un tipo que coincide con la estructura real de los datos de Supabase en tiempo de ejecución.
// 'roles' es un OBJETO de rol, ya que la consulta 'select' de una FK
// devuelve el objeto relacionado directamente para cada fila de user_roles.
type SupabaseFetchedRolesData = {
  roles: {
    id: number;
    role_name: string;
  };
};

interface UserContextType {
  user: User | null;
  roles: string[] | null;
  permissions: Set<string> | null;
  customPermissions: Record<string, boolean> | null;
  loading: boolean;
}

// Usamos React.createContext explícitamente para evitar problemas de desestructuración en el runtime.
const UserContext = React.createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[] | null>(null);
  const [permissions, setPermissions] = useState<Set<string> | null>(null);
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(true);
  const prevUserIdRef = useRef<string | null>(null);

  const activeFetchIdRef = useRef<number>(0);

  // Usamos useCallback para memoizar esta función y evitar que se recree en cada render.
  const fetchUserAndRolesAndPermissions = useCallback(async () => {
    const fetchId = ++activeFetchIdRef.current;
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (fetchId !== activeFetchIdRef.current) return;
      setUser(authUser);

      if (authUser) {
        // 1. Obtener los roles del usuario, incluyendo el ID del rol
        const { data: userRolesDataRaw, error: userRolesError } = await supabase
          .from('user_roles')
          .select('roles(id, role_name)')
          .eq('user_id', authUser.id);

        if (fetchId !== activeFetchIdRef.current) return;

        if (userRolesError) {
          console.error('UserContext: Error fetching user roles:', userRolesError);
          throw userRolesError;
        }

        // Tratar los datos crudos como un array de 'any' para evitar la inferencia incorrecta de TypeScript
        const userRolesData: any[] = userRolesDataRaw || [];

        // Mapeo para obtener nombres de roles
        const fetchedRoles = userRolesData
          .map(item => (item as SupabaseFetchedRolesData).roles?.role_name)
          .filter(Boolean) as string[] || [];
        
        if (fetchId !== activeFetchIdRef.current) return;
        setRoles(fetchedRoles);

        // 3. Obtener permisos personalizados (custom_permissions) desde colaboradores
        const { data: colabData, error: colabError } = await supabase
          .from('colaboradores')
          .select('custom_permissions')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (fetchId !== activeFetchIdRef.current) return;

        let customPerms = {};
        if (colabError) {
          console.error('UserContext: Error fetching custom permissions:', colabError);
          setCustomPermissions({});
        } else {
          customPerms = colabData?.custom_permissions || {};
          setCustomPermissions(customPerms);
        }

        // 2. Obtener los permisos de recursos basados en los roles del usuario
        if (fetchedRoles.length > 0) {
          const roleIds = userRolesData
            .map(item => (item as SupabaseFetchedRolesData).roles?.id)
            .filter(Boolean) as number[];

          if (roleIds.length === 0) {
              console.warn('UserContext: No role IDs found for user, setting empty permissions.');
              if (fetchId === activeFetchIdRef.current) {
                setPermissions(new Set());
                setLoading(false);
              }
              return;
          }
          
          const { data: permissionsData, error: permissionsError } = await supabase
            .from('resource_permissions')
            .select('resource_path')
            .in('role_id', roleIds)
            .eq('can_access', true);

          if (fetchId !== activeFetchIdRef.current) return;

          if (permissionsError) {
            console.error('UserContext: Error fetching permissions:', permissionsError);
            throw permissionsError;
          }

          const fetchedPermissions = new Set(permissionsData?.map(p => p.resource_path) || []);
          
          if (fetchedPermissions.size > 0) {
            fetchedPermissions.add('/');
          }

          if ((customPerms as Record<string, boolean>).can_invoice_only) {
            fetchedPermissions.add('/invoicing');
          }
          if ((customPerms as Record<string, boolean>).can_manage_inventory) {
            fetchedPermissions.add('/inventory');
          }
          if ((customPerms as Record<string, boolean>).can_manage_jornada) {
            fetchedPermissions.add('/jornada');
          }
          if ((customPerms as Record<string, boolean>).can_manage_finances) {
            fetchedPermissions.add('/income');
            fetchedPermissions.add('/expenses');
            fetchedPermissions.add('/accounts');
          }
          if ((customPerms as Record<string, boolean>).can_view_income) {
            fetchedPermissions.add('/income');
          }
          if ((customPerms as Record<string, boolean>).can_view_expenses) {
            fetchedPermissions.add('/expenses');
          }
          if ((customPerms as Record<string, boolean>).can_view_accounts) {
            fetchedPermissions.add('/accounts');
          }

          if (fetchId === activeFetchIdRef.current) {
            setPermissions(fetchedPermissions);
          }

        } else {
          if (fetchId === activeFetchIdRef.current) {
            setPermissions(new Set());
          }
        }

      } else {
        if (fetchId === activeFetchIdRef.current) {
          setRoles(null);
          setPermissions(null);
          setCustomPermissions(null);
        }
      }
    } catch (error) {
      console.error('UserContext: Global error fetching user, roles, or permissions:', error);
      if (fetchId === activeFetchIdRef.current) {
        setRoles(null);
        setPermissions(new Set());
        setCustomPermissions({});
      }
    } finally {
      if (fetchId === activeFetchIdRef.current) {
        setLoading(false);
      }
    }
  }, []); 

  useEffect(() => {
    fetchUserAndRolesAndPermissions();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event) && prevUserIdRef.current === session.user.id) {
          setUser(session.user);
          setLoading(false); 
          return; 
        }

        prevUserIdRef.current = session.user.id;
        setUser(session.user); 
        fetchUserAndRolesAndPermissions();
      } else {
        activeFetchIdRef.current++; // Invalidate any ongoing fetch
        prevUserIdRef.current = null;
        setUser(null);
        setRoles(null);
        setPermissions(new Set());
        setCustomPermissions(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserAndRolesAndPermissions]);

  return (
    <UserContext.Provider value={{ user, roles, permissions, customPermissions, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = React.useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
