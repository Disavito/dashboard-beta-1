import { supabase } from '@/lib/supabaseClient';

export interface DeletionRequestInput {
    document_id: string;
    document_type: string;
    document_link: string;
    socio_id: string;
    requested_by: string;
}

export const createDeletionRequest = async (input: DeletionRequestInput) => {
    const { data, error } = await supabase
        .from('document_deletion_requests')
        .insert([
            {
                document_id: input.document_id,
                document_type: input.document_type,
                document_link: input.document_link,
                socio_id: input.socio_id,
                requested_by: input.requested_by,
                request_status: 'Pending'
            }
        ])
        .select();

    if (error) throw error;
    return data;
};

export const fetchDeletionRequests = async () => {
    const { data, error } = await supabase
        .from('document_deletion_requests')
        .select(`
            *,
            socio_details:socio_titulares(nombres, apellidoPaterno, dni)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

/**
 * PROCESO DE APROBACIÓN FINAL (Solo Admin)
 * Si se aprueba, se elimina el documento de la tabla principal.
 */
export const updateDeletionRequestStatus = async (
    requestId: string, 
    status: 'Approved' | 'Rejected',
    adminId: string,
    documentId?: string // ID del documento original a borrar
) => {
    // 1. Actualizar el estado de la solicitud
    const { error: updateError } = await supabase
        .from('document_deletion_requests')
        .update({
            request_status: status,
            approved_at: new Date().toISOString(),
            approved_by: adminId
        })
        .eq('id', requestId);

    if (updateError) throw updateError;

    // 2. Si es aprobado, ejecutar el borrado real del documento
    if (status === 'Approved' && documentId) {
        // Primero, obtener el link del documento para poder borrar del storage
        const { data: requestData } = await supabase
            .from('document_deletion_requests')
            .select('document_link')
            .eq('id', requestId)
            .single();

        // Borrar el registro de la base de datos
        const { error: deleteError } = await supabase
            .from('socio_documentos')
            .delete()
            .eq('id', documentId);
        
        if (deleteError) {
            console.error("Error al borrar documento de la base de datos:", deleteError);
        }

        // Borrar el archivo físico del storage
        if (requestData?.document_link) {
            try {
                const url = new URL(requestData.document_link);
                // URL format: .../storage/v1/object/public/{bucket}/{path}
                const storageMatch = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
                if (storageMatch) {
                    const bucketName = decodeURIComponent(storageMatch[1]);
                    const filePath = decodeURIComponent(storageMatch[2]);
                    const { error: storageError } = await supabase.storage
                        .from(bucketName)
                        .remove([filePath]);
                    if (storageError) {
                        console.error("Error al borrar archivo del storage:", storageError);
                    }
                }
            } catch (e) {
                console.error("Error al parsear URL del documento:", e);
            }
        }
    }
};
