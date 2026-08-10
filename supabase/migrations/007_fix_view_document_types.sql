-- Migración 007: Corregir coincidencia de cadenas de 'tipo_documento' en la vista vw_socio_titulares_estado
-- 'Planos de ubicación' y 'Memoria descriptiva' no coincidían exactamente con 'Plano' o 'Memoria Descriptiva'

DROP VIEW IF EXISTS public.vw_socio_titulares_estado CASCADE;

CREATE VIEW public.vw_socio_titulares_estado AS
SELECT 
    s.*,
    
    -- LOGICA DE STATUS
    COALESCE(
        (
            SELECT 
                CASE 
                    WHEN i.amount = 0 THEN 'Activo'
                    WHEN i.transaction_type IN ('Devolucion', 'Anulacion', 'Retirado') OR i.amount < 0 THEN 'Retirado'
                    ELSE 'Activo'
                END
            FROM public.ingresos i
            WHERE i.dni = s.dni
            ORDER BY i.date DESC, i.created_at DESC
            LIMIT 1
        ),
        'Activo'
    ) AS status,
    
    -- ÚLTIMO RECIBO
    (
        SELECT i.receipt_number 
        FROM public.ingresos i 
        WHERE i.dni = s.dni 
        ORDER BY i.date DESC, i.created_at DESC 
        LIMIT 1
    ) AS "receiptNumber",
    
    -- FECHA ÚLTIMA TRANSACCIÓN
    (
        SELECT i.date 
        FROM public.ingresos i 
        WHERE i.dni = s.dni 
        ORDER BY i.date DESC, i.created_at DESC 
        LIMIT 1
    ) AS "lastTransactionDate",
    
    -- TIPO ÚLTIMA TRANSACCIÓN
    (
        SELECT i.transaction_type 
        FROM public.ingresos i 
        WHERE i.dni = s.dni 
        ORDER BY i.date DESC, i.created_at DESC 
        LIMIT 1
    ) AS "lastTransactionType",
    
    -- DOCUMENTOS (Validación flexible por ILIKE y link no nulo)
    EXISTS(
        SELECT 1 FROM public.socio_documentos d 
        WHERE d.socio_id = s.id 
          AND d.tipo_documento ILIKE '%plano%' 
          AND d.link_documento IS NOT NULL 
          AND d.link_documento != '' 
          AND d.deleted_at IS NULL
    ) AS has_planos,

    EXISTS(
        SELECT 1 FROM public.socio_documentos d 
        WHERE d.socio_id = s.id 
          AND d.tipo_documento ILIKE '%memoria%' 
          AND d.link_documento IS NOT NULL 
          AND d.link_documento != '' 
          AND d.deleted_at IS NULL
    ) AS has_memoria,

    EXISTS(
        SELECT 1 FROM public.socio_documentos d 
        WHERE d.socio_id = s.id 
          AND d.tipo_documento ILIKE '%ficha%' 
          AND d.link_documento IS NOT NULL 
          AND d.link_documento != '' 
          AND d.deleted_at IS NULL
    ) AS has_ficha,

    EXISTS(
        SELECT 1 FROM public.socio_documentos d 
        WHERE d.socio_id = s.id 
          AND d.tipo_documento ILIKE '%contrato%' 
          AND d.link_documento IS NOT NULL 
          AND d.link_documento != '' 
          AND d.deleted_at IS NULL
    ) AS has_contrato

FROM public.socio_titulares s;

-- Recrear la función de estadísticas globales del Dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    total_inc numeric;
    total_exp numeric;
    active int;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total_inc 
    FROM public.ingresos 
    WHERE transaction_type NOT IN ('Devolucion', 'Anulacion', 'Retirado');
    
    SELECT COALESCE(SUM(amount), 0) INTO total_exp 
    FROM public.gastos;
    
    SELECT count(*) INTO active 
    FROM public.vw_socio_titulares_estado 
    WHERE status = 'Activo';
    
    RETURN json_build_object(
        'total_income', total_inc,
        'total_expenses', total_exp,
        'net_balance', total_inc - total_exp,
        'active_socios', active
    );
END;
$$;
