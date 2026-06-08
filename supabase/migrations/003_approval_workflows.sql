-- 1. Crear la tabla de solicitudes de aprobación (approval_requests)
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID NOT NULL, -- fk to auth.users (el que solicita)
  request_type VARCHAR(50) NOT NULL, -- 'delete_income', 'delete_expense', 'high_expense', 'edit_income'
  reference_id VARCHAR(255), -- ID del registro afectado (puede ser UUID o Integer)
  payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- Datos del cambio o motivo
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by UUID, -- fk to auth.users (quien aprueba o rechaza)
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para busquedas rapidas
CREATE INDEX IF NOT EXISTS idx_approval_req_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_req_created ON approval_requests(created_at DESC);

-- RLS Policies
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer sus propias solicitudes, los admins pueden leer todas.
-- Para simplificar el frontend donde validamos los roles del dashboard, permitiremos lecturas generales
DROP POLICY IF EXISTS approval_requests_read ON approval_requests;
CREATE POLICY approval_requests_read ON approval_requests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS approval_requests_insert ON approval_requests;
CREATE POLICY approval_requests_insert ON approval_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS approval_requests_update ON approval_requests;
CREATE POLICY approval_requests_update ON approval_requests
  FOR UPDATE USING (true);
