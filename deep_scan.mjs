import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function scanDeep() {
  console.log("Iniciando escaneo maestro del bucket comprobante-de-pago...");
  const { data: rootItems, error } = await supabase.storage.from('comprobante-de-pago').list('', { limit: 100 });
  
  if (error) {
    console.error("Error al listar root:", error);
    return;
  }
  
  if (!rootItems || rootItems.length === 0) {
    console.log("El bucket está totalmente VACÍO.");
    return;
  }
  
  console.log(`Encontradas ${rootItems.length} carpetas/archivos en la raíz.`);
  
  let totalPdfs = 0;
  let paths = [];
  
  for (const item of rootItems) {
    if (!item.name.startsWith('.')) {
      const { data: files } = await supabase.storage.from('comprobante-de-pago').list(item.name);
      if (files) {
         for (const f of files) {
           if (f.name.endsWith('.pdf')) {
              paths.push(`/${item.name}/${f.name}`);
              totalPdfs++;
           } else if (!f.name.includes('.')) {
              // it's a subfolder
              const { data: subFiles } = await supabase.storage.from('comprobante-de-pago').list(`${item.name}/${f.name}`);
              if (subFiles) {
                 for (const sf of subFiles) {
                    if (sf.name.endsWith('.pdf')) {
                       paths.push(`/${item.name}/${f.name}/${sf.name}`);
                       totalPdfs++;
                    }
                 }
              }
           }
         }
      }
    }
  }
  
  console.log(`======================`);
  console.log(`Total de PDFs reales encontrados en las primeras 100 carpetas: ${totalPdfs}`);
  console.log("Rutas de muestra reales que hay en tu Supabase:");
  console.log(paths);
  
}
scanDeep();
