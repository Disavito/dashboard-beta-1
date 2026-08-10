import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

export const GlobalRealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Un solo canal que escucha TODAS las tablas públicas
    const channel = supabase.channel('global-realtime-master')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          const tableName = payload.table;
          
          // Invalidación limpia y robusta de React Query en lugar de parsing manual frágil
          if (tableName) {
            queryClient.invalidateQueries({ queryKey: ['supabaseData', tableName] });
          }

          // Invalidar vistas dependientes cuando cambian las tablas base
          if (['socio_titulares', 'ingresos', 'socio_documentos'].includes(tableName)) {
            queryClient.invalidateQueries({ queryKey: ['supabaseData', 'vw_socio_titulares_estado'] });
          }

          if (['ingresos', 'socio_titulares'].includes(tableName)) {
            queryClient.invalidateQueries({ queryKey: ['supabaseData', 'vw_ingresos_localidad'] });
          }

          if (tableName === 'approval_requests') {
            queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
          }

          if (['jornadas', 'registros_jornada'].includes(tableName)) {
            queryClient.invalidateQueries({ queryKey: ['adminJornadas'] });
            queryClient.invalidateQueries({ queryKey: ['jornada'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return <>{children}</>;
};
