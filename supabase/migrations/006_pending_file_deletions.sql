-- Migration 006: Pending File Deletions Queue & Trigger
-- Prevents orphaned storage files when socio_documentos rows are deleted or cascade-deleted

CREATE TABLE IF NOT EXISTS public.pending_file_deletions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    socio_id UUID,
    tipo_documento TEXT,
    link_documento TEXT NOT NULL,
    file_path TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- RLS policies for pending_file_deletions
ALTER TABLE public.pending_file_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to pending_file_deletions"
    ON public.pending_file_deletions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Trigger function BEFORE DELETE on socio_documentos
CREATE OR REPLACE FUNCTION public.fn_queue_file_deletion_before_doc_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_file_path TEXT;
BEGIN
    IF OLD.link_documento IS NOT NULL AND OLD.link_documento <> '' THEN
        -- Extract relative storage path if available
        v_file_path := NULL;
        IF OLD.link_documento LIKE '%/documentos/%' THEN
            v_file_path := substring(OLD.link_documento from '/documentos/(.*)$');
        END IF;

        INSERT INTO public.pending_file_deletions (
            socio_id,
            tipo_documento,
            link_documento,
            file_path,
            status
        ) VALUES (
            OLD.socio_id,
            OLD.tipo_documento,
            OLD.link_documento,
            v_file_path,
            'pending'
        );
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_queue_file_deletion ON public.socio_documentos;

CREATE TRIGGER trg_queue_file_deletion
    BEFORE DELETE ON public.socio_documentos
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_queue_file_deletion_before_doc_delete();
