import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useUser } from '@/context/UserContext';

interface UseSupabaseDataOptions {
  tableName: string;
  initialFilters?: Record<string, any>;
  initialSort?: { column: string; ascending: boolean };
  enabled?: boolean;
  selectQuery?: string;
  limit?: number;
  fetchAll?: boolean;
  page?: number;        // 0-indexed page number
  pageSize?: number;    // items per page
  searchQuery?: string; // global search text
  searchColumns?: string[]; // columns to apply the text search to
  disableRealtime?: boolean; // prevent subscribing to realtime changes
}

export function useSupabaseData<T>(options: UseSupabaseDataOptions) {
  const { 
    tableName, 
    initialFilters = {}, 
    initialSort, 
    enabled = true, 
    selectQuery = '*', 
    limit, 
    fetchAll = false,
    page,
    pageSize,
    searchQuery,
    searchColumns,
    disableRealtime = false
  } = options;
  
  const queryClient = useQueryClient();
  const { user, roles } = useUser();

  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const [sort, setSort] = useState(initialSort);

  const queryKey = [
    'supabaseData',
    tableName,
    selectQuery,
    JSON.stringify(filters),
    JSON.stringify(sort),
    limit,
    fetchAll,
    page,
    pageSize,
    searchQuery,
    JSON.stringify(searchColumns)
  ];

  const queryFn = async () => {
    // Helper to build the base query with filters and sorting
    const buildQuery = () => {
      let query = supabase.from(tableName).select(selectQuery, { count: 'exact' });

      // Apply search if provided
      if (searchQuery && searchColumns && searchColumns.length > 0) {
        const searchConditions = searchColumns.map(col => `${col}.ilike.%${searchQuery}%`).join(',');
        query = query.or(searchConditions);
      }

      // Apply filters
      for (const key in filters) {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          query = query.eq(key, filters[key]);
        }
      }

      // Apply sorting
      if (sort) {
        query = query.order(sort.column, { ascending: sort.ascending });
      } else {
        const tablesWithCreatedAt = ['ingresos', 'gastos', 'colaboradores', 'socio_titulares'];
        if (tablesWithCreatedAt.includes(tableName)) {
          query = query.order('created_at', { ascending: false });
        }
      }

      // Apply soft delete filter
      const tablesWithSoftDeletes = ['ingresos', 'gastos', 'inventory_items', 'socio_documentos'];
      if (tablesWithSoftDeletes.includes(tableName)) {
        query = query.is('deleted_at', null);
      }

      return query;
    };

    let allData: T[] = [];
    let finalCount = 0;

    if (fetchAll && limit === undefined && page === undefined) {
      // Fetch all records in batches of 1000
      const BATCH_SIZE = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const query = buildQuery().range(from, from + BATCH_SIZE - 1);
        const { data: batch, error: batchError, count } = await query;

        if (batchError) throw batchError;

        allData = [...allData, ...(batch as T[])];
        if (from === 0 && count !== null) finalCount = count;
        hasMore = batch.length === BATCH_SIZE;
        from += BATCH_SIZE;
      }
    } else {
      // Single fetch or paginated fetch
      const query = buildQuery();
      
      if (page !== undefined && pageSize !== undefined) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        query.range(from, to);
      } else if (limit !== undefined) {
        query.limit(limit);
      }

      const { data: fetchedData, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      allData = fetchedData as T[];
      if (count !== null) finalCount = count;
    }

    return { data: allData, totalCount: finalCount };
  };

  const { data: queryData, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
    placeholderData: keepPreviousData,
  });

  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Realtime subscription mapping cache updates
  useEffect(() => {
    if (!enabled || disableRealtime) return;

    // Use a unique channel name per hook instance to prevent conflicts
    const channelName = `realtime-${tableName}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          queryClient.setQueriesData({ queryKey: ['supabaseData', tableName] }, (oldData: any) => {
            if (!oldData) return oldData;
            
            let newData = [...(oldData.data || [])];
            
            const matchesFilters = (item: any) => {
              const currentFilters = filtersRef.current;
              if (!currentFilters || Object.keys(currentFilters).length === 0) return true;
              return Object.entries(currentFilters).every(([key, value]) => {
                // Solo filtraremos si el campo existe en el objeto nuevo
                if (item[key] === undefined) return true; 
                return item[key] === value;
              });
            };

            if (payload.eventType === 'DELETE' && payload.old) {
              newData = newData.filter((item: any) => item.id !== payload.old.id);
            } else if (payload.eventType === 'INSERT' && payload.new) {
              if (matchesFilters(payload.new)) {
                newData = [payload.new, ...newData];
              }
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              if (matchesFilters(payload.new)) {
                // Actualizar o añadir si de pronto ahora sí cumple el filtro
                const exists = newData.some((item: any) => item.id === payload.new.id);
                if (exists) {
                  newData = newData.map((item: any) => item.id === payload.new.id ? { ...item, ...payload.new } : item);
                } else {
                  newData = [payload.new, ...newData];
                }
              } else {
                // Si ya no cumple el filtro tras la actualización, se elimina de la vista
                newData = newData.filter((item: any) => item.id !== payload.new.id);
              }
            }

            return { ...oldData, data: newData };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, disableRealtime, tableName, queryClient]);

  const addRecord = useCallback(async (record: Partial<T>) => {
    const { data: newRecord, error: insertError } = await supabase
      .from(tableName)
      .insert(record as any)
      .select()
      .single();

    if (insertError) {
      toast.error(`Error al añadir ${tableName}`, { description: insertError.message });
      return null;
    } else {
      queryClient.invalidateQueries({ queryKey: ['supabaseData', tableName] });
      toast.success(`${tableName} añadido correctamente.`);
      return newRecord as T;
    }
  }, [tableName, queryClient]);

  const updateRecord = useCallback(async (id: string | number, record: Partial<T>) => {
    const { data: updatedRecord, error: updateError } = await supabase
      .from(tableName)
      .update(record as any)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      toast.error(`Error al actualizar ${tableName}`, { description: updateError.message });
      return null;
    } else {
      queryClient.invalidateQueries({ queryKey: ['supabaseData', tableName] });
      toast.success(`${tableName} actualizado correctamente.`);
      return updatedRecord as T;
    }
  }, [tableName, queryClient]);

  const deleteRecord = useCallback(async (id: string | number, extraPayload?: any) => {
    // Si es un rol restringido ('ingeniero' o 'finanzas') y está intentando borrar un ingreso o gasto, generamos una solicitud de aprobación
    const isRestrictedRole = roles?.includes('ingeniero') || roles?.includes('finanzas');
    const isProtectedTable = ['ingresos', 'gastos'].includes(tableName);
    
    if (isRestrictedRole && isProtectedTable) {
      if (!user) {
        toast.error('No se pudo identificar al usuario para la solicitud.');
        return false;
      }
      
      const requestType = tableName === 'ingresos' ? 'delete_income' : 'delete_expense';
      const payload = { reason: 'Eliminación solicitada desde la interfaz', ...extraPayload };
      
      const { error } = await supabase.from('approval_requests').insert({
        requested_by: user.id,
        request_type: requestType,
        reference_id: String(id),
        payload: payload,
        status: 'pending'
      });
      
      if (error) {
        toast.error('Error al enviar solicitud de aprobación', { description: error.message });
        return false;
      } else {
        toast.success('Solicitud de eliminación enviada a los administradores.');
        return true;
      }
    }

    // If table has soft delete, use update instead of delete
    const tablesWithSoftDeletes = ['ingresos', 'gastos', 'inventory_items', 'socio_documentos'];
    
    let dbError;
    if (tablesWithSoftDeletes.includes(tableName)) {
      const { error } = await supabase.from(tableName).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      dbError = error;
    } else {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      dbError = error;
    }

    if (dbError) {
      toast.error(`Error al eliminar ${tableName}`, { description: dbError.message });
      return false;
    } else {
      queryClient.invalidateQueries({ queryKey: ['supabaseData', tableName] });
      toast.success(`${tableName} eliminado correctamente.`);
      return true;
    }
  }, [tableName, queryClient, roles, user]);

  return {
    data: queryData?.data || [],
    totalCount: queryData?.totalCount || 0,
    loading: isLoading,
    error: error ? error.message : null,
    filters,
    setFilters,
    sort,
    setSort,
    refreshData: (_isBackground?: boolean) => refetch(),
    addRecord,
    updateRecord,
    deleteRecord,
  };
}
