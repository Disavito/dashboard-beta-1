import { supabase } from '@/lib/supabaseClient';

/**
 * Garantiza que cualquier nombre de localidad/asociación tenga automáticamente
 * su registro y código correspondiente en la tabla `localidad_codigos`.
 */
export async function ensureLocalidadCodigo(rawName: string) {
  if (!rawName || !rawName.trim()) return;
  const cleanName = rawName.trim();
  const upper = cleanName.toUpperCase();

  try {
    // 1. Verificar si ya existe (insensible a mayúsculas)
    const { data: existing } = await supabase
      .from('localidad_codigos')
      .select('id')
      .ilike('nombre_localidad', cleanName)
      .maybeSingle();

    if (existing) return;

    // 2. Generar zona y código de comunidad
    const parts = upper.split('-');
    const zonaName = parts.length > 1 ? parts[parts.length - 1].trim() : 'GENERAL';
    const locPart = parts[0].trim();
    const codZona = (zonaName.replace(/[^A-Z]/g, '') + 'XXXX').slice(0, 4);
    let words = locPart.replace(/[^A-Z\s]/g, '').split(/\s+/).filter(Boolean);
    let codCom = words.length >= 4 
      ? words.map((w: string) => w[0]).join('').slice(0, 4) 
      : ((words[0] || 'XX').slice(0, 2) + (words[1] || 'XX').slice(0, 2)).slice(0, 4);

    let fullCode = `AR-${codZona}-${codCom}`;

    // 3. Garantizar código completo único
    const { data: codeCheck } = await supabase
      .from('localidad_codigos')
      .select('id')
      .eq('codigo_completo', fullCode)
      .maybeSingle();

    if (codeCheck) {
      const rand = Math.floor(100 + Math.random() * 900);
      fullCode = `AR-${codZona}-${codCom.slice(0, 2)}${rand.toString().slice(0, 2)}`;
    }

    // 4. Insertar la nueva asociación en localidad_codigos
    await supabase.from('localidad_codigos').insert({
      nombre_region: 'AREQUIPA',
      codigo_region: 'AR',
      nombre_zona: zonaName,
      codigo_zona: codZona,
      nombre_localidad: cleanName,
      codigo_comunidad: codCom,
      codigo_completo: fullCode
    });
  } catch (err) {
    console.warn('Could not auto-create localidad_codigo:', err);
  }
}
