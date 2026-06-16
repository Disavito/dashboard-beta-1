import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createManualJornada, getJornadaByDate, adminUpdateJornada, Colaborador } from '@/lib/api/jornadaApi';
import { format, setHours, setMinutes, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ManualClockFormProps {
  colaborador: Colaborador;
  date: Date;
}

const ManualClockForm: React.FC<ManualClockFormProps> = ({ colaborador, date }) => {
  const queryClient = useQueryClient();
  const [times, setTimes] = useState({
    inicio: '08:00',
    inicioAlmuerzo: '13:00',
    finAlmuerzo: '14:00',
    fin: '17:00',
  });
  const [notes, setNotes] = useState('');

  const combineDateAndTime = (timeStr: string, isEndOrLunch: boolean = false) => {
    if (!timeStr) return null;
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      let newDate = new Date(date);
      newDate = setHours(newDate, hours);
      newDate = setMinutes(newDate, minutes);
      
      if (isEndOrLunch && times.inicio) {
        const [startH, startM] = times.inicio.split(':').map(Number);
        const startDate = setMinutes(setHours(new Date(date), startH), startM);
        if (newDate < startDate) {
          newDate = addDays(newDate, 1);
        }
      }
      return newDate.toISOString();
    } catch (e) {
      return null;
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const existing = await getJornadaByDate(colaborador.id, date);
      
      const payload = {
        colaborador_id: colaborador.id,
        fecha: format(date, 'yyyy-MM-dd'),
        hora_inicio_jornada: combineDateAndTime(times.inicio),
        hora_inicio_almuerzo: combineDateAndTime(times.inicioAlmuerzo, true),
        hora_fin_almuerzo: combineDateAndTime(times.finAlmuerzo, true),
        hora_fin_jornada: combineDateAndTime(times.fin, true),
        observaciones_inicio: notes || 'Registro manual administrativo',
      };

      if (existing && existing.length > 0) {
        return adminUpdateJornada(existing[0].id, payload);
      } else {
        return createManualJornada(payload);
      }
    },
    onMutate: async () => {
      // Optimistic UI for Jornada
      const queryKey = ['jornada', colaborador.id];
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      
      const payload = {
        colaborador_id: colaborador.id,
        fecha: format(date, 'yyyy-MM-dd'),
        hora_inicio_jornada: combineDateAndTime(times.inicio),
        hora_inicio_almuerzo: combineDateAndTime(times.inicioAlmuerzo, true),
        hora_fin_almuerzo: combineDateAndTime(times.finAlmuerzo, true),
        hora_fin_jornada: combineDateAndTime(times.fin, true),
        observaciones_inicio: notes || 'Registro manual administrativo',
        id: `temp-${Date.now()}`
      };

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return [payload];
        const existingIndex = old.findIndex((j: any) => j.fecha === payload.fecha);
        if (existingIndex >= 0) {
          const newArr = [...old];
          newArr[existingIndex] = { ...newArr[existingIndex], ...payload };
          return newArr;
        }
        return [...old, payload];
      });

      return { previousData, queryKey };
    },
    onSuccess: () => {
      toast.success('Registro guardado correctamente');
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      toast.error('Error al guardar: ' + error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adminJornadas'] });
      queryClient.invalidateQueries({ queryKey: ['jornada', colaborador.id] });
    }
  });

  return (
    <Card className="border border-border/50 shadow-premium bg-card dark:bg-slate-900 rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-gray-50 to-white border-b border-border/50 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#4892CC]/10 rounded-2xl flex items-center justify-center">
            <Clock className="text-[#4892CC] h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-black uppercase tracking-tight">Entrada Manual</CardTitle>
            <p className="text-sm text-muted-foreground/70 font-medium">
              {colaborador.name} - {format(date, 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-8 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Inicio Jornada</Label>
            <Input 
              type="time" 
              value={times.inicio} 
              onChange={(e) => setTimes({...times, inicio: e.target.value})}
              className="h-12 rounded-xl border-border/50 bg-muted/50 font-bold focus:ring-[#4892CC]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Fin Jornada</Label>
            <Input 
              type="time" 
              value={times.fin} 
              onChange={(e) => setTimes({...times, fin: e.target.value})}
              className="h-12 rounded-xl border-border/50 bg-muted/50 font-bold focus:ring-[#4892CC]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Inicio Almuerzo</Label>
            <Input 
              type="time" 
              value={times.inicioAlmuerzo} 
              onChange={(e) => setTimes({...times, inicioAlmuerzo: e.target.value})}
              className="h-12 rounded-xl border-border/50 bg-muted/50 font-bold focus:ring-[#4892CC]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Fin Almuerzo</Label>
            <Input 
              type="time" 
              value={times.finAlmuerzo} 
              onChange={(e) => setTimes({...times, finAlmuerzo: e.target.value})}
              className="h-12 rounded-xl border-border/50 bg-muted/50 font-bold focus:ring-[#4892CC]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Notas / Observaciones</Label>
          <Textarea 
            placeholder="Motivo del registro manual..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px] rounded-2xl border-border/50 bg-muted/50 font-medium resize-none focus:ring-[#4892CC]"
          />
        </div>

        <Button 
          onClick={() => mutation.mutate()} 
          disabled={mutation.isPending}
          className="w-full h-14 rounded-2xl bg-[#4892CC] hover:bg-[#3C8B93] text-white font-black uppercase tracking-widest shadow-lg shadow-[#4892CC]/20 transition-all active:scale-[0.98]"
        >
          {mutation.isPending ? 'Guardando...' : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Guardar Registro
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ManualClockForm;
