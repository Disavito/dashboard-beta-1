import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function testOpenDocumentDirectly(socioId, receiptNumber) {
  console.log(`\nSimulando click para Socio: ${socioId} | Comprobante: ${receiptNumber}`);
  
  // 1. Buscar en la raíz del socio (Boletas)
  console.log(`Buscando en raíz: ${socioId}`);
  const { data: raizSocio, error: errorRaiz } = await supabase.storage.from('comprobante-de-pago').list(`${socioId}`);
  if (errorRaiz) console.error("Error buscando en raíz:", errorRaiz);
  
  if (raizSocio && raizSocio.length > 0) {
    const specificFile = raizSocio.find(f => f.name.includes(receiptNumber) && f.name.endsWith('.pdf'));
    if (specificFile) {
      const { data: pubUrl } = supabase.storage.from('comprobante-de-pago').getPublicUrl(`${socioId}/${specificFile.name}`);
      console.log(`[ÉXITO] Archivo encontrado en raíz! URL Pública: ${pubUrl.publicUrl}`);
      return true;
    }
    const genericBoleta = raizSocio.find(f => f.name.endsWith('.pdf') && (f.name.startsWith('B') || f.name.startsWith('R')));
    if (genericBoleta) {
      const { data: pubUrl } = supabase.storage.from('comprobante-de-pago').getPublicUrl(`${socioId}/${genericBoleta.name}`);
      console.log(`[ÉXITO] Boleta genérica encontrada en raíz! URL Pública: ${pubUrl.publicUrl}`);
      return true;
    }
  }

  // 2. Buscar en /recibo (Singular - Nuevos)
  console.log(`Buscando en: ${socioId}/recibo`);
  const { data: recibos } = await supabase.storage.from('comprobante-de-pago').list(`${socioId}/recibo`);
  if (recibos && recibos.length > 0) {
    const files = recibos.filter(f => f.name.endsWith('.pdf')).sort((a, b) => b.name.localeCompare(a.name));
    if (files.length > 0) {
      const { data: pubUrl } = supabase.storage.from('comprobante-de-pago').getPublicUrl(`${socioId}/recibo/${files[0].name}`);
      console.log(`[ÉXITO] Archivo encontrado en /recibo! URL Pública: ${pubUrl.publicUrl}`);
      return true;
    }
  }

  // 3. Buscar en /recibos (Plural - Antiguos)
  console.log(`Buscando en: ${socioId}/recibos`);
  const { data: recibosViejos } = await supabase.storage.from('comprobante-de-pago').list(`${socioId}/recibos`);
  if (recibosViejos && recibosViejos.length > 0) {
    const files = recibosViejos.filter(f => f.name.endsWith('.pdf')).sort((a, b) => b.name.localeCompare(a.name));
    if (files.length > 0) {
      const { data: pubUrl } = supabase.storage.from('comprobante-de-pago').getPublicUrl(`${socioId}/recibos/${files[0].name}`);
      console.log(`[ÉXITO] Archivo encontrado en /recibos! URL Pública: ${pubUrl.publicUrl}`);
      return true;
    }
  }
  
  // 4. Fallback base de datos
  console.log(`[ADVERTENCIA] No se encontró en Storage. El sistema pasaría a intentar Regenerarlo desde la base de datos 'ingresos'.`);
  return false;
}

async function runTests() {
  // Test 1: La boleta de la imagen de Pedro Sumire
  await testOpenDocumentDirectly('ee739af2-7c4f-4d47-999a-7f802dea753b', 'B001-000314');
  
  // Test 2: Un recibo plural antiguo que vimos en el radar (00544ad1-31de-450b-9b31-6b4830ad2959/recibos/R-00311.pdf)
  await testOpenDocumentDirectly('00544ad1-31de-450b-9b31-6b4830ad2959', 'R-00311');
  
  // Test 3: Un recibo singular nuevo que vimos en el radar (01209077-d5d9-477f-9148-ebc4bf5ddcd5/recibo/Recibo_R-00778_1774882593514.pdf)
  await testOpenDocumentDirectly('01209077-d5d9-477f-9148-ebc4bf5ddcd5', 'R-00778');
}

runTests();
