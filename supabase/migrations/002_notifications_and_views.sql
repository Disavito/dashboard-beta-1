-- 1. Crear la tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- FK to auth.users if applicable, or just generic user reference
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error', 'system', 'finance'
  is_read BOOLEAN NOT NULL DEFAULT false,
  link VARCHAR(255), -- optional link to click
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
DROP POLICY IF EXISTS notifications_read_own ON notifications;
CREATE POLICY notifications_read_own ON notifications
  FOR SELECT
  USING (true); -- In a real app, USING (auth.uid() = user_id) but we use generic for now if auth is not strictly tied

DROP POLICY IF EXISTS notifications_update_own ON notifications;
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS notifications_insert ON notifications;
CREATE POLICY notifications_insert ON notifications
  FOR INSERT
  WITH CHECK (true);

-- 2. View for Drill-down (Dashboard: Ingresos por Localidad)
DROP VIEW IF EXISTS vw_ingresos_localidad;
CREATE OR REPLACE VIEW vw_ingresos_localidad AS
SELECT 
    st.localidad,
    i.transaction_type,
    SUM(i.amount) as total_amount,
    COUNT(i.id) as total_transactions,
    DATE_TRUNC('month', i.date::timestamp) as mes
FROM ingresos i
JOIN socio_titulares st ON i.dni = st.dni
WHERE i.deleted_at IS NULL
GROUP BY st.localidad, i.transaction_type, DATE_TRUNC('month', i.date::timestamp);

-- Function to generate automatic notifications (Trigger Example)
CREATE OR REPLACE FUNCTION trg_notify_on_high_income()
RETURNS TRIGGER AS $$
BEGIN
  -- If a huge income is registered, notify the admins
  IF NEW.amount >= 5000 AND NEW.transaction_type = 'Ingreso' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      '00000000-0000-0000-0000-000000000000', -- Generic admin ID or specific
      'Ingreso Extraordinario Detectado',
      'Se ha registrado un ingreso de S/.' || NEW.amount || ' (Recibo: ' || NEW.receipt_number || ')',
      'finance',
      '/income'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_high_income_notification ON ingresos;
CREATE TRIGGER trigger_high_income_notification
  AFTER INSERT ON ingresos
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_on_high_income();
