import { get, set, update } from 'idb-keyval';
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
  },

  async updateJobStatus(id: string, status: SyncJob['status'], errorMessage?: string): Promise<void> {
    await update<SyncJob[]>(SYNC_QUEUE_KEY, (queue) => {
      if (!queue) return [];
      return queue.map(job => 
        job.id === id ? { ...job, status, errorMessage } : job
      );
    });
  },

  async removeJob(id: string): Promise<void> {
    await update<SyncJob[]>(SYNC_QUEUE_KEY, (queue) => {
      if (!queue) return [];
      return queue.filter(job => job.id !== id);
    });
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
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documentos') // Asegurarse de tener un bucket 'documentos' configurado o cambiarlo
            .upload(filePath, job.file);

          if (uploadError) throw uploadError;

          // Obtener URL pública
          const { data: publicUrlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(filePath);
            
          fileUrl = publicUrlData.publicUrl;
        }

        // 2. Ejecutar la acción según el tipo
        const finalPayload = { ...job.payload };
        if (fileUrl) {
          // Si era expense_approval, lo metemos en payload
          if (finalPayload.payload) {
             finalPayload.payload.receipt_url = fileUrl;
          } else {
             finalPayload.receipt_url = fileUrl;
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
      }
    }

    if (syncedCount > 0) {
      toast.success(`Se sincronizaron ${syncedCount} registros que estaban pendientes sin conexión.`);
      // Emitir un evento global para que React Query o los componentes sepan que deben refrescar
      window.dispatchEvent(new Event('offline-sync-complete'));
    }
  }
};
