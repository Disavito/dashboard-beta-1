import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useGlobalRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Escuchar cambios en la tabla 'document_deletion_requests'
    const docsChannel = supabase.channel('realtime:document_deletion_requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'document_deletion_requests' }, (payload) => {
        const { request_status, document_type } = payload.new;
        if (request_status === 'Pending') {
          toast.info(`Nueva solicitud de eliminación: ${document_type}`, {
            description: 'Un usuario ha solicitado eliminar un documento.',
          });
        }
        queryClient.invalidateQueries({ queryKey: ['aprobaciones_pendientes'] });
        queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'document_deletion_requests' }, (payload) => {
        const { request_status, document_type } = payload.new;
        if (request_status === 'Approved') {
          toast.success(`Eliminación aprobada: ${document_type}`);
        } else if (request_status === 'Rejected') {
          toast.error(`Eliminación rechazada: ${document_type}`);
        }
        queryClient.invalidateQueries({ queryKey: ['aprobaciones_pendientes'] });
        queryClient.invalidateQueries({ queryKey: ['partner_documents'] });
        queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      })
      .subscribe();

    // Escuchar cambios en 'approval_requests' (solicitudes de gastos y eliminaciones)
    const approvalChannel = supabase.channel('realtime:approval_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['supabaseData', 'approval_requests'] });
      })
      .subscribe();

    // Escuchar INSERT en 'ingresos'
    const ingresosChannel = supabase.channel('realtime:ingresos_toasts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ingresos' }, () => {
        toast.info('Nuevo ingreso registrado', {
          description: 'Se actualizó la tabla de ingresos',
        });
        queryClient.invalidateQueries({ queryKey: ['supabaseData', 'ingresos'] });
      })
      .subscribe();

    // Escuchar INSERT en 'gastos'
    const gastosChannel = supabase.channel('realtime:gastos_toasts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gastos' }, () => {
        toast.info('Nuevo gasto registrado', {
          description: 'Se actualizó la tabla de gastos',
        });
        queryClient.invalidateQueries({ queryKey: ['supabaseData', 'gastos'] });
      })
      .subscribe();

    // Escuchar INSERT/UPDATE en 'presupuestos_operativos'
    const presupuestosChannel = supabase.channel('realtime:presupuestos_toasts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'presupuestos_operativos' }, () => {
        toast.info('Nueva solicitud de presupuesto', {
          description: 'Se registró un nuevo presupuesto operativo',
        });
        queryClient.invalidateQueries({ queryKey: ['supabaseData', 'presupuestos_operativos'] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'presupuestos_operativos' }, () => {
        toast.success('Presupuesto actualizado', {
          description: 'Se aprobó o actualizó un presupuesto operativo',
        });
        queryClient.invalidateQueries({ queryKey: ['supabaseData', 'presupuestos_operativos'] });
      })
      .subscribe();

    // Escuchar INSERT/UPDATE en 'socio_titulares'
    const sociosChannel = supabase.channel('realtime:socios_toasts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'socio_titulares' }, () => {
        toast.info('Nuevo socio registrado');
        queryClient.invalidateQueries({ queryKey: ['supabaseData', 'socio_titulares'] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'socio_titulares' }, () => {
        toast.info('Datos de socio actualizados');
        queryClient.invalidateQueries({ queryKey: ['supabaseData', 'socio_titulares'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(docsChannel);
      supabase.removeChannel(approvalChannel);
      supabase.removeChannel(ingresosChannel);
      supabase.removeChannel(gastosChannel);
      supabase.removeChannel(presupuestosChannel);
      supabase.removeChannel(sociosChannel);
    };
  }, [queryClient]);
}
