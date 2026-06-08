import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useQuery, keepPreviousData, useMutation, useQueryClient } from '@tanstack/react-query';
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
    searchColumns
  } = options;
  const { user, roles } = useUser();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const [sort, setSort] = useState(initialSort);

  // Sync external filters changes
  useEffect(() => {
    setFilters(initialFilters);
  }, [JSON.stringify(initialFilters)]);

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
      // Fetch all records in parallel batches of 1000
      const BATCH_SIZE = 1000;
      
      // 1. Obtener el primer bloque y el total de registros en la misma petición
      const initialQuery = buildQuery().range(0, BATCH_SIZE - 1);
      const { data: firstBatch, error: firstError, count } = await initialQuery;

      if (firstError) throw firstError;

      allData = firstBatch as T[];
      if (count !== null) finalCount = count;

      // 2. Si hay más registros, disparar el resto de peticiones en paralelo
      if (count && count > BATCH_SIZE) {
        const remainingBatches = Math.ceil((count - BATCH_SIZE) / BATCH_SIZE);
        const promises = [];
        
        for (let i = 1; i <= remainingBatches; i++) {
          const from = i * BATCH_SIZE;
          const to = from + BATCH_SIZE - 1;
          promises.push(buildQuery().range(from, to));
        }

        const results = await Promise.all(promises);
        results.forEach(({ data, error }) => {
          if (error) throw error;
          if (data) {
            // Evitar recrear todo el array (O(N^2)), usar push para añadir los elementos (O(N))
            allData.push(...(data as T[]));
          }
        });
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


  // -------------------------------------------------------------
  // Mutaciones (Offline-First via React Query)
  // -------------------------------------------------------------

  const updateMutation = useMutation<any, Error, { tableName: string; id: string | number; record: Partial<T> }>({
    mutationKey: ['updateRecord'],
    onMutate: async ({ id, record }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<{ data: T[]; count: number }>(queryKey);
      
      queryClient.setQueryData<{ data: T[]; count: number }>(queryKey, (old) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.map((item: any) => item.id === id ? { ...item, ...record } : item),
        };
      });

      if (!navigator.onLine) {
        toast.info('Sin conexión: Cambio guardado localmente.', { description: 'Se sincronizará al recuperar la señal.' });
      }
      return { previousData };
    },
    onSuccess: () => {
      if (navigator.onLine) {
        toast.success(`${tableName} actualizado correctamente.`);
      }
    },
    onError: (err: any, _variables, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(`Error al actualizar ${tableName}`, { description: err.message });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 1500);
    }
  });

  const addMutation = useMutation<any, Error, { tableName: string; record: Partial<T> }>({
    mutationKey: ['addRecord'],
    onMutate: async ({ record }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<{ data: T[]; count: number }>(queryKey);
      
      queryClient.setQueryData<{ data: T[]; count: number }>(queryKey, (old) => {
        if (!old || !old.data) return old;
        const tempId = `temp-${Date.now()}`;
        return {
          ...old,
          data: [{ id: tempId, ...record } as any, ...old.data],
          count: old.count + 1
        };
      });

      if (!navigator.onLine) {
        toast.info('Sin conexión: Creación guardada localmente.', { description: 'Se sincronizará al recuperar la señal.' });
      }
      return { previousData };
    },
    onSuccess: () => {
      if (navigator.onLine) {
        toast.success(`${tableName} añadido correctamente.`);
      }
    },
    onError: (err: any, _variables, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(`Error al añadir ${tableName}`, { description: err.message });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 1500);
    }
  });

  const deleteMutation = useMutation<any, Error, { tableName: string; id: string | number; isSoftDelete: boolean }>({
    mutationKey: ['deleteRecord'],
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<{ data: T[]; count: number }>(queryKey);
      
      queryClient.setQueryData<{ data: T[]; count: number }>(queryKey, (old) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.filter((item: any) => item.id !== id),
          count: Math.max(0, old.count - 1)
        };
      });

      if (!navigator.onLine) {
        toast.info('Sin conexión: Eliminación encolada.', { description: 'Se sincronizará al recuperar la señal.' });
      }
      return { previousData };
    },
    onSuccess: () => {
      if (navigator.onLine) {
        toast.success(`${tableName} eliminado correctamente.`);
      }
    },
    onError: (err: any, _variables, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(`Error al eliminar ${tableName}`, { description: err.message });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 1500);
    }
  });

  const addRecord = useCallback(async (record: Partial<T>) => {
    try {
      const res = await addMutation.mutateAsync({ tableName, record });
      return res as T;
    } catch (e) {
      return null;
    }
  }, [tableName, addMutation]);

  const updateRecord = useCallback(async (id: string | number, record: Partial<T>) => {
    try {
      // Optimizamos localmente si es posible invalidando caché, pero main.tsx ya lo hace en onSuccess global.
      const res = await updateMutation.mutateAsync({ tableName, id, record });
      return res as T;
    } catch (e) {
      return null;
    }
  }, [tableName, updateMutation]);

  const deleteRecord = useCallback(async (id: string | number, extraPayload?: any) => {
    // Verificación de aprobación para admins
    const isRestrictedRole = roles?.some(r => {
      const lower = r.toLowerCase();
      return lower.includes('ingenier') || lower.includes('engin') || lower.includes('engen') || lower.includes('finanzas');
    });
    const isProtectedTable = ['ingresos', 'gastos'].includes(tableName);
    
    if (isRestrictedRole && isProtectedTable) {
      if (!user) {
        toast.error('No se pudo identificar al usuario para la solicitud.');
        return false;
      }
      
      const requestType = tableName === 'ingresos' ? 'delete_income' : 'delete_expense';
      const payload = { reason: extraPayload?.reason || 'Eliminación solicitada desde la interfaz', ...extraPayload };
      
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

    const tablesWithSoftDeletes = ['ingresos', 'gastos', 'inventory_items', 'socio_documentos'];
    const isSoftDelete = tablesWithSoftDeletes.includes(tableName);
    
    try {
      await deleteMutation.mutateAsync({ tableName, id, isSoftDelete });
      return true;
    } catch (e) {
      return false;
    }
  }, [tableName, deleteMutation, roles, user]);

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
