-- ═══════════════════════════════════════════════════════════════════════
-- RPC para obtener el siguiente número de gasto omitiendo RLS (SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_next_numero_gasto()
RETURNS text AS $$
DECLARE
  v_max_num int := 0;
  v_num_gasto text;
  v_num_part int;
  v_payload jsonb;
BEGIN
  -- 1. Buscar en la tabla de gastos
  FOR v_num_gasto IN 
    SELECT numero_gasto 
    FROM public.gastos 
    WHERE numero_gasto LIKE 'GA%'
  LOOP
    BEGIN
      v_num_part := substring(v_num_gasto from 3)::int;
      IF v_num_part > v_max_num THEN
        v_max_num := v_num_part;
      END IF;
    EXCEPTION WHEN others THEN
      -- Ignorar si la conversión a entero falla
    END;
  END LOOP;

  -- 2. Buscar en solicitudes de aprobación pendientes/rechazadas
  FOR v_payload IN 
    SELECT payload 
    FROM public.approval_requests 
    WHERE payload->>'numero_gasto' LIKE 'GA%'
  LOOP
    BEGIN
      v_num_part := substring(v_payload->>'numero_gasto' from 3)::int;
      IF v_num_part > v_max_num THEN
        v_max_num := v_num_part;
      END IF;
    EXCEPTION WHEN others THEN
      -- Ignorar si la conversión a entero falla
    END;
  END LOOP;

  RETURN 'GA' || lpad((v_max_num + 1)::text, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_next_numero_gasto() TO authenticated;
