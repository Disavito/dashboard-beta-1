-- ═══════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 1: Soft Deletes (deleted_at)
-- ═══════════════════════════════════════════════════════════════════════
-- Agrega columna deleted_at a las tablas principales para soportar
-- eliminación lógica en vez de física.
-- Ejecutar en: Supabase SQL Editor

-- Tabla ingresos
ALTER TABLE ingresos ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_ingresos_deleted_at ON ingresos(deleted_at) WHERE deleted_at IS NULL;

-- Tabla gastos
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_gastos_deleted_at ON gastos(deleted_at) WHERE deleted_at IS NULL;

-- Tabla inventory_items (solo si existe)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_items') THEN
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Tabla socio_documentos (solo si existe)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'socio_documentos') THEN
    ALTER TABLE socio_documentos ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 2: Audit Logs (Tabla + Trigger)
-- ═══════════════════════════════════════════════════════════════════════

-- Limpiar tabla de ejecución anterior fallida (si existe)
DROP TABLE IF EXISTS audit_logs CASCADE;

CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  user_id uuid,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);

-- Función genérica de auditoría
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers a tablas que EXISTEN en tu esquema
DROP TRIGGER IF EXISTS trg_audit_ingresos ON ingresos;
CREATE TRIGGER trg_audit_ingresos
  AFTER INSERT OR UPDATE OR DELETE ON ingresos
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_gastos ON gastos;
CREATE TRIGGER trg_audit_gastos
  AFTER INSERT OR UPDATE OR DELETE ON gastos
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_socios ON socio_titulares;
CREATE TRIGGER trg_audit_socios
  AFTER INSERT OR UPDATE OR DELETE ON socio_titulares
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_jornada ON registros_jornada;
CREATE TRIGGER trg_audit_jornada
  AFTER INSERT OR UPDATE OR DELETE ON registros_jornada
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- RLS: Solo admins pueden leer audit logs
-- Usa la estructura real: user_roles -> roles(role_name)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_admin_read ON audit_logs;
CREATE POLICY audit_logs_admin_read ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      INNER JOIN roles ON roles.id = user_roles.role_id
      WHERE user_roles.user_id = auth.uid()
      AND roles.role_name IN ('admin', 'finanzas_senior')
    )
  );

-- Permitir inserts del trigger (SECURITY DEFINER)
DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT
  WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 3: RPC Atómico para Checkout de Inventario
-- ═══════════════════════════════════════════════════════════════════════
-- Elimina la race condition al hacer checkout de equipos.
-- Solo se crea si la tabla inventory_items existe.

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_items') THEN

  CREATE OR REPLACE FUNCTION checkout_equipment(
    p_items jsonb,
    p_colaborador_id uuid,
    p_observaciones text DEFAULT NULL
  ) RETURNS void AS $fn$
  DECLARE
    v_item record;
    v_available int;
  BEGIN
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id uuid, cantidad int)
    LOOP
      -- Bloquear fila para evitar race condition
      SELECT available_quantity INTO v_available
      FROM inventory_items
      WHERE id = v_item.item_id
      FOR UPDATE;

      IF v_available IS NULL THEN
        RAISE EXCEPTION 'Item % no encontrado', v_item.item_id;
      END IF;

      IF v_available < v_item.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para item %. Disponible: %, Solicitado: %',
          v_item.item_id, v_available, v_item.cantidad;
      END IF;

      -- Decrementar stock
      UPDATE inventory_items
      SET available_quantity = available_quantity - v_item.cantidad
      WHERE id = v_item.item_id;

      -- Crear registro de asignación
      INSERT INTO inventory_assignments (
        item_id, 
        colaborador_id, 
        quantity, 
        status, 
        assigned_at,
        notes
      ) VALUES (
        v_item.item_id,
        p_colaborador_id,
        v_item.cantidad,
        'En Uso',
        now(),
        p_observaciones
      );
    END LOOP;
  END;
  $fn$ LANGUAGE plpgsql SECURITY DEFINER;

  GRANT EXECUTE ON FUNCTION checkout_equipment(jsonb, uuid, text) TO authenticated;

END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 4: Tabla de Configuración del Sistema
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS configuracion (
  id serial PRIMARY KEY,
  clave text UNIQUE NOT NULL,
  valor jsonb NOT NULL,
  descripcion text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- Valores por defecto
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('horario_entrada', '{"inicio": "09:20", "fin": "09:45"}', 'Ventana horaria para registro de entrada')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('horario_salida', '{"inicio": "18:20", "fin": "18:40"}', 'Ventana horaria para registro de salida')
ON CONFLICT (clave) DO NOTHING;

-- RLS
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer
DROP POLICY IF EXISTS config_read ON configuracion;
CREATE POLICY config_read ON configuracion
  FOR SELECT TO authenticated
  USING (true);

-- Solo admins pueden modificar (usa estructura real user_roles -> roles)
DROP POLICY IF EXISTS config_write ON configuracion;
CREATE POLICY config_write ON configuracion
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      INNER JOIN roles ON roles.id = user_roles.role_id
      WHERE user_roles.user_id = auth.uid()
      AND roles.role_name = 'admin'
    )
  );
