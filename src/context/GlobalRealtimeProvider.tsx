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
          
          // Invalidate views if their underlying physical tables change
          if (['socio_titulares', 'ingresos', 'socio_documentos'].includes(tableName)) {
            queryClient.invalidateQueries({ queryKey: ['supabaseData', 'vw_socio_titulares_estado'] });
          }
          if (['ingresos', 'socio_titulares'].includes(tableName)) {
            queryClient.invalidateQueries({ queryKey: ['supabaseData', 'vw_ingresos_localidad'] });
          }
          
          // Buscar todas las cachés de React Query activas que pertenezcan a esta tabla
          const queries = queryClient.getQueriesData({ queryKey: ['supabaseData', tableName] });
          
          queries.forEach(([queryKey, oldData]: [any, any]) => {
            if (!oldData) return;
            
            // Extraemos los filtros exactos de esta query específica
            // El formato es: ['supabaseData', tableName, selectQuery, JSON.stringify(filters), ...]
            const filtersStr = queryKey[3];
            let filters = {};
            try {
              filters = JSON.parse(filtersStr as string);
            } catch (e) {
              // Ignore parse errors
            }

            const matchesFilters = (item: any) => {
              if (!filters || Object.keys(filters).length === 0) return true;
              return Object.entries(filters).every(([key, value]) => {
                if (item[key] === undefined) return true; 
                return item[key] === value;
              });
            };

            let newData = [...(oldData.data || [])];
            let updated = false;

            if (payload.eventType === 'DELETE' && payload.old) {
              newData = newData.filter((item: any) => item.id !== payload.old.id);
              updated = true;
            } else if (payload.eventType === 'INSERT' && payload.new) {
              if (matchesFilters(payload.new)) {
                newData = [payload.new, ...newData];
                updated = true;
              }
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              if (matchesFilters(payload.new)) {
                const exists = newData.some((item: any) => item.id === payload.new.id);
                if (exists) {
                  newData = newData.map((item: any) => item.id === payload.new.id ? { ...item, ...payload.new } : item);
                } else {
                  newData = [payload.new, ...newData];
                }
                updated = true;
              } else {
                const exists = newData.some((item: any) => item.id === payload.new.id);
                if (exists) {
                  newData = newData.filter((item: any) => item.id !== payload.new.id);
                  updated = true;
                }
              }
            }

            if (updated) {
              // Actualizamos la caché de React Query para esta consulta exacta
              queryClient.setQueryData(queryKey, { ...oldData, data: newData });
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return <>{children}</>;
};
