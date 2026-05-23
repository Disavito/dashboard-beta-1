import { supabase } from '../supabaseClient';

/**
 * Recalcula el monto rendido de un presupuesto sumando todos los gastos vinculados
 * y no eliminados, y actualiza el presupuesto en la base de datos.
 */
export async function updateMontoRendido(presupuestoId: string): Promise<number> {
  if (!presupuestoId) return 0;
  try {
    const { data: gastos, error } = await supabase
      .from('gastos')
      .select('amount')
      .eq('presupuesto_id', presupuestoId)
      .is('deleted_at', null);

    if (error) {
      console.error('Error al obtener gastos vinculados al presupuesto:', error);
      throw error;
    }

    const totalRendido = (gastos || []).reduce((sum, g) => sum + Math.abs(g.amount || 0), 0);

    const { error: updateError } = await supabase
      .from('presupuestos_operativos')
      .update({ monto_rendido: totalRendido })
      .eq('id', presupuestoId);

    if (updateError) {
      console.error('Error al actualizar monto_rendido del presupuesto:', updateError);
      throw updateError;
    }

    return totalRendido;
  } catch (err) {
    console.error('Error en updateMontoRendido:', err);
    return 0;
  }
}
