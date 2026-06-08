-- =============================================================================
-- ÍNDICES DE RENDIMIENTO PARA EL DASHBOARD FIMAGADI
-- =============================================================================
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query → Pegar y Run
--
-- Estos índices aceleran las consultas más frecuentes del dashboard.
-- PostgreSQL ignorará un índice si ya existe, así que es seguro ejecutar
-- este script varias veces.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: socio_titulares
-- Usada en: People.tsx, PartnerDocuments.tsx, Dashboard.tsx, webhooks
-- Es la tabla más consultada del sistema.
-- ─────────────────────────────────────────────────────────────────────────────

-- Búsquedas por DNI (login del socio, buscar socio por DNI, generar contrato)
CREATE INDEX IF NOT EXISTS idx_socio_titulares_dni 
  ON socio_titulares (dni);

-- Filtro por distrito (filtro de localidad en PartnerDocuments y People)
CREATE INDEX IF NOT EXISTS idx_socio_titulares_distrito 
  ON socio_titulares ("distritoVivienda");

-- Filtro por localidad (filtro combinado distrito + localidad)
CREATE INDEX IF NOT EXISTS idx_socio_titulares_localidad 
  ON socio_titulares (localidad);

-- Filtro de lote medido (PartnerDocuments: "Solo Medidos" / "Solo Pendientes")
CREATE INDEX IF NOT EXISTS idx_socio_titulares_lote_medido 
  ON socio_titulares (is_lote_medido);

-- Ordenamiento más frecuente: apellido paterno ascendente
CREATE INDEX IF NOT EXISTS idx_socio_titulares_apellido 
  ON socio_titulares ("apellidoPaterno");

-- Índice compuesto para el filtro combinado más común en PartnerDocuments
CREATE INDEX IF NOT EXISTS idx_socio_titulares_distrito_localidad 
  ON socio_titulares ("distritoVivienda", localidad);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: socio_documentos
-- Usada en: PartnerDocuments.tsx, SocioStatusAndDocuments.tsx, webhooks
-- Se cruza con socio_titulares para el expediente digital.
-- ─────────────────────────────────────────────────────────────────────────────

-- Búsqueda por socio_id (relación 1:N con socio_titulares)
CREATE INDEX IF NOT EXISTS idx_socio_documentos_socio_id 
  ON socio_documentos (socio_id);

-- Filtro de soft-delete (se usa en casi todas las consultas)
CREATE INDEX IF NOT EXISTS idx_socio_documentos_deleted_at 
  ON socio_documentos (deleted_at);

-- Filtro por tipo de documento (Planos, Memoria, Ficha, Contrato)
CREATE INDEX IF NOT EXISTS idx_socio_documentos_tipo 
  ON socio_documentos (tipo_documento);

-- Índice compuesto para la consulta más común: documentos activos de un socio
CREATE INDEX IF NOT EXISTS idx_socio_documentos_socio_active 
  ON socio_documentos (socio_id, deleted_at);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: ingresos
-- Usada en: Income.tsx, Dashboard.tsx, Reportes.tsx, Accounts.tsx, invoicing
-- Consultas de rango por fecha y filtro de cuenta.
-- ─────────────────────────────────────────────────────────────────────────────

-- Búsqueda por DNI del socio (generar contrato, vincular pago con socio)
CREATE INDEX IF NOT EXISTS idx_ingresos_dni 
  ON ingresos (dni);

-- Ordenamiento y filtro por fecha (reportes, resumen diario)
CREATE INDEX IF NOT EXISTS idx_ingresos_date 
  ON ingresos (date);

-- Filtro por cuenta (Accounts.tsx)
CREATE INDEX IF NOT EXISTS idx_ingresos_account 
  ON ingresos (account);

-- Filtro de soft-delete
CREATE INDEX IF NOT EXISTS idx_ingresos_deleted_at 
  ON ingresos (deleted_at);

-- Búsqueda por número de recibo (facturación)
CREATE INDEX IF NOT EXISTS idx_ingresos_receipt_number 
  ON ingresos (receipt_number);

-- Filtro por tipo de transacción (Anulación, Devolución, etc.)
CREATE INDEX IF NOT EXISTS idx_ingresos_transaction_type 
  ON ingresos (transaction_type);

-- Índice compuesto para reportes por rango de fechas
CREATE INDEX IF NOT EXISTS idx_ingresos_date_deleted 
  ON ingresos (date, deleted_at);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: gastos
-- Usada en: Expenses.tsx, Reportes.tsx, Accounts.tsx, Presupuestos
-- ─────────────────────────────────────────────────────────────────────────────

-- Ordenamiento y filtro por fecha
CREATE INDEX IF NOT EXISTS idx_gastos_date 
  ON gastos (date);

-- Filtro por cuenta
CREATE INDEX IF NOT EXISTS idx_gastos_account 
  ON gastos (account);

-- Filtro por categoría
CREATE INDEX IF NOT EXISTS idx_gastos_category 
  ON gastos (category);

-- Filtro de soft-delete
CREATE INDEX IF NOT EXISTS idx_gastos_deleted_at 
  ON gastos (deleted_at);

-- Filtro por presupuesto
CREATE INDEX IF NOT EXISTS idx_gastos_presupuesto_id 
  ON gastos (presupuesto_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: approval_requests
-- Usada en: AprobacionesPage.tsx, Expenses.tsx
-- ─────────────────────────────────────────────────────────────────────────────

-- Filtro por estado (pending, approved, rejected)
CREATE INDEX IF NOT EXISTS idx_approval_requests_status 
  ON approval_requests (status);

-- Filtro por solicitante (mis solicitudes pendientes)
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by 
  ON approval_requests (requested_by);

-- Filtro por tipo de solicitud
CREATE INDEX IF NOT EXISTS idx_approval_requests_type 
  ON approval_requests (request_type);

-- Índice compuesto: solicitudes pendientes de un usuario específico
CREATE INDEX IF NOT EXISTS idx_approval_requests_user_status 
  ON approval_requests (requested_by, status);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: notifications
-- Usada en: useNotifications.ts (header del dashboard)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON notifications (user_id, is_read);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: colaboradores
-- Usada en: jornadaApi.ts, inventoryApi.ts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_colaboradores_user_id 
  ON colaboradores (user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: registros_jornada
-- Usada en: jornadaApi.ts (registro de asistencia)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_registros_jornada_colaborador_fecha 
  ON registros_jornada (colaborador_id, fecha);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: push_subscriptions
-- Usada en: server.js (envío de notificaciones push)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
  ON push_subscriptions (user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: inventory_items
-- Usada en: inventoryApi.ts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_inventory_items_status 
  ON inventory_items (status);

CREATE INDEX IF NOT EXISTS idx_inventory_items_deleted_at 
  ON inventory_items (deleted_at);


-- =============================================================================
-- ✅ SCRIPT COMPLETADO
-- Ejecuta "Run" en el SQL Editor de Supabase.
-- Los índices se crean de forma instantánea y no afectan los datos existentes.
-- Si algún índice ya existía, PostgreSQL simplemente lo ignora.
-- =============================================================================
