-- Script para crear la tabla de Presupuestos Operativos (Corregido)

CREATE TABLE IF NOT EXISTS public.presupuestos_operativos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    colaborador_id UUID NOT NULL, 
    motivo TEXT NOT NULL,
    monto_solicitado NUMERIC(10, 2) NOT NULL,
    monto_aprobado NUMERIC(10, 2) DEFAULT 0,
    monto_rendido NUMERIC(10, 2) DEFAULT 0,
    estado TEXT DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Aprobado', 'Rechazado', 'Cerrado')),
    aprobado_por UUID,
    fecha_aprobacion TIMESTAMP WITH TIME ZONE,
    notas TEXT
);

-- RLS (Row Level Security)
ALTER TABLE public.presupuestos_operativos ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores si quedaron a medias
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios presupuestos" ON public.presupuestos_operativos;
DROP POLICY IF EXISTS "Los usuarios pueden crear presupuestos" ON public.presupuestos_operativos;
DROP POLICY IF EXISTS "Admin puede actualizar presupuestos" ON public.presupuestos_operativos;

-- Crear nuevas políticas con el formato correcto de roles
CREATE POLICY "Los usuarios pueden ver sus propios presupuestos"
    ON public.presupuestos_operativos FOR SELECT
    USING (
        auth.uid() = colaborador_id 
        OR EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND LOWER(r.role_name) IN ('admin', 'finanzas')
        )
    );

CREATE POLICY "Los usuarios pueden crear presupuestos"
    ON public.presupuestos_operativos FOR INSERT
    WITH CHECK (auth.uid() = colaborador_id);

CREATE POLICY "Admin puede actualizar presupuestos"
    ON public.presupuestos_operativos FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = auth.uid() AND LOWER(r.role_name) IN ('admin', 'finanzas')
        )
    );

-- Tabla para enlazar gastos a un presupuesto específico (Opcional)
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS presupuesto_id UUID REFERENCES public.presupuestos_operativos(id);
