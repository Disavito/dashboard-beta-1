import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const anonSupabase = createClient(process.env.SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE');

async function finalCheck() {
  console.log("========== VERIFICACIÓN FINAL ==========\n");

  // 1. Anon access test
  console.log("--- 1. ACCESO ANÓNIMO (sin login) ---");
  const tables = ['approval_requests', 'push_subscriptions', 'socio_titulares', 'socio_documentos', 'notifications', 'ingresos', 'gastos', 'colaboradores'];
  for (const t of tables) {
    const { data, error, count } = await anonSupabase.from(t).select('*', { count: 'exact' }).limit(1);
    const status = error ? '✅ BLOQUEADO' : (count > 0 ? `🔴 EXPUESTO (${count} registros)` : '✅ OK (0 rows)');
    console.log(`  ${t}: ${status}`);
  }

  // 2. Roles check
  console.log("\n--- 2. ROLES (case-sensitivity) ---");
  const { data: roles } = await supabase.from('roles').select('*');
  const badRoles = roles?.filter(r => r.role_name !== r.role_name.toLowerCase());
  console.log(badRoles?.length > 0 ? `  🔴 Roles con mayúsculas: ${JSON.stringify(badRoles)}` : '  ✅ Todos los roles en minúsculas');

  // 3. Storage buckets
  console.log("\n--- 3. STORAGE BUCKETS ---");
  const { data: buckets } = await supabase.storage.listBuckets();
  for (const b of (buckets || [])) {
    const sizeLimit = b.file_size_limit ? `${(b.file_size_limit / 1048576).toFixed(0)}MB` : '❌ Sin límite';
    console.log(`  ${b.name}: público=${b.public} | límite=${sizeLimit}`);
  }

  // 4. Orphaned data
  console.log("\n--- 4. INTEGRIDAD DE DATOS ---");
  const { data: gastos } = await supabase.from('gastos').select('id, colaborador_id').is('deleted_at', null);
  const { data: colabs } = await supabase.from('colaboradores').select('id');
  const colabIds = new Set(colabs?.map(c => c.id));
  const orphaned = gastos?.filter(g => g.colaborador_id && !colabIds.has(g.colaborador_id));
  console.log(`  Gastos huérfanos (FK rota): ${orphaned?.length || 0} ${orphaned?.length === 0 ? '✅' : '🔴'}`);

  // 5. Duplicate numero_gasto
  const { data: allGastos } = await supabase.from('gastos').select('numero_gasto').is('deleted_at', null);
  const numMap = {};
  allGastos?.forEach(g => { if (g.numero_gasto) numMap[g.numero_gasto] = (numMap[g.numero_gasto] || 0) + 1; });
  const dupes = Object.entries(numMap).filter(([_, c]) => c > 1);
  console.log(`  Numero_gasto duplicados: ${dupes.length === 0 ? '0 ✅' : dupes.map(d => d[0]).join(', ') + ' 🔴'}`);

  console.log("\n========== FIN VERIFICACIÓN ==========");
}
finalCheck().catch(console.error);
