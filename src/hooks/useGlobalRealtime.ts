import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useGlobalRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Escuchar cambios en la tabla 'documentos_eliminados'
    const docsChannel = supabase.channel('realtime:documentos_eliminados')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'documentos_eliminados' }, (payload) => {
        const { accion, nombre_documento } = payload.new;
        if (accion === 'pendiente') {
          toast.info(`Nueva solicitud de eliminación: ${nombre_documento}`, {
            description: 'Un usuario ha solicitado eliminar un documento.',
          });
        }
        queryClient.invalidateQueries({ queryKey: ['aprobaciones_pendientes'] });
        queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'documentos_eliminados' }, (payload) => {
        const { accion, nombre_documento } = payload.new;
        if (accion === 'aprobado') {
          toast.success(`Eliminación aprobada: ${nombre_documento}`);
        } else if (accion === 'rechazado') {
          toast.error(`Eliminación rechazada: ${nombre_documento}`);
        }
        queryClient.invalidateQueries({ queryKey: ['aprobaciones_pendientes'] });
        queryClient.invalidateQueries({ queryKey: ['partner_documents'] });
        queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      })
      .subscribe();

    // Escuchar cambios en 'aprobaciones' genéricas si existe
    const aprobacionesChannel = supabase.channel('realtime:aprobaciones')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aprobaciones' }, () => {
        queryClient.invalidateQueries({ queryKey: ['aprobaciones'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(docsChannel);
      supabase.removeChannel(aprobacionesChannel);
    };
  }, [queryClient]);
}
