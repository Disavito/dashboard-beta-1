import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function findBoleta(receiptNumber) {
  console.log(`Buscando a lo largo y ancho de todo el sistema la boleta: ${receiptNumber}...`);
  
  // 1. Buscamos primero en la tabla contable
  const { data: income, error: incomeError } = await supabase.from('ingresos').select('*').eq('receipt_number', receiptNumber);
  
  if (incomeError) {
      console.error("Error buscando en la BD:", incomeError);
  } else if (income && income.length > 0) {
      console.log(`[✔] ¡Registro contable oficial encontrado en la tabla 'ingresos'!`);
      console.log(`Cliente: ${income[0].full_name} | Monto: ${income[0].amount} | Fecha: ${income[0].date}`);
  } else {
      console.log(`[X] No se halló el registro en la tabla de 'ingresos'. Quizás es muy antiguo o no se indexó.`);
  }

  // 2. Buscando a ciegas en todo el Storage del Bucket
  console.log(`Iniciando rastreo profundo en el sistema de archivos (Storage)...`);
  const { data: rootItems, error } = await supabase.storage.from('comprobante-de-pago').list('', { limit: 1000 });
  
  if (error) {
     console.error("Error leyendo carpetas:", error);
     return;
  }
  
  for (const item of rootItems) {
    if (!item.name.startsWith('.')) {
      const { data: files } = await supabase.storage.from('comprobante-de-pago').list(item.name);
      if (files) {
         const specificFile = files.find(f => f.name.includes(receiptNumber));
         if (specificFile) {
            console.log(`[✔] ¡BINGO! PDF ORIGINAL encontrado en el bucket Storage:`);
            const { data: pubUrl } = supabase.storage.from('comprobante-de-pago').getPublicUrl(`${item.name}/${specificFile.name}`);
            console.log(`Ruta Carpeta del Socio: /${item.name}/${specificFile.name}`);
            console.log(`URL Pública: ${pubUrl.publicUrl}`);
            return;
         }
      }
    }
  }
  console.log(`[X] Búsqueda finalizada: No se encontró ningún PDF con el nombre ${receiptNumber} físicamente en el Storage.`);
}

findBoleta('B001-000187');
