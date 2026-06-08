import { get, update } from 'idb-keyval';
import { supabase } from './supabaseClient';
import { toast } from 'sonner';

export type SyncJobType = 'expense_approval' | 'direct_expense' | 'update_lote_medido' | 'bulk_update_lote_medido';

export interface SyncJob {
  id: string; // uuid generado offline
  type: SyncJobType;
  payload: any;
  file?: Blob; // Archivo comprobante adjunto offline
  fileName?: string;
  status: 'pending' | 'syncing' | 'error';
  errorMessage?: string;
  created_at: string;
}

const SYNC_QUEUE_KEY = 'fimagadi-sync-queue';

export const offlineSync = {
  async getQueue(): Promise<SyncJob[]> {
    const queue = await get<SyncJob[]>(SYNC_QUEUE_KEY);
    return queue || [];
  },

  async addJob(job: Omit<SyncJob, 'status' | 'created_at'>): Promise<void> {
    const newJob: SyncJob = {
      ...job,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    
    await update<SyncJob[]>(SYNC_QUEUE_KEY, (queue) => {
      const q = queue || [];
      return [...q, newJob];
    });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sync-queue-updated'));
    }
  },

  async updateJobStatus(id: string, status: SyncJob['status'], errorMessage?: string): Promise<void> {
    await update<SyncJob[]>(SYNC_QUEUE_KEY, (queue) => {
      if (!queue) return [];
      return queue.map(job => 
        job.id === id ? { ...job, status, errorMessage } : job
      );
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sync-queue-updated'));
    }
  },

  async removeJob(id: string): Promise<void> {
    await update<SyncJob[]>(SYNC_QUEUE_KEY, (queue) => {
      if (!queue) return [];
      return queue.filter(job => job.id !== id);
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sync-queue-updated'));
    }
  },

  async processQueue(): Promise<void> {
    if (!navigator.onLine) return;

    const queue = await this.getQueue();
    const pendingJobs = queue.filter(j => j.status === 'pending' || j.status === 'error');

    if (pendingJobs.length === 0) return;

    let syncedCount = 0;

    for (const job of pendingJobs) {
      try {
        await this.updateJobStatus(job.id, 'syncing');

        let fileUrl = null;

        // 1. Si hay archivo, subirlo primero a Storage
        if (job.file && job.fileName) {
          const filePath = `receipts/${Date.now()}_${job.fileName}`;
          const { error: uploadError } = await supabase.storage
            .from('documentos') // Asegurarse de tener un bucket 'documentos' configurado o cambiarlo
            .upload(filePath, job.file);

          if (uploadError) throw uploadError;

          // Obtener URL pública
          const { data: publicUrlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(filePath);
            
          fileUrl = publicUrlData.publicUrl;
        }

        const finalPayload = { ...job.payload };
        if (fileUrl) {
          // Inyectar URL directamente en la descripción en lugar de receipt_url
          if (finalPayload.payload) { // expense_approval
             finalPayload.payload.description = `${finalPayload.payload.description || ''}\n\nComprobante: ${fileUrl}`;
          } else if (job.type === 'direct_expense') {
             finalPayload.description = `${finalPayload.description || ''}\n\nComprobante: ${fileUrl}`;
          }
        }

        if (job.type === 'expense_approval') {
          const { error } = await supabase.from('approval_requests').insert(finalPayload);
          if (error) throw error;
        } else if (job.type === 'direct_expense') {
          const { error } = await supabase.from('gastos').insert(finalPayload);
          if (error) throw error;
        } else if (job.type === 'update_lote_medido') {
          const { error } = await supabase.from('socio_titulares').update({ is_lote_medido: finalPayload.is_lote_medido }).eq('id', finalPayload.id);
          if (error) throw error;
        } else if (job.type === 'bulk_update_lote_medido') {
          const { error } = await supabase.from('socio_titulares').update({ is_lote_medido: finalPayload.is_lote_medido }).in('id', finalPayload.ids);
          if (error) throw error;
        }

        // 3. Éxito: Eliminar de la cola
        await this.removeJob(job.id);
        syncedCount++;

      } catch (error: any) {
        console.error('Error sincronizando job offline:', error);
        await this.updateJobStatus(job.id, 'error', error.message);
        
        // Toast error notification
        let jobLabel = job.type === 'expense_approval' ? 'Solicitud de aprobación de gasto' :
                         job.type === 'direct_expense' ? 'Registro de Gasto' :
                         job.type === 'update_lote_medido' ? 'Actualización de lote' :
                         'Actualización masiva de lotes';
                         
        if (job.payload?.socioName) {
          jobLabel += ` para ${job.payload.socioName}`;
        } else if (job.payload?.socioNames) {
           jobLabel += ` para varios socios`;
        }

        toast.error(`Fallo en sincronización offline: ${jobLabel}`, {
          description: error.message || 'Error desconocido al procesar la cola.',
          duration: 8000,
        });

        // Insertar notificación persistente en la BD
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          await supabase.from('notifications').insert({
            user_id: session.user.id,
            title: 'Fallo de Sincronización Offline',
            message: `El sistema no pudo actualizar: ${jobLabel}. Por favor, vuelve a intentarlo o revisa el caso.`,
            type: 'error',
            is_read: false,
            link: job.type.includes('lote_medido') ? '/partner-documents' : '/aprobaciones'
          });
        }
      }
    }

    if (syncedCount > 0) {
      toast.success(`Se sincronizaron ${syncedCount} registros que estaban pendientes sin conexión.`);
      // Emitir un evento global para que React Query o los componentes sepan que deben refrescar
      window.dispatchEvent(new Event('offline-sync-complete'));
    }
  }
};
