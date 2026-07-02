import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // Get an active jornada (where hora_fin_jornada is null)
  const { data: activeJornada, error: fetchErr } = await supabase
    .from('registros_jornada')
    .select('*')
    .is('hora_fin_jornada', null)
    .limit(1)
    .single();

  if (fetchErr || !activeJornada) {
    console.log("No active jornada found to test or error:", fetchErr);
    return;
  }

  console.log("Found active jornada:", activeJornada.id);

  // Try to clock out
  const { data, error } = await supabase.from('registros_jornada').update({ 
    hora_fin_jornada: new Date().toISOString(),
    justificacion_fin: null,
    observaciones_fin: null
  }).eq('id', activeJornada.id).select().single();

  if (error) {
    console.error("SUPABASE ERROR:", error);
  } else {
    console.log("SUCCESS:", data);
  }
}
test();
