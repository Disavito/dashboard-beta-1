import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://n8n-supabase.mv7mvl.easypanel.host';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRealtime() {
  console.log('🔄 Iniciando prueba de Supabase Realtime...');
  
  let subscriptionStatus = 'CONNECTING';

  // Suscribirse a la tabla "gastos"
  const channel = supabase
    .channel('realtime-gastos-test')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'gastos' },
      (payload) => {
        console.log('\n🟢 ¡EVENTO REALTIME RECIBIDO!');
        console.log('Tabla:', payload.table);
        console.log('Tipo de evento:', payload.eventType);
        console.log('Nuevos datos:', payload.new);
        
        console.log('\n✅ Prueba completada con éxito. Cerrando conexión...');
        process.exit(0);
      }
    )
    .subscribe((status) => {
      subscriptionStatus = status;
      console.log(`📡 Estado de conexión: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        console.log('\n📝 Insertando registro de prueba para disparar Realtime...');
        // Insertar un registro de prueba
        supabase.from('gastos').insert({
          amount: 1,
          account: 'CAJA CHICA',
          date: new Date().toISOString(),
          category: 'Otros',
          description: 'PRUEBA REALTIME AUTOMATICA',
        }).then(({ error }) => {
          if (error) {
            console.error('❌ Error al insertar:', error.message);
            process.exit(1);
          } else {
            console.log('⏳ Registro insertado. Esperando evento por WebSocket...');
            
            // Timeout de seguridad de 5 segundos
            setTimeout(async () => {
              console.log('❌ No se recibió evento WebSocket en 5 segundos.');
              // Limpiar registro
              await supabase.from('gastos').delete().eq('description', 'PRUEBA REALTIME AUTOMATICA');
              process.exit(1);
            }, 5000);
          }
        });
      }
    });
}

testRealtime();
