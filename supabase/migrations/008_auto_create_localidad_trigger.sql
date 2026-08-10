-- Migración 008: Trigger automático para crear códigos de localidad cada vez que se agregue o modifique una asociación en socio_titulares

CREATE OR REPLACE FUNCTION public.fn_auto_ensure_localidad_codigo()
RETURNS TRIGGER AS $$
DECLARE
    clean_loc text;
    upper_loc text;
    loc_exists boolean;
    parts text[];
    zona_name text;
    loc_part text;
    cod_zona text;
    cod_com text;
    full_code text;
BEGIN
    IF NEW.localidad IS NULL OR trim(NEW.localidad) = '' THEN
        RETURN NEW;
    END IF;

    clean_loc := trim(NEW.localidad);
    upper_loc := upper(clean_loc);

    -- Verificar si ya existe en localidad_codigos (insensible a mayúsculas)
    SELECT EXISTS(
        SELECT 1 FROM public.localidad_codigos 
        WHERE lower(trim(nombre_localidad)) = lower(clean_loc)
    ) INTO loc_exists;

    IF NOT loc_exists THEN
        parts := string_to_array(upper_loc, '-');
        IF array_length(parts, 1) > 1 THEN
            zona_name := trim(parts[array_length(parts, 1)]);
        ELSE
            zona_name := 'GENERAL';
        END IF;

        loc_part := trim(parts[1]);
        cod_zona := substring(regexp_replace(zona_name, '[^A-Z]', '', 'g') || 'XXXX' from 1 for 4);
        cod_com := substring(regexp_replace(loc_part, '[^A-Z]', '', 'g') || 'XXXX' from 1 for 4);
        full_code := 'AR-' || cod_zona || '-' || cod_com;

        -- Resolver duplicados de codigo_completo
        IF EXISTS(SELECT 1 FROM public.localidad_codigos WHERE codigo_completo = full_code) THEN
            full_code := 'AR-' || cod_zona || '-' || substring(md5(random()::text) from 1 for 4);
        END IF;

        INSERT INTO public.localidad_codigos (
            nombre_region,
            codigo_region,
            nombre_zona,
            codigo_zona,
            nombre_localidad,
            codigo_comunidad,
            codigo_completo
        ) VALUES (
            'AREQUIPA',
            'AR',
            zona_name,
            cod_zona,
            clean_loc,
            cod_com,
            upper(full_code)
        )
        ON CONFLICT (nombre_localidad) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger en socio_titulares
DROP TRIGGER IF EXISTS trg_auto_ensure_localidad_codigo ON public.socio_titulares;

CREATE TRIGGER trg_auto_ensure_localidad_codigo
BEFORE INSERT OR UPDATE OF localidad ON public.socio_titulares
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_ensure_localidad_codigo();
