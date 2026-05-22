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

// Registrar mutación por defecto para actualizaciones (Offline-First)
queryClient.setMutationDefaults(['updateRecord'], {
  mutationFn: async ({ tableName, id, record }: { tableName: string; id: string | number; record: any }) => {
    const { data, error } = await supabase
      .from(tableName)
      .update(record)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  onSuccess: (_data, variables) => {
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
  onSuccess: (_data, variables) => {
    queryClient.invalidateQueries({ queryKey: ['supabaseData', variables.tableName] });
  }
});

queryClient.setMutationDefaults(['deleteRecord'], {
  mutationFn: async ({ tableName, id, isSoftDelete }: { tableName: string; id: string | number; isSoftDelete: boolean }) => {
    let error;
    if (isSoftDelete) {
      const res = await supabase.from(tableName).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      error = res.error;
    } else {
      const res = await supabase.from(tableName).delete().eq('id', id);
      error = res.error;
    }
    if (error) throw error;
    return id;
  },
  onSuccess: (_data, variables) => {
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
