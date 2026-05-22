import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
      retry: 1, // Solo 1 reintento en caso de fallo
      refetchOnWindowFocus: false, // Evitar refetch agresivo al enfocar ventana
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* 2. Envuelve la aplicación con el QueryClientProvider */}
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <UserProvider>
            <GlobalRealtimeProvider>
              <App />
              <Toaster />
            </GlobalRealtimeProvider>
          </UserProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
