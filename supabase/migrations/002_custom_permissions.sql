-- ═══════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 5: Permisos Específicos para Colaboradores
-- ═══════════════════════════════════════════════════════════════════════

-- Agrega la columna custom_permissions a la tabla colaboradores
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT '{}'::jsonb;

-- NOTA: Opcionalmente podríamos crear índices para buscar por ciertos permisos, pero 
-- siendo una tabla de usuarios pequeña y usada en login, no es estrictamente necesario.
