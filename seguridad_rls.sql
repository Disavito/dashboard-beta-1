-- ==========================================================
-- SCRIPT DE SEGURIDAD RLS (ROW LEVEL SECURITY)
-- Ejecutar en el SQL Editor de tu panel de Supabase
-- ==========================================================

------------------------------------------------------------
-- 1. SEGURIDAD EN LA TABLA DE GASTOS (gastos)
------------------------------------------------------------

-- Habilitar RLS en gastos
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores por si acaso
DROP POLICY IF EXISTS "Ingenieros ven sus propios gastos y admin ve todo" ON public.gastos;
DROP POLICY IF EXISTS "Inserción de gastos autorizados" ON public.gastos;
DROP POLICY IF EXISTS "Solo admin y finanzas actualizan gastos" ON public.gastos;
DROP POLICY IF EXISTS "Permitir lectura general de gastos" ON public.gastos;

-- Política de Lectura (SELECT):
-- Un usuario común (ingeniero) solo puede leer los registros donde colaborador_id sea su propio ID de autenticación.
-- Los administradores y finanzas pueden leer todos los registros.
CREATE POLICY "Ingenieros ven sus propios gastos y admin ve todo" 
    ON public.gastos FOR SELECT 
    USING (
        auth.uid() = colaborador_id 
        OR EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.role_name IN ('admin', 'finanzas', 'finanzas_senior')
        )
    );

-- Política de Inserción (INSERT):
-- Los ingenieros solo pueden registrar gastos con su propio colaborador_id.
-- Los administradores o finanzas pueden insertar gastos para cualquier colaborador.
CREATE POLICY "Inserción de gastos autorizados"
    ON public.gastos FOR INSERT
    WITH CHECK (
        auth.uid() = colaborador_id
        OR EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.role_name IN ('admin', 'finanzas', 'finanzas_senior')
        )
    );

-- Política de Actualización (UPDATE):
-- Solo los administradores y personal de finanzas pueden editar gastos existentes.
CREATE POLICY "Solo admin y finanzas actualizan gastos"
    ON public.gastos FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.role_name IN ('admin', 'finanzas', 'finanzas_senior')
        )
    );


------------------------------------------------------------
-- 2. SEGURIDAD EN LA TABLA DE CONFIGURACIÓN (configuracion)
------------------------------------------------------------

-- Habilitar RLS en configuracion
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores
DROP POLICY IF EXISTS "Lectura publica de configuracion" ON public.configuracion;
DROP POLICY IF EXISTS "Solo admin modifica configuracion" ON public.configuracion;

-- Política de Lectura (SELECT):
-- Cualquier usuario autenticado puede leer los parámetros de configuración (por ejemplo, para cargar los horarios en el perfil).
CREATE POLICY "Lectura publica de configuracion"
    ON public.configuracion FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Política de Modificación (ALL):
-- Solo los usuarios con rol 'admin' pueden insertar, actualizar o eliminar configuraciones globales.
CREATE POLICY "Solo admin modifica configuracion"
    ON public.configuracion FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND r.role_name = 'admin'
        )
    );
