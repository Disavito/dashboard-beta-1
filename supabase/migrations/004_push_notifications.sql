-- 1. Tabla para almacenar las suscripciones Web Push de los usuarios
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- fk a auth.users
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_read ON push_subscriptions;
CREATE POLICY push_subscriptions_read ON push_subscriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS push_subscriptions_insert ON push_subscriptions;
CREATE POLICY push_subscriptions_insert ON push_subscriptions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS push_subscriptions_delete ON push_subscriptions;
CREATE POLICY push_subscriptions_delete ON push_subscriptions FOR DELETE USING (true);

-- 2. Habilitar pg_net (Usado para llamar a la API Node.js)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Función Trigger que invoca la API Node.js cuando llega una nueva notificación
CREATE OR REPLACE FUNCTION trg_notify_web_push()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT := 'https://fimagadi-dashboard.mv7mvl.easypanel.host/api/send-push'; 
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'user_id', NEW.user_id,
    'title', NEW.title,
    'message', NEW.message,
    'link', NEW.link,
    'webhook_secret', current_setting('app.settings.push_webhook_secret', true)
  );

  PERFORM net.http_post(
    url := edge_function_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear el Trigger principal en la tabla notificaciones
DROP TRIGGER IF EXISTS trigger_web_push ON notifications;
CREATE TRIGGER trigger_web_push
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_web_push();

-- 5. TRIGGERS AUTOMÁTICOS PARA WORKFLOWS DE APROBACIONES FINANCIERAS (Ingresos/Gastos)
CREATE OR REPLACE FUNCTION trg_notify_on_approval_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando se CREA una solicitud, alertar a los administradores
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      '00000000-0000-0000-0000-000000000000', -- Admins
      'Solicitud de Aprobación Pendiente',
      'El equipo ha solicitado una aprobación para: ' || NEW.request_type,
      'warning',
      '/aprobaciones'
    );
  
  -- Cuando se ACTUALIZA una solicitud (Aprobada/Rechazada), alertar al que lo solicitó!
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status != 'pending' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.requested_by, -- Notificar a quien lo solicitó (Ing. o Finanzas)
      'Respuesta a tu Solicitud',
      'Tu solicitud para ' || NEW.request_type || ' ha sido ' || (CASE WHEN NEW.status = 'approved' THEN 'Aprobada ✅' ELSE 'Rechazada ❌' END),
      (CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'error' END),
      '/aprobaciones'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_approval_request ON approval_requests;
CREATE TRIGGER trigger_approval_request
  AFTER INSERT OR UPDATE OF status ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_on_approval_request();

-- 6. TRIGGERS AUTOMÁTICOS PARA ELIMINACIÓN DE DOCUMENTOS (Ingenieros)
CREATE OR REPLACE FUNCTION trg_notify_on_document_deletion_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando el ingeniero solicita borrar un documento, alertar a los administradores
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      '00000000-0000-0000-0000-000000000000', -- Admins
      'Eliminación de Documento Pendiente',
      'Se solicita eliminar el documento: ' || NEW.document_type,
      'warning',
      '/partner-documents'
    );
  
  -- Cuando se aprueba o rechaza, avisar al ingeniero
  ELSIF TG_OP = 'UPDATE' AND OLD.request_status = 'Pending' AND NEW.request_status != 'Pending' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.requested_by::uuid, -- El UUID del ingeniero
      'Respuesta de Eliminación',
      'Tu solicitud para eliminar el documento ' || NEW.document_type || ' ha sido ' || (CASE WHEN NEW.request_status = 'Approved' THEN 'Aprobada ✅' ELSE 'Rechazada ❌' END),
      (CASE WHEN NEW.request_status = 'Approved' THEN 'success' ELSE 'error' END),
      '/partner-documents'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_document_deletion ON document_deletion_requests;
CREATE TRIGGER trigger_document_deletion
  AFTER INSERT OR UPDATE OF request_status ON document_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_on_document_deletion_request();

-- 7. Habilitar Tiempo Real (Realtime) para las tablas clave
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications, approval_requests, gastos, ingresos, presupuestos_operativos;