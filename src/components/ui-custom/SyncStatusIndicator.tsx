import { useIsMutating } from '@tanstack/react-query';
import { CloudOff, CloudUpload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';

export default function SyncStatusIndicator() {
  // Contar cuántas mutaciones están en cola (paused) o en vuelo (pending)
  const isMutating = useIsMutating();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Si no hay nada pendiente y estamos online, no mostramos nada
  if (isMutating === 0 && !isOffline) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-sm font-bold text-slate-600 transition-all cursor-default select-none">
            {isOffline ? (
              <CloudOff className="h-4 w-4 text-amber-500 animate-pulse" />
            ) : (
              <CloudUpload className="h-4 w-4 text-corp-teal animate-bounce" />
            )}
            
            {isMutating > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                {isMutating}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-800 border-slate-700 text-white font-medium rounded-xl">
          {isOffline 
            ? `Estás sin conexión. ${isMutating > 0 ? `Tienes ${isMutating} cambio(s) pendiente(s) de sincronizar.` : 'Modo fuera de línea.'}`
            : `Sincronizando ${isMutating} cambio(s) con la nube...`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
