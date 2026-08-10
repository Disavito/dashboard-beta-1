import { supabase } from '../supabaseClient';
import { Tables, TablesInsert, TablesUpdate } from '../database.types';
import { format, parseISO, differenceInMinutes } from 'date-fns';

export type Jornada = Tables<'registros_jornada'>;
export type Colaborador = Tables<'colaboradores'>;

export const calculateWorkedMinutesForJornada = (jornada: Jornada): number => {
  if (!jornada.hora_inicio_jornada || !jornada.hora_fin_jornada) return 0;
  const inicio = parseISO(jornada.hora_inicio_jornada);
  const fin = parseISO(jornada.hora_fin_jornada);
  let totalMinutes = differenceInMinutes(fin, inicio);
  
  if (jornada.hora_inicio_almuerzo && jornada.hora_fin_almuerzo) {
    const inicioAlmuerzo = parseISO(jornada.hora_inicio_almuerzo);
    const finAlmuerzo = parseISO(jornada.hora_fin_almuerzo);
    totalMinutes -= Math.max(0, differenceInMinutes(finAlmuerzo, inicioAlmuerzo));
  }
  return Math.max(0, totalMinutes);
};

export const getColaboradorProfile = async (userId: string): Promise<Colaborador | null> => {
  const { data, error } = await supabase.from('colaboradores').select('*').eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const getAllColaboradores = async (): Promise<Colaborador[]> => {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const getJornadaByDate = async (colaboradorId: string, date: Date): Promise<Jornada[]> => {
  const fecha = format(date, 'yyyy-MM-dd');
  const { data, error } = await supabase.from('registros_jornada').select('*').eq('colaborador_id', colaboradorId).eq('fecha', fecha).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const getCurrentJornadasState = async (colaboradorId: string, targetDate: Date) => {
  const today = format(targetDate, 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('registros_jornada')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .or(`fecha.eq.${today},hora_fin_jornada.is.null`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const records = data || [];

  const activeJornadaToday = records.find(r => r.fecha === today && !r.hora_fin_jornada);
  const staleActiveJornada = records.find(r => r.fecha < today && !r.hora_fin_jornada);

  const activeJornada = activeJornadaToday || staleActiveJornada || null;
  const completedJornadasToday = records.filter(r => r.fecha === today && !!r.hora_fin_jornada);

  return {
    activeJornada,
    staleActiveJornada: staleActiveJornada || null,
    completedJornadasToday
  };
};

export const getAdminJornadas = async ({ 
  startDate, 
  endDate, 
  colaboradorId 
}: { 
  startDate: string, 
  endDate: string, 
  colaboradorId?: string 
}) => {
  let query = supabase
    .from('registros_jornada')
    .select(`
      *,
      colaboradores (*)
    `)
    .gte('fecha', startDate)
    .lte('fecha', endDate)
    .order('fecha', { ascending: false });

  if (colaboradorId && colaboradorId !== 'todos') {
    query = query.eq('colaborador_id', colaboradorId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createManualJornada = async (payload: TablesInsert<'registros_jornada'>) => {
  const { data, error } = await supabase
    .from('registros_jornada')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const clockIn = async (
  colaboradorId: string, 
  justificacion?: string, 
  observaciones?: string,
  customDate?: Date
): Promise<Jornada> => {
  const timestamp = customDate || new Date();
  const todayStr = format(timestamp, 'yyyy-MM-dd');
  const hours = timestamp.getHours();
  const minutes = timestamp.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Ventana normal de inicio de jornada: A partir de las 09:20 (560 min) hasta las 21:00 (1260 min)
  const isNormalWorkHours = totalMinutes >= (9 * 60 + 20) && totalMinutes < (21 * 60);

  // Buscar jornadas sin cerrar de días anteriores
  const { data: staleActive } = await supabase
    .from('registros_jornada')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .is('hora_fin_jornada', null);

  if (staleActive && staleActive.length > 0) {
    for (const stale of staleActive) {
      if (stale.fecha < todayStr) {
        if (isNormalWorkHours) {
          // RECIÉN cuando le da a "Iniciar Jornada" y dentro/pasando la ventana horaria (>= 09:20),
          // se auto-cierra la jornada anterior a las 18:30 de la fecha previa.
          const autoEndTime = `${stale.fecha}T18:30:00.000Z`;
          await supabase.from('registros_jornada').update({
            hora_fin_jornada: autoEndTime,
            justificacion_fin: 'Cierre automático por cambio de día',
            observaciones_fin: 'Cierre automático a las 18:30 al iniciar nueva jornada en horario habitual'
          }).eq('id', stale.id);
        } else {
          // Fuera de horario normal (ej. 10 de la noche), requiere cerrar explícitamente el turno anterior
          throw new Error(`Tienes una jornada inconclusa del día anterior (${stale.fecha}). Al intentar ingresar fuera de la ventana habitual (09:20 - 21:00), debes finalizar la jornada anterior manualmente.`);
        }
      } else {
        throw new Error("Ya tienes una jornada activa en curso el día de hoy.");
      }
    }
  }

  const newJornada: TablesInsert<'registros_jornada'> = {
    colaborador_id: colaboradorId,
    fecha: todayStr,
    hora_inicio_jornada: timestamp.toISOString(),
    justificacion_inicio: justificacion || null,
    observaciones_inicio: observaciones || null,
  };
  
  const { data, error } = await supabase.from('registros_jornada').insert(newJornada).select().single();
  if (error || !data) throw new Error(error?.message || "Error al iniciar jornada");
  return data;
};

export const clockOut = async (
  jornadaId: number | string, 
  justificacion?: string, 
  observaciones?: string,
  customDate?: Date
): Promise<Jornada> => {
  const timestamp = customDate || new Date();
  const todayStr = format(timestamp, 'yyyy-MM-dd');

  const { data: targetJornada } = await supabase
    .from('registros_jornada')
    .select('fecha, hora_inicio_jornada')
    .eq('id', jornadaId)
    .maybeSingle();

  let finalClockOutTime = timestamp.toISOString();
  let defaultJustification = justificacion || null;
  let defaultObs = observaciones || null;

  if (targetJornada && targetJornada.fecha < todayStr) {
    finalClockOutTime = `${targetJornada.fecha}T18:30:00.000Z`;
    if (!defaultJustification) {
      defaultJustification = 'Cierre de jornada olvidada de día anterior';
    }
    defaultObs = `${defaultObs || ''} (Cerrado el ${todayStr})`.trim();
  }

  const { data, error } = await supabase.from('registros_jornada').update({ 
    hora_fin_jornada: finalClockOutTime,
    justificacion_fin: defaultJustification,
    observaciones_fin: defaultObs
  }).eq('id', jornadaId).select().single();
  
  if (error || !data) throw new Error(error?.message || "Error al finalizar jornada");
  return data;
};

export const startLunch = async (jornadaId: number | string, customDate?: Date) => {
  const timestamp = customDate || new Date();
  const { data, error } = await supabase.from('registros_jornada').update({ 
    hora_inicio_almuerzo: timestamp.toISOString() 
  }).eq('id', jornadaId).select().single();
  if (error) throw error;
  return data;
};

export const endLunch = async (jornadaId: number | string, customDate?: Date) => {
  const timestamp = customDate || new Date();
  const { data, error } = await supabase.from('registros_jornada').update({ 
    hora_fin_almuerzo: timestamp.toISOString() 
  }).eq('id', jornadaId).select().single();
  if (error) throw error;
  return data;
};

export const adminUpdateJornada = async (
  jornadaId: number | string, 
  updates: Partial<TablesUpdate<'registros_jornada'>>
): Promise<Jornada> => {
  const { data, error } = await supabase
    .from('registros_jornada')
    .update(updates)
    .eq('id', jornadaId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};
