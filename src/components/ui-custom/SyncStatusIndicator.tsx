import { useIsMutating } from '@tanstack/react-query';
import { CloudOff, CloudUpload, Loader2, RefreshCw, Trash2, Wifi, WifiOff, AlertTriangle, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { offlineSync, SyncJob } from '@/lib/offlineSync';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';

export default function SyncStatusIndicator() {
  const isMutating = useIsMutating();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineJobs, setOfflineJobs] = useState<SyncJob[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadOfflineJobs = async () => {
    const queue = await offlineSync.getQueue();
    setOfflineJobs(queue);
  };

  useEffect(() => {
    loadOfflineJobs();

    const handleOnline = () => {
      setIsOffline(false);
      offlineSync.processQueue();
    };
    const handleOffline = () => setIsOffline(true);
    const handleQueueUpdate = () => loadOfflineJobs();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-queue-updated', handleQueueUpdate);
    window.addEventListener('offline-sync-complete', handleQueueUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-queue-updated', handleQueueUpdate);
      window.removeEventListener('offline-sync-complete', handleQueueUpdate);
    };
  }, []);

  const pendingJobs = offlineJobs.filter(j => j.status === 'pending' || j.status === 'error' || j.status === 'syncing');
  const totalPendingCount = isMutating + pendingJobs.length;

  // Si no hay nada pendiente y estamos online, no mostramos nada
  if (totalPendingCount === 0 && !isOffline) return null;

  const handleRetryJob = async (jobId: string) => {
    try {
      await offlineSync.updateJobStatus(jobId, 'pending');
      toast.info('Reintentando sincronización de transacción offline...');
      offlineSync.processQueue();
    } catch (e: any) {
      toast.error('Error al reintentar: ' + e.message);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('¿Deseas descartar este registro de la cola fuera de línea? Se perderán estos datos.')) return;
    try {
      await offlineSync.removeJob(jobId);
      toast.success('Transacción eliminada de la cola offline.');
    } catch (e: any) {
      toast.error('Error al eliminar: ' + e.message);
    }
  };

  const handleSyncAll = async () => {
    if (isOffline) {
      toast.error('No puedes sincronizar mientras estás sin conexión.');
      return;
    }
    setIsProcessing(true);
    toast.info('Procesando cola de sincronización offline...');
    try {
      await offlineSync.processQueue();
    } finally {
      setIsProcessing(false);
    }
  };

  const getJobLabel = (type: string) => {
    switch (type) {
      case 'expense_approval': return 'Aprobación de Gasto';
      case 'direct_expense': return 'Registro de Gasto';
      case 'update_lote_medido': return 'Medición de Lote';
      case 'bulk_update_lote_medido': return 'Medición Masiva';
      default: return 'Transacción Offline';
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsDialogOpen(true)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md cursor-pointer select-none",
                isOffline 
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500" 
                  : "bg-primary/5 border-primary/10 text-primary"
              )}
            >
              {isOffline ? (
                <CloudOff className="h-4 w-4 text-amber-500 animate-pulse" />
              ) : (
                <CloudUpload className="h-4 w-4 text-corp-teal animate-bounce" />
              )}
              
              {totalPendingCount > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center font-bold">
                  {totalPendingCount}
                </Badge>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-800 border-slate-700 text-white font-medium rounded-xl">
            {isOffline 
              ? `Estás sin conexión. ${totalPendingCount > 0 ? `Tienes ${totalPendingCount} cambio(s) pendiente(s).` : 'Modo fuera de línea.'}`
              : `Sincronizando ${totalPendingCount} cambio(s) con la nube...`}
            <p className="text-[10px] text-slate-300 font-bold mt-1 text-center">Haz clic para gestionar cola offline</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Diálogo interactivo para ver y gestionar la cola offline */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[92vw] sm:w-full max-w-lg rounded-2xl p-6 border-none bg-card text-foreground shadow-premium max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-2xl font-black tracking-tight text-foreground uppercase">
              Estado de Sincronización
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              Revisa la conexión y gestiona las transacciones pendientes guardadas localmente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 my-4">
            {/* Estado de Red */}
            <div className={cn(
              "flex items-center justify-between p-4 rounded-xl border",
              isOffline ? "bg-amber-500/5 border-amber-500/20" : "bg-[#4892CC]/5 border-[#4892CC]/20"
            )}>
              <div className="flex items-center gap-3">
                {isOffline ? (
                  <WifiOff className="w-5 h-5 text-amber-500" />
                ) : (
                  <Wifi className="w-5 h-5 text-corp-teal animate-pulse" />
                )}
                <div>
                  <p className="text-sm font-bold text-foreground">Conectividad de Red</p>
                  <p className="text-xs text-muted-foreground font-medium">
                    {isOffline ? 'Modo sin conexión. Trabajando offline en local.' : 'Conexión a internet establecida y activa.'}
                  </p>
                </div>
              </div>
              <Badge className={cn("border-none text-[10px] uppercase font-bold", isOffline ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800")}>
                {isOffline ? 'Offline' : 'Online'}
              </Badge>
            </div>

            {/* Mutaciones React Query (En vuelo / pausadas) */}
            {isMutating > 0 && (
              <div className="flex items-center justify-between p-4 rounded-xl border bg-slate-50 border-slate-200 dark:bg-muted/40 dark:border-border">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Actualizaciones en caché</p>
                    <p className="text-xs text-muted-foreground font-medium">Cambios en tablas principales pendientes de sincronizar.</p>
                  </div>
                </div>
                <Badge className="bg-primary/15 text-primary border-none font-bold">{isMutating}</Badge>
              </div>
            )}

            {/* Cola Offline Personalizada */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Cola Offline de Gastos e Ingresos ({pendingJobs.length})
                </h3>
                {pendingJobs.length > 0 && !isOffline && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    disabled={isProcessing}
                    onClick={handleSyncAll}
                    className="h-8 rounded-lg text-xs font-bold gap-1 border-border"
                  >
                    <RefreshCw className={cn("w-3 h-3", isProcessing && "animate-spin")} />
                    Sincronizar Todo
                  </Button>
                )}
              </div>

              {pendingJobs.length === 0 ? (
                <div className="py-8 text-center bg-muted/30 border border-dashed border-border rounded-xl">
                  <CloudUpload className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-medium">No hay gastos ni ingresos pendientes en la cola fuera de línea.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {pendingJobs.map(job => {
                    const hasError = job.status === 'error';
                    const amount = job.payload?.amount || job.payload?.payload?.amount || 0;
                    const desc = job.payload?.description || job.payload?.payload?.description || 'Sin descripción';
                    return (
                      <div 
                        key={job.id} 
                        className={cn(
                          "p-3 rounded-xl border space-y-2 relative group",
                          hasError ? "bg-red-500/5 border-red-200 dark:border-red-900/40" : "bg-card border-border"
                        )}
                      >
                        <div className="flex items-start justify-between gap-6">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {getJobLabel(job.type)}
                              </span>
                              <Badge className={cn(
                                "border-none text-[8px] uppercase font-bold py-0 h-4 px-1.5 flex items-center justify-center",
                                job.status === 'error' ? "bg-red-100 text-red-700" :
                                job.status === 'syncing' ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-700"
                              )}>
                                {job.status === 'error' ? 'Error' : job.status === 'syncing' ? 'Cargando...' : 'Pendiente'}
                              </Badge>
                            </div>
                            <p className="text-xs font-bold text-foreground mt-1 line-clamp-1">{desc}</p>
                            {amount !== 0 && (
                              <p className="text-xs font-black text-primary mt-0.5">
                                {formatCurrency(amount)}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            {hasError && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRetryJob(job.id)}
                                className="h-7 w-7 text-corp-teal hover:bg-corp-teal/10 hover:text-corp-dark rounded-lg"
                                title="Reintentar"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteJob(job.id)}
                              className="h-7 w-7 text-red-400 hover:bg-red-500/10 hover:text-red-500 rounded-lg"
                              title="Descartar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Detalle de error si falló */}
                        {hasError && job.errorMessage && (
                          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] text-red-600 dark:text-red-400 font-medium">
                            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{job.errorMessage}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <Button 
              variant="outline"
              onClick={() => setIsDialogOpen(false)} 
              className="rounded-xl h-11 w-full"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
