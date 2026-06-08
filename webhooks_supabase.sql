-- ==========================================================
-- SCRIPT DE CONFIGURACIÓN DE WEBHOOKS EN SUPABASE
-- Ejecutar en el SQL Editor de tu panel de Supabase.
-- ==========================================================

-- 1. Habilitar la extensión de solicitudes HTTP (pg_net) si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Funciones de Base de Datos para bypass de RLS seguro en configuración
-- Estas funciones SECURITY DEFINER se ejecutan con los privilegios del creador (bypass RLS)
CREATE OR REPLACE FUNCTION public.get_configuracion_valor(p_clave text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valor jsonb;
BEGIN
  SELECT valor INTO v_valor FROM public.configuracion WHERE clave = p_clave;
  RETURN v_valor;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_configuracion(p_clave text, p_valor jsonb, p_descripcion text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.configuracion WHERE clave = p_clave) THEN
    UPDATE public.configuracion
    SET valor = p_valor, descripcion = COALESCE(p_descripcion, descripcion)
    WHERE clave = p_clave;
  ELSE
    INSERT INTO public.configuracion (clave, valor, descripcion)
    VALUES (p_clave, p_valor, p_descripcion);
  END IF;
END;
$$;

-- 3. Trigger para Ficha Técnica (socio_titulares)
CREATE OR REPLACE FUNCTION public.fn_generate_ficha_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://fimagadi-dashboard.mv7mvl.easypanel.host/api/webhook/generate-ficha',
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
      'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- Crear el trigger en socio_titulares
DROP TRIGGER IF EXISTS tr_generate_ficha ON public.socio_titulares;
CREATE TRIGGER tr_generate_ficha
AFTER INSERT OR UPDATE OR DELETE
ON public.socio_titulares
FOR EACH ROW
EXECUTE FUNCTION public.fn_generate_ficha_webhook();


-- 4. Trigger para Contratos (ingresos)
CREATE OR REPLACE FUNCTION public.fn_generate_contrato_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://fimagadi-dashboard.mv7mvl.easypanel.host/api/webhook/generate-contrato',
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
      'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- Crear el trigger en ingresos
DROP TRIGGER IF EXISTS tr_generate_contrato ON public.ingresos;
CREATE TRIGGER tr_generate_contrato
AFTER INSERT OR UPDATE OR DELETE
ON public.ingresos
FOR EACH ROW
EXECUTE FUNCTION public.fn_generate_contrato_webhook();
