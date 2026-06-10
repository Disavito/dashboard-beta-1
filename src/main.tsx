import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createIDBPersister } from './lib/queryPersister.ts';
import { supabase } from './lib/supabaseClient.ts';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './components/ui-custom/theme-provider.tsx';
import { UserProvider } from './context/UserContext.tsx';
import { GlobalRealtimeProvider } from './context/GlobalRealtimeProvider.tsx';
import { Toaster } from './components/ui/toaster.tsx';

// Configuración optimizada del cliente de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos antes de considerar datos obsoletos
      gcTime: 10 * 60 * 1000, // 10 minutos en garbage collection
      retry: 2, // Reintentar 2 veces
      refetchOnWindowFocus: false, // Evitar refetch agresivo al enfocar ventana
    },
    mutations: {
      retry: 3, // Importante para offline: reintentar mutaciones fallidas por red
    }
  },
});

// Registrar mutación por defecto para actualizaciones (Offline-First + Optimistic UI)
queryClient.setMutationDefaults(['updateRecord'], {
  mutationFn: async ({ tableName, id, record }: { tableName: string; id: string | number; record: any }) => {
    // CQRS: Leer de Vistas, Escribir en Tablas Base.
    const targetTable = tableName === 'vw_socio_titulares_estado' ? 'socio_titulares' : tableName;
    
    const { data, error } = await supabase
      .from(targetTable)
      .update(record)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  onMutate: async (variables) => {
    const queryKey = ['supabaseData', variables.tableName];
    await queryClient.cancelQueries({ queryKey });
    const previousQueries = queryClient.getQueriesData({ queryKey });

    queryClient.setQueriesData({ queryKey }, (oldData: any) => {
      if (!oldData || !oldData.data) return oldData;
      return {
        ...oldData,
        data: oldData.data.map((item: any) => item.id === variables.id ? { ...item, ...variables.record } : item)
      };
    });

    return { previousQueries };
  },
  onError: (_err, _variables, context) => {
    if (context?.previousQueries) {
      context.previousQueries.forEach(([key, oldData]) => {
        queryClient.setQueryData(key, oldData);
      });
    }
  },
  onSettled: (_data, _error, variables) => {
    queryClient.invalidateQueries({ queryKey: ['supabaseData', variables.tableName] });
  }
});

queryClient.setMutationDefaults(['addRecord'], {
  mutationFn: async ({ tableName, record }: { tableName: string; record: any }) => {
    const { data, error } = await supabase
      .from(tableName)
      .insert(record)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  onMutate: async (variables) => {
    const queryKey = ['supabaseData', variables.tableName];
    await queryClient.cancelQueries({ queryKey });
    const previousQueries = queryClient.getQueriesData({ queryKey });

    queryClient.setQueriesData({ queryKey }, (oldData: any) => {
      if (!oldData || !oldData.data) return oldData;
      // Añadir al inicio con un ID temporal para que se vea instantáneamente
      const tempRecord = { ...variables.record, id: `temp-${Date.now()}` };
      return {
        ...oldData,
        data: [tempRecord, ...oldData.data],
        totalCount: (oldData.totalCount || 0) + 1
      };
    });

    return { previousQueries };
  },
  onError: (_err, _variables, context) => {
    if (context?.previousQueries) {
      context.previousQueries.forEach(([key, oldData]) => {
        queryClient.setQueryData(key, oldData);
      });
    }
  },
  onSettled: (_data, _error, variables) => {
    queryClient.invalidateQueries({ queryKey: ['supabaseData', variables.tableName] });
  }
});

queryClient.setMutationDefaults(['deleteRecord'], {
  mutationFn: async ({ tableName, id, isSoftDelete }: { tableName: string; id: string | number; isSoftDelete: boolean }) => {
    // CQRS: Leer de Vistas, Escribir en Tablas Base.
    const targetTable = tableName === 'vw_socio_titulares_estado' ? 'socio_titulares' : tableName;

    let error;
    if (isSoftDelete) {
      const res = await supabase.from(targetTable).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      error = res.error;
    } else {
      const res = await supabase.from(targetTable).delete().eq('id', id);
      error = res.error;
    }
    if (error) throw error;
    return id;
  },
  onMutate: async (variables) => {
    const queryKey = ['supabaseData', variables.tableName];
    await queryClient.cancelQueries({ queryKey });
    const previousQueries = queryClient.getQueriesData({ queryKey });

    queryClient.setQueriesData({ queryKey }, (oldData: any) => {
      if (!oldData || !oldData.data) return oldData;
      return {
        ...oldData,
        data: oldData.data.filter((item: any) => String(item.id) !== String(variables.id)),
        totalCount: Math.max(0, (oldData.totalCount || 0) - 1)
      };
    });

    return { previousQueries };
  },
  onError: (_err, _variables, context) => {
    if (context?.previousQueries) {
      context.previousQueries.forEach(([key, oldData]) => {
        queryClient.setQueryData(key, oldData);
      });
    }
  },
  onSettled: (_data, _error, variables) => {
    queryClient.invalidateQueries({ queryKey: ['supabaseData', variables.tableName] });
  }
});

const persister = createIDBPersister('dashboard-offline-db');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* 2. Envuelve la aplicación con el PersistQueryClientProvider */}
      <PersistQueryClientProvider 
        client={queryClient}
        persistOptions={{ persister }}
      >
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <UserProvider>
            <GlobalRealtimeProvider>
              <App />
              <Toaster />
            </GlobalRealtimeProvider>
          </UserProvider>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Registrar el Service Worker de forma independiente al inicio
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('Service Worker registrado con éxito en scope:', reg.scope);
      })
      .catch(err => {
        console.error('Fallo al registrar el Service Worker:', err);
      });
  });
}
