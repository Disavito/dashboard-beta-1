import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Colaborador, 
  getCurrentJornadasState, 
  clockIn, 
  startLunch, 
  endLunch, 
  clockOut 
} from '@/lib/api/jornadaApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Coffee, 
  LogOut, 
  Clock, 
  AlertCircle,
  Calendar as CalendarIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

interface ClockManagerProps {
  colaborador: Colaborador;
  targetDate?: Date;
  bypassTimeRestrictions?: boolean;
}

// Opciones contextuales según el tipo de acción y si es temprano o tarde
const JUSTIFICATION_OPTIONS_CLOCK_IN_EARLY = [
  "Inicio de actividades previas",
  "Reunión temprana programada",
  "Trabajo de campo anticipado",
  "Coordinación previa con equipo",
  "Traslado a zona lejana",
];

const JUSTIFICATION_OPTIONS_CLOCK_IN_LATE = [
  "Tardanza por tráfico",
  "Tardanza por motivo personal",
  "Cita médica previa",
  "Trámite personal urgente",
  "Problema de transporte",
  "Tardanza por condiciones climáticas",
  "Error del sistema",
];

const JUSTIFICATION_OPTIONS_CLOCK_OUT_EARLY = [
  "Cita médica programada",
  "Emergencia familiar",
  "Trámite personal autorizado",
  "Finalización anticipada de tareas",
  "Permiso administrativo autorizado",
  "Comisión de servicio fuera de oficina",
  "Malestar de salud",
];

const JUSTIFICATION_OPTIONS_CLOCK_OUT_LATE = [
  "Horas extras autorizadas",
  "Cierre de tareas pendientes",
  "Reunión extendida",
  "Atención a cliente/socio fuera de horario",
  "Trabajo de campo extendido",
  "Coordinación con equipo de cierre",
  "Error del sistema",
];

const ClockManager: React.FC<ClockManagerProps> = ({ 
  colaborador, 
  targetDate = new Date(),
  bypassTimeRestrictions = false 
}) => {
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showJustification, setShowJustification] = useState(false);
  const [pendingAction, setPendingAction] = useState<'clock-in' | 'clock-out' | null>(null);
  const [justification, setJustification] = useState<string>("");
  const [observations, setObservations] = useState('');
  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    const isToday = format(targetDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    if (!isToday && bypassTimeRestrictions) {
      setCurrentTime(targetDate);
      return;
    }
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [targetDate, bypassTimeRestrictions]);

  const { data: jornadasState, isLoading } = useQuery({
    queryKey: ['jornadaState', colaborador.id, format(targetDate, 'yyyy-MM-dd')],
    queryFn: () => getCurrentJornadasState(colaborador.id, targetDate),
  });

  const jornada = jornadasState?.activeJornada;
  const completedJornadasToday = jornadasState?.completedJornadasToday || [];

  const mutation = useMutation({
    mutationFn: async ({ action, just, obs }: { action: string, just?: string, obs?: string }) => {
      const dateToSend = bypassTimeRestrictions ? targetDate : undefined;
      
      // Validación de seguridad para acciones que requieren ID de jornada
      if (['start-lunch', 'end-lunch', 'clock-out'].includes(action) && !jornada) {
        throw new Error("No se encontró un registro de jornada activo.");
      }

      switch (action) {
        case 'clock-in': return await clockIn(colaborador.id, just, obs, dateToSend);
        case 'start-lunch': return await startLunch(jornada!.id, dateToSend);
        case 'end-lunch': return await endLunch(jornada!.id, dateToSend);
        case 'clock-out': return await clockOut(jornada!.id, just, obs, dateToSend);
        default: throw new Error("Acción no válida");
      }
    },
    onMutate: async ({ action }) => {
      const queryKey = ['jornadaState', colaborador.id, format(targetDate, 'yyyy-MM-dd')];
      await queryClient.cancelQueries({ queryKey });
      const previousState = queryClient.getQueryData(queryKey);
      
      const nowIso = (bypassTimeRestrictions ? targetDate : new Date()).toISOString();
      
      queryClient.setQueryData(queryKey, (old: any) => {
        const base = old || { activeJornada: null, completedJornadasToday: [] };
        const newState = { ...base };
        if (action === 'clock-in') {
          newState.activeJornada = { id: `temp-${Date.now()}`, hora_inicio_jornada: nowIso, fecha: format(targetDate, 'yyyy-MM-dd') };
        } else if (action === 'start-lunch' && newState.activeJornada) {
          newState.activeJornada = { ...newState.activeJornada, hora_inicio_almuerzo: nowIso };
        } else if (action === 'end-lunch' && newState.activeJornada) {
          newState.activeJornada = { ...newState.activeJornada, hora_fin_almuerzo: nowIso };
        } else if (action === 'clock-out' && newState.activeJornada) {
          newState.activeJornada = { ...newState.activeJornada, hora_fin_jornada: nowIso };
          newState.completedJornadasToday = [...(newState.completedJornadasToday || []), newState.activeJornada];
          newState.activeJornada = null;
        }
        return newState;
      });

      // Reset form instantly
      resetForm();

      return { previousState, queryKey };
    },
    onSuccess: (data, variables, context: any) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, (old: any) => {
          const base = old || { activeJornada: null, completedJornadasToday: [] };
          const newState = { ...base };
          
          if (variables.action === 'clock-in') {
            newState.activeJornada = data;
          } else if (variables.action === 'start-lunch' || variables.action === 'end-lunch') {
            newState.activeJornada = data;
          } else if (variables.action === 'clock-out') {
            newState.activeJornada = null;
            // Prevent duplicate completed jornada if optimistic UI already added it
            const prevCompleted = newState.completedJornadasToday.filter((j: any) => !j.id.toString().startsWith('temp-'));
            newState.completedJornadasToday = [...prevCompleted, data];
          }
          return newState;
        });
      }
      toast.success('Registro actualizado correctamente');
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(context.queryKey, context.previousState);
      }
      toast.error(error.message || 'Error al procesar la solicitud');
    },
    onSettled: () => {
      submittingRef.current = false;
      setIsLocalSubmitting(false);
      // Retrasar invalidación para evitar lectura de datos viejos en la DB (replica lag)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['jornadaState', colaborador.id] });
        queryClient.invalidateQueries({ queryKey: ['adminJornadas'] });
      }, 1500);
    }
  });

  const resetForm = () => {
    setShowJustification(false);
    setJustification('');
    setObservations('');
    setPendingAction(null);
  };

  const isOutsideWindow = (type: 'entry' | 'exit'): boolean => {
    if (bypassTimeRestrictions) return false;

    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    if (type === 'entry') {
      const startLimit = 9 * 60 + 20; // 09:20
      const endLimit = 9 * 60 + 45;   // 09:45
      return totalMinutes < startLimit || totalMinutes > endLimit;
    } else {
      const startLimit = 18 * 60 + 20; // 18:20
      const endLimit = 18 * 60 + 40;   // 18:40
      return totalMinutes < startLimit || totalMinutes > endLimit;
    }
  };

  const executeMutation = (action: string, just?: string, obs?: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsLocalSubmitting(true);
    mutation.mutate({ action, just, obs });
  };

  const handleActionInitiate = (action: 'clock-in' | 'clock-out') => {
    if (submittingRef.current) return;
    let needsJustification = isOutsideWindow(action === 'clock-in' ? 'entry' : 'exit');
    
    // Forzar justificación si es un turno adicional
    if (action === 'clock-in' && !jornada && completedJornadasToday.length > 0) {
      needsJustification = true;
    }

    if (needsJustification && !bypassTimeRestrictions) {
      setPendingAction(action);
      setJustification(''); // Reset al cambiar de acción
      setShowJustification(true);
    } else {
      executeMutation(action);
    }
  };

  // Determinar las opciones de justificación según el contexto
  const getContextualJustifications = (): { options: string[]; title: string; description: string } => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    if (pendingAction === 'clock-in') {
      const isSecondShift = !jornada && completedJornadasToday.length > 0;
      if (isSecondShift) {
        return {
          options: ["Reingreso por turno de tarde", "Horas extras solicitadas", "Regreso a planta", "Reemplazo de compañero", "Otro"],
          title: 'Turno Adicional',
          description: 'Estás iniciando un nuevo turno en el mismo día. Por favor justifica el motivo.',
        };
      }

      const entryStart = 9 * 60 + 20; // 09:20
      if (totalMinutes < entryStart) {
        return {
          options: JUSTIFICATION_OPTIONS_CLOCK_IN_EARLY,
          title: 'Entrada anticipada',
          description: 'Estás registrando tu entrada antes de la ventana horaria (09:20).',
        };
      } else {
        return {
          options: JUSTIFICATION_OPTIONS_CLOCK_IN_LATE,
          title: 'Entrada tardía',
          description: 'Estás registrando tu entrada después de la ventana horaria (09:45).',
        };
      }
    } else {
      const exitStart = 18 * 60 + 20; // 18:20
      if (totalMinutes < exitStart) {
        return {
          options: JUSTIFICATION_OPTIONS_CLOCK_OUT_EARLY,
          title: 'Salida anticipada',
          description: 'Estás finalizando tu jornada antes de la ventana de salida (18:20).',
        };
      } else {
        return {
          options: JUSTIFICATION_OPTIONS_CLOCK_OUT_LATE,
          title: 'Salida tardía',
          description: 'Estás finalizando tu jornada después de la ventana de salida (18:40).',
        };
      }
    }
  };

  const contextualJustification = showJustification ? getContextualJustifications() : null;

  const hasStarted = !!jornada?.hora_inicio_jornada;
  const hasStartedLunch = !!jornada?.hora_inicio_almuerzo;
  const hasEndedLunch = !!jornada?.hora_fin_almuerzo;
  const hasEnded = !!jornada?.hora_fin_jornada;

  if (isLoading) return <div className="p-8 text-center font-medium text-muted-foreground">Sincronizando...</div>;

  return (
    <div className={cn(
      "max-w-md mx-auto bg-card dark:bg-slate-900 rounded-2xl shadow-premium overflow-hidden border",
      bypassTimeRestrictions ? "border-amber-200 ring-4 ring-amber-50" : "border-border/50"
    )}>
      <div className={cn("p-8 pb-12 relative", bypassTimeRestrictions ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-primary text-primary-foreground")}>
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{colaborador.name} {colaborador.apellidos}</h2>
              <p className="opacity-80 text-sm mt-1 capitalize flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(targetDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>
            {bypassTimeRestrictions && <Badge className="bg-card dark:bg-slate-900/20 border-none">MODO ADMIN</Badge>}
          </div>

          <div className="mt-6">
            {hasStarted ? (
              <div className="space-y-2">
                <Badge className="bg-emerald-400 text-emerald-950 border-none px-4 py-1 rounded-full flex items-center gap-2 w-fit font-bold">
                  <span className="w-2 h-2 bg-emerald-900 rounded-full animate-pulse" /> EN ACTIVIDAD
                </Badge>
                {jornada?.fecha !== format(targetDate, 'yyyy-MM-dd') && (
                  <div className="bg-red-50 dark:bg-red-500/10 dark:text-red-4000/20 border border-red-400/50 text-white text-xs px-3 py-2 rounded-lg mt-2 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-200" />
                    <p>Tienes un turno pendiente por finalizar de un <b>día anterior ({jornada?.fecha})</b>. Por favor, finaliza esa jornada antes de continuar.</p>
                  </div>
                )}
              </div>
            ) : completedJornadasToday.length > 0 ? (
              <Badge className="bg-card dark:bg-slate-900/20 text-inherit border-none px-4 py-1 rounded-full flex items-center gap-2 w-fit font-bold">
                <span className="w-2 h-2 bg-card dark:bg-slate-900 rounded-full" /> {completedJornadasToday.length} TURNO(S) COMPLETADO(S) HOY
              </Badge>
            ) : (
              <Badge className="bg-card dark:bg-slate-900/10 opacity-80 border-none px-4 py-1 rounded-full text-inherit">ESPERANDO INICIO</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 -mt-6 relative z-20">
        <div className="bg-card dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-border/50 flex flex-col items-center mb-4">
          <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest mb-1">Hora actual del registro</p>
          <p className="text-4xl font-mono font-black text-foreground/90">
            {format(currentTime, 'HH:mm:ss')}
          </p>
        </div>

        <div className="bg-muted/50 rounded-2xl p-4 grid grid-cols-2 gap-4 border border-border/50">
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-muted-foreground/70 uppercase">Entrada</p>
            <p className="text-lg font-mono font-bold text-foreground/80">
              {jornada?.hora_inicio_jornada ? format(parseISO(jornada.hora_inicio_jornada), 'HH:mm:ss') : '--:--:--'}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[9px] font-bold text-muted-foreground/70 uppercase">Salida</p>
            <p className="text-lg font-mono font-bold text-foreground/80">
              {jornada?.hora_fin_jornada ? format(parseISO(jornada.hora_fin_jornada), 'HH:mm:ss') : '--:--:--'}
            </p>
          </div>
        </div>

        {showJustification && contextualJustification && (
          <div className="mt-6 p-6 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 rounded-3xl border border-amber-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2 text-amber-700 mb-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-bold text-sm">{contextualJustification.title}</span>
            </div>
            <p className="text-xs text-amber-600/80 mb-4">{contextualJustification.description}</p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-amber-800/60 uppercase">Motivo Obligatorio</Label>
                <Select value={justification} onValueChange={setJustification}>
                  <SelectTrigger className="w-full h-12 bg-card dark:bg-slate-900 border-amber-200 rounded-xl text-amber-900">
                    <SelectValue placeholder="Seleccione un motivo..." />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {contextualJustification.options.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-amber-800/60 uppercase">Observaciones</Label>
                <Textarea 
                  placeholder="Detalle el motivo..."
                  className="bg-card dark:bg-slate-900 border-amber-200 rounded-xl min-h-[80px] resize-none text-amber-900"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                />
              </div>

              <Button 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-12 font-bold"
                onClick={() => pendingAction && executeMutation(pendingAction, justification, observations)}
                disabled={!justification || isLocalSubmitting}
              >
                {isLocalSubmitting ? "Guardando..." : "Confirmar y Registrar"}
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full text-amber-700/50 text-xs"
                onClick={resetForm}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="py-8 space-y-3">
          {!hasStarted && !showJustification && (
            <Button
              size="lg"
              onClick={() => handleActionInitiate('clock-in')}
              disabled={isLocalSubmitting}
              className={cn(
                "w-full h-16 rounded-2xl text-lg font-bold shadow-premium transition-all active:scale-95",
                bypassTimeRestrictions ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100" : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              <Play className="mr-2 h-5 w-5 fill-current" /> {completedJornadasToday.length > 0 ? "Iniciar Turno Adicional" : "Iniciar Jornada"}
            </Button>
          )}

          {hasStarted && !hasEnded && !showJustification && (
            <>
              {!hasStartedLunch && (
                <Button
                  size="lg"
                  onClick={() => executeMutation('start-lunch')}
                  disabled={isLocalSubmitting}
                  className="w-full h-16 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-lg font-bold shadow-sm transition-all active:scale-95"
                >
                  <Coffee className="mr-2 h-5 w-5" /> Iniciar Almuerzo
                </Button>
              )}

              {hasStartedLunch && !hasEndedLunch && (
                <Button
                  size="lg"
                  onClick={() => executeMutation('end-lunch')}
                  disabled={isLocalSubmitting}
                  className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-lg font-bold shadow-sm transition-all active:scale-95"
                >
                  <Clock className="mr-2 h-5 w-5" /> Finalizar Almuerzo
                </Button>
              )}

              <Button
                size="lg"
                variant="destructive"
                onClick={() => handleActionInitiate('clock-out')}
                disabled={(hasStartedLunch && !hasEndedLunch) || isLocalSubmitting}
                className="w-full h-16 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-2xl text-lg font-bold shadow-sm transition-all active:scale-95"
              >
                <LogOut className="mr-2 h-5 w-5" /> Finalizar Jornada
              </Button>
            </>
          )}

          {completedJornadasToday.length > 0 && !showJustification && !hasStarted && (
            <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border/50 animate-in fade-in duration-500">
               <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Turnos Completados Hoy ({completedJornadasToday.length})</p>
               <div className="space-y-2">
                 {completedJornadasToday.map((j, i) => (
                   <div key={j.id} className="text-xs font-mono text-muted-foreground flex justify-between items-center bg-card dark:bg-slate-900 p-2 rounded-lg border border-border/50">
                      <span className="font-bold">Turno {completedJornadasToday.length - i}</span>
                      <span className="text-muted-foreground/70">
                        {j.hora_inicio_jornada ? format(parseISO(j.hora_inicio_jornada), 'HH:mm') : '--:--'} - {j.hora_fin_jornada ? format(parseISO(j.hora_fin_jornada), 'HH:mm') : '--:--'}
                      </span>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="bg-muted/50 rounded-2xl p-4 flex justify-between items-center border border-border/50">
          <div className="text-center">
            <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-tighter">Ventana Entrada</p>
            <p className="text-xs font-bold text-muted-foreground">09:20 - 09:45</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-tighter">Ventana Salida</p>
            <p className="text-xs font-bold text-muted-foreground">18:20 - 18:40</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClockManager;
