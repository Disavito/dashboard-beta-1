-- Script de Migración: Sistema de Archivo Físico

-- 1. Tabla: localidad_codigos
CREATE TABLE IF NOT EXISTS public.localidad_codigos (
    id SERIAL PRIMARY KEY,
    nombre_localidad TEXT NOT NULL,
    codigo_comunidad TEXT NOT NULL,
    codigo_region TEXT DEFAULT 'AR',
    codigo_zona TEXT DEFAULT 'CHIG',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insertar algunas localidades por defecto (ejemplo)
INSERT INTO public.localidad_codigos (nombre_localidad, codigo_comunidad)
VALUES 
    ('Los Rosales', 'LSRS'),
    ('Buena Vista', 'BNV'),
    ('Casa Huerta La Alameda', 'CHAL')
ON CONFLICT DO NOTHING;

-- 2. Tabla: contenedores_fisicos
CREATE TABLE IF NOT EXISTS public.contenedores_fisicos (
    id SERIAL PRIMARY KEY,
    codigo_contenedor TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabla: cajas_archivo (Caja Lógica)
CREATE TABLE IF NOT EXISTS public.cajas_archivo (
    id SERIAL PRIMARY KEY,
    codigo_etiqueta TEXT UNIQUE,
    localidad_id INTEGER REFERENCES public.localidad_codigos(id) ON DELETE RESTRICT,
    numero_caja INTEGER,
    anio INTEGER DEFAULT extract(year from current_date),
    contenedor_id INTEGER REFERENCES public.contenedores_fisicos(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Modificar tabla existente: socio_titulares
ALTER TABLE public.socio_titulares ADD COLUMN IF NOT EXISTS caja_id INTEGER REFERENCES public.cajas_archivo(id) ON DELETE SET NULL;

-- 5. Función para autogenerar la etiqueta de la caja lógica
CREATE OR REPLACE FUNCTION public.generar_etiqueta_caja()
RETURNS TRIGGER AS $$
DECLARE
    v_region TEXT;
    v_zona TEXT;
    v_comunidad TEXT;
    v_siguiente_num INTEGER;
    v_codigo_etiqueta TEXT;
BEGIN
    -- Si ya viene con etiqueta desde el Frontend, la respetamos
    IF NEW.codigo_etiqueta IS NOT NULL AND NEW.codigo_etiqueta != '' THEN
        RETURN NEW;
    END IF;

    -- Obtener códigos del diccionario de localidades
    SELECT codigo_region, codigo_zona, codigo_comunidad 
    INTO v_region, v_zona, v_comunidad
    FROM public.localidad_codigos 
    WHERE id = NEW.localidad_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Localidad no encontrada en localidad_codigos (ID: %)', NEW.localidad_id;
    END IF;

    -- Autogenerar numero_caja si no viene especificado
    IF NEW.numero_caja IS NULL THEN
        SELECT COALESCE(MAX(numero_caja), 0) + 1 INTO v_siguiente_num
        FROM public.cajas_archivo
        WHERE localidad_id = NEW.localidad_id AND anio = NEW.anio;
        
        NEW.numero_caja := v_siguiente_num;
    END IF;

    -- Armar la etiqueta: AR-CHIG-[COD_LOC]-[AÑO]-C[NUM] (con padding de 3 ceros)
    v_codigo_etiqueta := v_region || '-' || v_zona || '-' || v_comunidad || '-' || NEW.anio::text || '-C' || LPAD(NEW.numero_caja::text, 3, '0');
    
    NEW.codigo_etiqueta := v_codigo_etiqueta;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear el trigger para que se ejecute ANTES de cada INSERT
DROP TRIGGER IF EXISTS trg_generar_etiqueta_caja ON public.cajas_archivo;
CREATE TRIGGER trg_generar_etiqueta_caja
BEFORE INSERT ON public.cajas_archivo
FOR EACH ROW
EXECUTE FUNCTION public.generar_etiqueta_caja();
