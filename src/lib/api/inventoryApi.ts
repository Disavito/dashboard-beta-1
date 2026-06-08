import { supabase } from '../supabaseClient';

// ─── Tipos ─────────────────────────────────────────────────────
export interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  total_quantity: number;
  available_quantity: number;
  created_at: string;
}

export interface InventoryAssignment {
  id: string;
  item_id: string;
  colaborador_id: string;
  quantity: number;
  status: 'En Uso' | 'Devuelto';
  assigned_at: string;
  returned_at: string | null;
  notes: string | null;
  // Relaciones embebidas por Supabase
  inventory_items?: { id: string; name: string };
  colaboradores?: { id: string; name: string; apellidos: string };
}

// ─── Catálogo de Equipos ───────────────────────────────────────
export const fetchInventoryItems = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .is('deleted_at', null)
    .order('name');
  if (error) throw error;
  return data as InventoryItem[];
};

export const addInventoryItem = async (item: { name: string; description?: string; total_quantity: number }): Promise<InventoryItem> => {
  const { data, error } = await supabase
    .from('inventory_items')
    .insert([{ ...item, available_quantity: item.total_quantity }])
    .select()
    .single();
  if (error) throw error;
  return data as InventoryItem;
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> => {
  const { data, error } = await supabase
    .from('inventory_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as InventoryItem;
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('inventory_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
};

// ─── Asignaciones (Salidas / Devoluciones) ─────────────────────
export const fetchAssignments = async (): Promise<InventoryAssignment[]> => {
  const { data, error } = await supabase
    .from('inventory_assignments')
    .select(`*, inventory_items (id, name), colaboradores (id, name, apellidos)`)
    .order('assigned_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data || []) as InventoryAssignment[];
};

export const fetchActiveAssignments = async (): Promise<InventoryAssignment[]> => {
  const { data, error } = await supabase
    .from('inventory_assignments')
    .select(`*, inventory_items (id, name), colaboradores (id, name, apellidos)`)
    .eq('status', 'En Uso')
    .order('assigned_at', { ascending: false });
  if (error) throw error;
  return (data || []) as InventoryAssignment[];
};

export const fetchColaboradores = async () => {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, name, apellidos')
    .order('name');
  if (error) throw error;
  return (data || []).map(c => ({ id: c.id, name: `${c.name} ${c.apellidos}`.trim() }));
};

// Registrar salida: un ingeniero se lleva N unidades de un equipo
export const checkoutEquipment = async (items: Array<{ item_id: string; colaborador_id: string; quantity: number; notes?: string }>): Promise<void> => {
  if (!items || items.length === 0) return;
  
  const colaborador_id = items[0].colaborador_id;
  const notes = items[0].notes;

  const payload = {
    p_items: items.map(i => ({ item_id: i.item_id, cantidad: i.quantity })),
    p_colaborador_id: colaborador_id,
    p_observaciones: notes || null
  };

  const { error } = await supabase.rpc('checkout_equipment', payload);
  if (error) throw error;
};

// Registrar devolución de un equipo
export const returnEquipment = async (assignmentId: string, itemId: string, quantity: number): Promise<void> => {
  const { error } = await supabase
    .from('inventory_assignments')
    .update({ status: 'Devuelto', returned_at: new Date().toISOString() })
    .eq('id', assignmentId);
  if (error) throw error;

  // Incrementar stock disponible
  const { data: item } = await supabase.from('inventory_items').select('available_quantity').eq('id', itemId).single();
  if (item) {
    await supabase.from('inventory_items').update({
      available_quantity: item.available_quantity + quantity,
    }).eq('id', itemId);
  }
};

// Registrar devolución masiva de todos los equipos de un ingeniero
export const returnAllByColaborador = async (colaboradorId: string): Promise<number> => {
  const { data: activeAssignments, error } = await supabase
    .from('inventory_assignments')
    .select('id, item_id, quantity')
    .eq('colaborador_id', colaboradorId)
    .eq('status', 'En Uso');
  if (error) throw error;
  if (!activeAssignments || activeAssignments.length === 0) return 0;

  for (const assignment of activeAssignments) {
    await returnEquipment(assignment.id, assignment.item_id, assignment.quantity);
  }
  return activeAssignments.length;
};
