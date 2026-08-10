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

  // Auto-cerrar jornadas pendientes de días anteriores de forma transparente
  const staleActive = records.filter(r => r.fecha < today && !r.hora_fin_jornada);
  if (staleActive.length > 0) {
    for (const stale of staleActive) {
      const autoEndTime = `${stale.fecha}T18:30:00.000Z`;
      await supabase.from('registros_jornada').update({
        hora_fin_jornada: autoEndTime,
        justificacion_fin: 'Cierre automático por cambio de día',
        observaciones_fin: 'El sistema cerró el turno del día anterior automáticamente al abrir nuevo día'
      }).eq('id', stale.id);
    }
  }

  // Obviar jornadas de días anteriores: Buscar únicamente la jornada activa del DÍA ACTUAL
  const activeJornadaToday = records.find(r => r.fecha === today && !r.hora_fin_jornada);
  const completedJornadasToday = records.filter(r => r.fecha === today && !!r.hora_fin_jornada);

  return {
    activeJornada: activeJornadaToday || null,
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

  // Auto-cerrar jornadas inconclusas de días anteriores para dar paso al nuevo día sin bloqueos
  const { data: staleActive } = await supabase
    .from('registros_jornada')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .is('hora_fin_jornada', null);

  if (staleActive && staleActive.length > 0) {
    for (const stale of staleActive) {
      if (stale.fecha < todayStr) {
        const autoEndTime = `${stale.fecha}T18:30:00.000Z`;
        await supabase.from('registros_jornada').update({
          hora_fin_jornada: autoEndTime,
          justificacion_fin: 'Cierre automático por cambio de día',
          observaciones_fin: 'El sistema cerró la jornada anterior automáticamente al iniciar nuevo día'
        }).eq('id', stale.id);
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
      defaultJustification = 'Cierre automático por cambio de día';
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
