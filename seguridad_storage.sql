-- ==========================================================
-- SCRIPT DE SEGURIDAD PARA BUCKET DE ALMACENAMIENTO DE COMPROBANTES (receipts)
-- Ejecutar en el SQL Editor de tu panel de Supabase
-- ==========================================================

-- Asegurarse de que las políticas de RLS en storage.objects permitan a los usuarios autenticados
-- subir sus comprobantes de pago (recibos/boletas) dentro del bucket "documentos" 
-- en la carpeta específica "receipts/"

-- 1. Habilitar inserción (INSERT) para usuarios autenticados en receipts/
DROP POLICY IF EXISTS "Permitir subida de comprobantes a usuarios autenticados" ON storage.objects;
CREATE POLICY "Permitir subida de comprobantes a usuarios autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documentos' 
    AND (storage.foldername(name))[1] = 'receipts'
);

-- 2. Habilitar lectura (SELECT) para usuarios autenticados en receipts/
DROP POLICY IF EXISTS "Permitir lectura de comprobantes a usuarios autenticados" ON storage.objects;
CREATE POLICY "Permitir lectura de comprobantes a usuarios autenticados"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'documentos' 
    AND (storage.foldername(name))[1] = 'receipts'
);

-- 3. Habilitar actualización (UPDATE) para usuarios autenticados en receipts/
DROP POLICY IF EXISTS "Permitir actualización de comprobantes a usuarios autenticados" ON storage.objects;
CREATE POLICY "Permitir actualización de comprobantes a usuarios autenticados"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'documentos' 
    AND (storage.foldername(name))[1] = 'receipts'
)
WITH CHECK (
    bucket_id = 'documentos' 
    AND (storage.foldername(name))[1] = 'receipts'
);

-- 4. Habilitar eliminación (DELETE) para usuarios autenticados en receipts/
DROP POLICY IF EXISTS "Permitir eliminación de comprobantes a usuarios autenticados" ON storage.objects;
CREATE POLICY "Permitir eliminación de comprobantes a usuarios autenticados"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'documentos' 
    AND (storage.foldername(name))[1] = 'receipts'
);
