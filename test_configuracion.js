import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const res = await fetch(`${supabaseUrl}/rest/v1/`, { headers: { apikey: supabaseKey }});
  const openapi = await res.json();
  console.log("Schema:", openapi.definitions.configuracion);
}
check();
