-- 1. Eliminar la vista anterior para evitar el error de columnas (DROP) y luego recrearla
DROP VIEW IF EXISTS public.vw_socio_titulares_estado CASCADE;

CREATE VIEW public.vw_socio_titulares_estado AS
SELECT 
    s.*,
    
    -- LOGICA ACTUALIZADA DE STATUS
    COALESCE(
        (
            SELECT 
                CASE 
                    -- REGLA DE EXTREMA POBREZA: Si el monto es exactamente 0, SIEMPRE es Activo (sin importar otros campos)
                    WHEN i.amount = 0 THEN 'Activo'
                    -- Si es Devolucion, Anulacion o un monto negativo (reembolso), pasa a Retirado
                    WHEN i.transaction_type IN ('Devolucion', 'Anulacion', 'Retirado') OR i.amount < 0 THEN 'Retirado'
                    -- Si es un pago mayor a 0, se mantiene Activo
                    ELSE 'Activo'
                END
            FROM public.ingresos i
            WHERE i.dni = s.dni
            -- Ordenamos por fecha y fecha de creación para siempre obtener el ÚLTIMO movimiento exacto
            ORDER BY i.date DESC, i.created_at DESC
            LIMIT 1
        ),
        'Activo' -- Si recién se registra y no tiene NINGÚN recibo, es Activo
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
    
    -- DOCUMENTOS (Validación de existencia)
    EXISTS(SELECT 1 FROM public.socio_documentos d WHERE d.socio_id = s.id AND d.tipo_documento = 'Plano' AND d.deleted_at IS NULL) AS has_planos,
    EXISTS(SELECT 1 FROM public.socio_documentos d WHERE d.socio_id = s.id AND d.tipo_documento = 'Memoria Descriptiva' AND d.deleted_at IS NULL) AS has_memoria,
    EXISTS(SELECT 1 FROM public.socio_documentos d WHERE d.socio_id = s.id AND d.tipo_documento = 'Ficha' AND d.deleted_at IS NULL) AS has_ficha,
    EXISTS(SELECT 1 FROM public.socio_documentos d WHERE d.socio_id = s.id AND d.tipo_documento = 'Contrato' AND d.deleted_at IS NULL) AS has_contrato

FROM public.socio_titulares s;

-- 2. Actualizar la función de estadísticas globales del Dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    total_inc numeric;
    total_exp numeric;
    active int;
BEGIN
    -- Sumar ingresos ignorando devoluciones y anulaciones
    SELECT COALESCE(SUM(amount), 0) INTO total_inc 
    FROM public.ingresos 
    WHERE transaction_type NOT IN ('Devolucion', 'Anulacion', 'Retirado');
    
    -- Sumar gastos
    SELECT COALESCE(SUM(amount), 0) INTO total_exp 
    FROM public.gastos;
    
    -- Contar activos basándonos directamente en la nueva lógica de la vista
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
