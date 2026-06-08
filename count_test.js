import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function run() {
  console.time('socio_titulares');
  const { data: s, error: e1 } = await supabase.from('socio_titulares').select('id', { count: 'exact' })
  console.timeEnd('socio_titulares');
  
  console.time('ingresos');
  const { data: i, error: e2 } = await supabase.from('ingresos').select('id', { count: 'exact' })
  console.timeEnd('ingresos');
}
run()
