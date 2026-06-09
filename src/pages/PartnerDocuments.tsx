import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/ui-custom/DataTable';
import { 
  FileWarning, 
  CheckSquare, 
  Square, 
  CheckCircle2, 
  LayoutGrid,
  Ticket,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  AlertCircle,
  XCircle
} from 'lucide-react';
import LocalidadCombobox from '@/components/custom/LocalidadCombobox';
import DistritoCombobox from '@/components/custom/DistritoCombobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UploadDocumentModal, ManualDocumentType } from '@/components/custom/UploadDocumentModal';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';
import { useUser } from '@/context/UserContext';
import DocumentCardView from '@/components/ui-custom/DocumentCardView';
import DeletionRequestsTable from '@/components/documents/DeletionRequestsTable';
import { openDocumentDirectly } from '@/components/documents/KanbanBoard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import SearchInputWithDebounce from '@/components/custom/SearchInputWithDebounce';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { offlineSync } from '@/lib/offlineSync';
import { useSupabaseData } from '@/hooks/useSupabaseData';

// Interfaces

interface IngresoInfo {
  status: 'Pagado' | 'No Pagado';
  receipt_number: string | null;
}

interface SocioConDocumentos {
  id: string;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto?: string; // Hecho opcional para evitar errores de tipo con componentes externos
  localidad: string;
  mz: string | null;
  lote: string | null;
  is_lote_medido: boolean | null;
  paymentInfo: IngresoInfo;
  searchableContent?: string;
  has_planos?: boolean;
  has_memoria?: boolean;
  has_ficha?: boolean;
  has_contrato?: boolean;
  has_comprobante?: boolean;
}

type DocumentoRequerido = 'Planos de ubicación' | 'Memoria descriptiva';

const getBucketNameForDocumentType = (docType: string): string => {
  switch (docType) {
    case 'Planos de ubicación': return 'planos';
    case 'Memoria descriptiva': return 'memoria-descriptiva';
    default: return 'documentos';
  }
};

// Componente estable a nivel de módulo para evitar re-mount en cada render de la tabla.
// React.memo previene re-renders si las props no cambian.
interface LoteMedidoCellProps {
  socioId: string;
  initialValue: boolean;
  disabled: boolean;
  socio: SocioConDocumentos;
}

const LoteMedidoCell = React.memo(({ socioId, initialValue, disabled, socio }: LoteMedidoCellProps) => {
  const [checked, setChecked] = useState(initialValue);
  const mountedRef = useRef(true);
  const updateMutation = useMutation<any, Error, { tableName: string; id: string | number; record: any }>({ mutationKey: ['updateRecord'] });

  // Sincronizar si el valor externo cambia (ej. después de un fetchAllData)
  useEffect(() => {
    const checkOfflineState = async () => {
      const queue = await offlineSync.getQueue();
      const pendingJob = queue.find(j => j.type === 'update_lote_medido' && j.payload.id === socioId && j.status !== 'error');
      if (pendingJob) {
        setChecked(pendingJob.payload.is_lote_medido);
      } else {
        setChecked(initialValue);
      }
    };
    checkOfflineState();
  }, [initialValue, socioId]);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const handleChange = async (v: boolean) => {
    if (disabled) {
      toast.error('Acceso restringido');
      return;
    }

    const hasRequiredDocs = socio.has_planos || socio.has_memoria;
    if (!v && hasRequiredDocs) {
      toast.warning('Acción bloqueada', { description: 'No se puede desmarcar un lote con planos subidos.' });
      return;
    }

    // Cambio visual INSTANTÁNEO — sin tocar el estado padre
    setChecked(v);

    if (!navigator.onLine) {
      await offlineSync.addJob({
        id: crypto.randomUUID(),
        type: 'update_lote_medido',
        payload: { id: socioId, is_lote_medido: v, socioName: socio.nombreCompleto }
      });
      toast.success('Guardado offline. Se sincronizará al conectar.');
      return;
    }

    try {
      await updateMutation.mutateAsync({ tableName: 'socio_titulares', id: socioId, record: { is_lote_medido: v } });
      // El éxito global de react-query ya muestra el toast
    } catch {
      // Revertir solo esta celda si falla
      if (mountedRef.current) setChecked(!v);
      // El error global de react-query ya muestra el toast
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => handleChange(!!v)}
        disabled={disabled}
        className="w-5 h-5 rounded-md data-[state=checked]:bg-[#4892CC] data-[state=checked]:border-[#4892CC]"
      />
      <span className={cn(
        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full transition-colors",
        checked ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
      )}>
        {checked ? 'Medido' : 'Pendiente'}
      </span>
    </div>
  );
});

// --- Wrapper aislado para el UploadModal: su estado NO re-renderiza el padre ---
const UploadModalWrapper = React.memo(React.forwardRef<
  { open: (config: { socioId: string; socioName: string; documentType: DocumentoRequerido }) => void },
  { onSuccess: () => void }
>(({ onSuccess }, ref) => {
  const [state, setState] = useState<{
    isOpen: boolean;
    socioId: string | null;
    socioName: string;
    documentType: DocumentoRequerido | null;
  }>({ isOpen: false, socioId: null, socioName: '', documentType: null });

  React.useImperativeHandle(ref, () => ({
    open: (config) => setState({ isOpen: true, ...config }),
  }));

  if (!state.isOpen) return null;
  return (
    <UploadDocumentModal
      isOpen
      onOpenChange={(open) => { if (!open) setState({ isOpen: false, socioId: null, socioName: '', documentType: null }); }}
      socioId={state.socioId}
      socioName={state.socioName}
      documentType={state.documentType as ManualDocumentType}
      onUploadSuccess={() => { setState({ isOpen: false, socioId: null, socioName: '', documentType: null }); onSuccess(); }}
    />
  );
}));

// --- Wrapper aislado para ConfirmationDialog ---
const DeleteDialogWrapper = React.memo(React.forwardRef<
  { open: (config: { documentId: number; documentLink: string; documentType: string; socioName: string }) => void },
  { onConfirm: (docId: number, docLink: string, docType: string) => Promise<void> }
>(({ onConfirm }, ref) => {
  const [state, setState] = useState<{
    isOpen: boolean;
    documentId: number | null;
    documentLink: string | null;
    documentType: string | null;
    socioName: string | null;
  }>({ isOpen: false, documentId: null, documentLink: null, documentType: null, socioName: null });
  const [isDeleting, setIsDeleting] = useState(false);

  React.useImperativeHandle(ref, () => ({
    open: (config) => setState({ isOpen: true, ...config }),
  }));

  if (!state.isOpen) return null;
  return (
    <ConfirmationDialog
      isOpen
      onClose={() => setState({ isOpen: false, documentId: null, documentLink: null, documentType: null, socioName: null })}
      onConfirm={async () => {
        if (!state.documentId || !state.documentLink) return;
        setIsDeleting(true);
        await onConfirm(state.documentId, state.documentLink, state.documentType!);
        setIsDeleting(false);
        setState({ isOpen: false, documentId: null, documentLink: null, documentType: null, socioName: null });
      }}
      title="Eliminar Documento"
      description={`¿Estás seguro de eliminar "${state.documentType}"? Esta acción es permanente.`}
      confirmText="Eliminar permanentemente"
      variant="destructive"
      isConfirming={isDeleting}
    />
  );
}));

function PartnerDocuments() {
  const queryClient = useQueryClient();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedLocalidad, setSelectedLocalidad] = useState('all');
  const [selectedDistrito, setSelectedDistrito] = useState('all');
  const [loteMedidoFilter, setLoteMedidoFilter] = useState('all');
  const [cruceFilter, setCruceFilter] = useState('all');

  // Fetching con caché global (React Query) para evitar el delay de 10 segundos
  const { data: rawSocios, loading: sociosLoading, refreshData: refreshSocios } = useSupabaseData<any>({
    tableName: 'vw_socio_titulares_estado',
    initialSort: { column: 'apellidoPaterno', ascending: true },
    fetchAll: true,
  });

  // Fetch document existence on the fly in chunks to prevent URI Too Long errors
  const { data: docsExistData } = useQuery({
    queryKey: ['partnerDocs', rawSocios?.map(r => r.id)],
    enabled: !!rawSocios && rawSocios.length > 0,
    queryFn: async () => {
      const ids = rawSocios.map(r => r.id);
      const chunkSize = 30;
      const allData: any[] = [];
      
      // Batch queries in chunks of 30 to avoid strict URI length limits
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { data } = await supabase
          .from('socio_documentos')
          .select('socio_id, tipo_documento, link_documento')
          .in('socio_id', chunk)
          .is('deleted_at', null); // <-- FILTRO ANTI-FANTASMAS
        
        if (data) {
          allData.push(...data);
        }
      }
      
      const docMap = new Map<string, Set<string>>();
      allData.forEach(d => {
        // FILTRO ANTI-VACIOS: Ignorar filas pre-reservadas sin archivo real
        if (d.link_documento && typeof d.link_documento === 'string' && d.link_documento.trim() !== '') {
          if (!docMap.has(d.socio_id)) docMap.set(d.socio_id, new Set());
          docMap.get(d.socio_id)?.add(d.tipo_documento);
        }
      });
      return docMap;
    }
  });

  let loading = sociosLoading;

  const sociosConDocumentos = useMemo(() => {
    if (!rawSocios) return [];

    return rawSocios.map(socio => {
      if (socio.status === 'Retirado') return null;

      const liveDocs = docsExistData?.get(socio.id);
      const hasPlanos = liveDocs ? liveDocs.has('Planos de ubicación') : socio.has_planos || false;
      const hasMemoria = liveDocs ? liveDocs.has('Memoria descriptiva') : socio.has_memoria || false;
      const hasFicha = liveDocs ? liveDocs.has('Ficha') : socio.has_ficha || false;
      const hasContrato = liveDocs ? liveDocs.has('Contrato') : socio.has_contrato || false;
      const hasComprobante = liveDocs ? liveDocs.has('Comprobante de Pago') : socio.has_comprobante || false;

      // DESCONEXIÓN DE PRUEBA: Solo confiar en el valor puro de la Base de Datos.
      const finalIsLoteMedido = socio.is_lote_medido ?? false;
      const isPaid = !!socio.receiptNumber && socio.receiptNumber.trim() !== '' && socio.receiptNumber.trim() !== 'N/A';

      const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        
      const searchableContent = normalize(`
        ${socio.nombres} 
        ${socio.apellidoPaterno} 
        ${socio.apellidoMaterno} 
        ${socio.dni} 
        ${socio.mz || ''} 
        ${socio.lote || ''} 
        ${socio.receiptNumber || ''}
      `);

      return {
        ...socio,
        has_planos: hasPlanos,
        has_memoria: hasMemoria,
        has_ficha: hasFicha,
        has_contrato: hasContrato,
        has_comprobante: hasComprobante,
        nombreCompleto: `${socio.apellidoPaterno} ${socio.apellidoMaterno} ${socio.nombres}`,
        is_lote_medido: finalIsLoteMedido,
        searchableContent,
        paymentInfo: { 
          status: isPaid ? 'Pagado' : 'No Pagado', 
          receipt_number: socio.receiptNumber || null 
        },
      };
    }).filter(Boolean) as SocioConDocumentos[];
  }, [rawSocios, docsExistData]);

  const stats = useMemo(() => {
    let data = sociosConDocumentos;
    if (selectedDistrito !== 'all') {
      data = data.filter(s => (s as any).distritoVivienda === selectedDistrito);
    }
    if (selectedLocalidad !== 'all') {
      data = data.filter(s => s.localidad === selectedLocalidad);
    }

    const total = data.length;
    const medidos = data.filter(s => s.is_lote_medido).length;
    const pendientes = total - medidos;

    return { total, medidos, pendientes };
  }, [sociosConDocumentos, selectedLocalidad, selectedDistrito]);

  const refreshAllData = useCallback(() => {
    refreshSocios(true);
  }, [refreshSocios]);

  // Resetear localidad cuando cambie el distrito
  useEffect(() => {
    setSelectedLocalidad('all');
  }, [selectedDistrito]);

  const [rowSelection, setRowSelection] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState('documents');
  const isDesktop = useMediaQuery('(min-width: 768px)');
  
  const updateMutation = useMutation<any, Error, { tableName: string; id: string | number; record: any }>({ mutationKey: ['updateRecord'] });
  const deleteMutation = useMutation<any, Error, { tableName: string; id: string | number; isSoftDelete: boolean }>({ mutationKey: ['deleteRecord'] });

  // Refs imperativas — abrir/cerrar modales SIN re-renderizar este componente
  const uploadModalRef = useRef<{ open: (config: any) => void }>(null);
  const deleteDialogRef = useRef<{ open: (config: any) => void }>(null);
  
  const { roles, customPermissions, loading: userLoading } = useUser();
  const isAdmin = useMemo(() => roles?.includes('admin') ?? false, [roles]);
  const canDeleteDocsOrAdmin = useMemo(() => isAdmin || !!customPermissions?.can_delete_documents, [isAdmin, customPermissions]);
  const canDeleteBlueprints = useMemo(() => !!customPermissions?.can_delete_blueprints, [customPermissions]);
  const isEngineer = useMemo(() => roles?.includes('engineer') ?? false, [roles]);
  const canManageEngineering = useMemo(() => isAdmin || isEngineer, [isAdmin, isEngineer]);

  const filteredData = useMemo(() => {
    const normalize = (text: string) => 
      text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    // 1. Filtrar primero por distrito y localidad
    let data = sociosConDocumentos;
    if (selectedDistrito !== 'all') {
      data = data.filter(s => (s as any).distritoVivienda === selectedDistrito);
    }
    if (selectedLocalidad !== 'all') {
      data = data.filter(s => s.localidad === selectedLocalidad);
    }

    // 1b. Filtrar por estado de lote medido
    if (loteMedidoFilter === 'medido') {
      data = data.filter(s => s.is_lote_medido === true);
    } else if (loteMedidoFilter === 'pendiente') {
      data = data.filter(s => s.is_lote_medido === false);
    }

    // 1c. Filtrar por cruce operativo (Finanzas vs Ingeniería)
    if (cruceFilter === 'medido_sin_pago') {
      data = data.filter(s => s.is_lote_medido === true && s.paymentInfo.status === 'No Pagado');
    } else if (cruceFilter === 'pagado_por_medir') {
      data = data.filter(s => s.is_lote_medido === false && s.paymentInfo.status === 'Pagado');
    } else if (cruceFilter === 'listo_impresion') {
      data = data.filter(s => {
        return s.is_lote_medido === true && s.paymentInfo.status === 'Pagado' && s.has_planos && s.has_memoria;
      });
    }

    // 2. Si no hay búsqueda de texto, retornar el resultado
    const searchLower = normalize(debouncedSearchQuery.trim());
    if (!searchLower) {
      return data;
    }

    let exactMz: string | null = null;
    let exactLote: string | null = null;
    let remainingQuery = searchLower;

    // Extraer comandos específicos como "mz A", "manzana 15"
    const mzMatch = remainingQuery.match(/\b(?:mz|manzana)\s*[:\-]?\s*([a-z0-9\-]+)\b/i);
    if (mzMatch) {
      exactMz = mzMatch[1];
      remainingQuery = remainingQuery.replace(mzMatch[0], '');
    }

    // Extraer comandos específicos como "lt 10", "lote B"
    const loteMatch = remainingQuery.match(/\b(?:lt|lote)\s*[:\-]?\s*([a-z0-9\-]+)\b/i);
    if (loteMatch) {
      exactLote = loteMatch[1];
      remainingQuery = remainingQuery.replace(loteMatch[0], '');
    }

    const tokens = remainingQuery.split(/\s+/).filter(t => t.length > 0);

    return data.filter(socio => {
      // Filtrar por Manzana si el usuario lo especificó
      if (exactMz) {
        const socioMz = normalize(socio.mz || '').trim();
        if (!socioMz.includes(exactMz)) return false;
      }

      // Filtrar por Lote si el usuario lo especificó
      if (exactLote) {
        const socioLt = normalize(socio.lote || '').trim();
        if (!socioLt.includes(exactLote)) return false;
      }

      // Si no quedan más palabras que buscar, retornamos true (cumple Mz/Lote)
      if (tokens.length === 0) return true;

      return tokens.every(token => socio.searchableContent?.includes(token));
    });
  }, [sociosConDocumentos, debouncedSearchQuery, selectedLocalidad, selectedDistrito, loteMedidoFilter, cruceFilter]);

  // handleUpdateLoteMedido ya no existe aquí — la lógica vive en LoteMedidoCell
  // para evitar re-renders masivos del array padre.

  const handleBulkUpdateLoteMedido = useCallback(async (newValue: boolean, selectedData: SocioConDocumentos[]) => {
    if (!canManageEngineering) return toast.error('Acceso restringido');
    
    const selectedIds = selectedData
      .filter(item => {
        if (newValue) return true;
        const hasDocs = item.has_planos || item.has_memoria;
        return !hasDocs;
      })
      .map(item => item.id);

    if (selectedIds.length === 0) return toast.warning('Ninguna fila cumple los requisitos');

    if (!navigator.onLine) {
      await offlineSync.addJob({
        id: crypto.randomUUID(),
        type: 'bulk_update_lote_medido',
        payload: { ids: selectedIds, is_lote_medido: newValue, socioNames: selectedData.map(s => s.nombreCompleto).join(', ') }
      });
      toast.success(`Guardado offline: ${selectedIds.length} expedientes a actualizar.`);
      setRowSelection({});
      return;
    }

    try {
      // Optimistic UI for bulk update
      queryClient.setQueryData(['supabaseData', 'vw_socio_titulares_estado'], (oldData: any) => {
        if (!oldData || !oldData.data) return oldData;
        return {
          ...oldData,
          data: oldData.data.map((item: any) => 
            selectedIds.includes(item.id) ? { ...item, is_lote_medido: newValue } : item
          )
        };
      });

      const { error } = await supabase.from('socio_titulares').update({ is_lote_medido: newValue }).in('id', selectedIds);
      if (error) throw error;
      toast.success(`Actualizados ${selectedIds.length} expedientes`);
      setRowSelection({});
    } catch (error) {
      toast.error('Error en actualización masiva');
      refreshAllData(); // Revert on error
    }
  }, [canManageEngineering, refreshAllData, queryClient]);

  const handleDeleteDocumentDirect = useCallback(async (documentId: number, documentLink: string, documentType: string) => {
    try {
      const bucketName = getBucketNameForDocumentType(documentType);
      const url = new URL(documentLink);
      const filePath = url.pathname.split('/').slice(-2).join('/');

      // Remove from storage
      await supabase.storage.from(bucketName).remove([filePath]);
      
      // Optimistic UI for deletion
      await deleteMutation.mutateAsync({ tableName: 'socio_documentos', id: documentId, isSoftDelete: false });

      toast.success('Documento eliminado');
    } catch (error) {
      toast.error('Error al eliminar');
      refreshAllData();
    }
  }, [refreshAllData, deleteMutation]);

  // Helper para renderizar headers ordenables
  const SortableHeader = ({ column, title }: { column: any, title: string }) => {
    const isSorted = column.getIsSorted();
    return (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(isSorted === "asc")}
        className="-ml-4 h-8 hover:bg-transparent font-bold text-gray-600"
      >
        {title}
        {isSorted === "asc" ? (
          <ArrowUp className="ml-2 h-4 w-4 text-[#4892CC]" />
        ) : isSorted === "desc" ? (
          <ArrowDown className="ml-2 h-4 w-4 text-[#4892CC]" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4 text-gray-300" />
        )}
      </Button>
    );
  };

  const columns: ColumnDef<SocioConDocumentos>[] = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          className="translate-y-[2px] rounded-md border-gray-300"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          className="translate-y-[2px] rounded-md border-gray-300"
        />
      ),
    },
    {
      accessorKey: 'nombreCompleto',
      header: ({ column }) => <SortableHeader column={column} title="Socio / Titular" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-900 uppercase tracking-tight leading-tight">
            {`${row.original.nombres} ${row.original.apellidoPaterno} ${row.original.apellidoMaterno}`}
          </span>
          <span className="text-[10px] font-mono text-gray-400">{row.original.dni}</span>
        </div>
      ),
    },
    {
      accessorKey: 'mz',
      header: ({ column }) => <SortableHeader column={column} title="Mz" />,
      cell: ({ row }) => (
        <div className="bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 w-fit">
          <span className="text-xs font-black text-gray-700">{row.original.mz || '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'lote',
      header: ({ column }) => <SortableHeader column={column} title="Lt" />,
      cell: ({ row }) => (
        <div className="bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 w-fit">
          <span className="text-xs font-black text-gray-700">{row.original.lote || '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'is_lote_medido',
      header: ({ column }) => <SortableHeader column={column} title="Ingeniería" />,
      cell: ({ row }) => (
        <LoteMedidoCell
          socioId={row.original.id}
          initialValue={row.original.is_lote_medido ?? false}
          disabled={!canManageEngineering}
          socio={row.original}
        />
      ),
    },
    {
      id: 'finanzas',
      accessorFn: (row) => row.paymentInfo.status,
      header: ({ column }) => <SortableHeader column={column} title="Finanzas" />,
      cell: ({ row }) => {
        const isPaid = row.original.paymentInfo.status === 'Pagado';
        return (
          <div className="flex flex-col gap-1">
            <Badge className={cn(
              "w-fit text-[10px] font-black px-2 py-0.5 border border-gray-100 shadow-sm",
              isPaid 
                ? "bg-emerald-500 text-white" 
                : "bg-red-500/10 text-red-600"
            )}>
              {isPaid && <Ticket className="w-3 h-3 mr-1 inline" />}
              {row.original.paymentInfo.status.toUpperCase()}
            </Badge>
            {row.original.paymentInfo.receipt_number && (
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 w-fit">
                REC: {row.original.paymentInfo.receipt_number}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'documentos',
      header: 'Expediente Digital',
      cell: ({ row }) => {
        const renderTableBadge = (status: boolean, label: string, onClick?: () => void) => {
          if (!status) {
            return (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold bg-gray-100 text-gray-400 border-dashed border-gray-200">
                <XCircle className="w-3 h-3 mr-1" />
                {label}
              </Badge>
            );
          }
          return (
            <Badge 
              variant="outline" 
              onClick={onClick}
              className={`text-[10px] uppercase tracking-wider font-bold bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm shadow-emerald-500/10 ${onClick ? 'cursor-pointer hover:bg-emerald-100 transition-colors' : ''}`}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {label}
            </Badge>
          );
        };

        return (
          <div className="flex flex-col gap-1.5">
             <div className="flex flex-wrap gap-1.5 text-[10px] font-bold max-w-[200px]">
                {renderTableBadge(row.original.has_planos ?? false, 'Planos', () => openDocumentDirectly(row.original.id, 'Planos de ubicación'))}
                {renderTableBadge(row.original.has_memoria ?? false, 'Memoria', () => openDocumentDirectly(row.original.id, 'Memoria descriptiva'))}
                {renderTableBadge(row.original.has_ficha ?? false, 'Ficha', () => openDocumentDirectly(row.original.id, 'Ficha'))}
                {renderTableBadge(row.original.has_contrato ?? false, 'Contrato', () => openDocumentDirectly(row.original.id, 'Contrato'))}
                {(() => {
                  const receiptNumber = row.original.paymentInfo?.receipt_number || '';
                  const isDigitalReceipt = receiptNumber?.startsWith('R-') || receiptNumber?.startsWith('B');
                  const isPaid = row.original.paymentInfo?.status === 'Pagado';
                  
                  return renderTableBadge(
                    isDigitalReceipt || (isPaid ?? false), 
                    isDigitalReceipt ? 'Pago' : 'Físico', 
                    isDigitalReceipt ? () => openDocumentDirectly(row.original.id, 'Comprobante de Pago', receiptNumber) : undefined
                  );
                })()}
             </div>
          </div>
        );
      },
    },
    {
      id: 'acciones',
      header: 'Gestión',
      cell: ({ row }) => {
        const missing = [];
        if (!row.original.has_planos) missing.push('Planos de ubicación');
        if (!row.original.has_memoria) missing.push('Memoria descriptiva');
        // Fichas, Contratos y Comprobantes son automáticos, prohibida la subida manual.
        
        if (missing.length === 0) return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
        return (
          <div className="flex gap-1">
            {missing.map(t => (
              <Button 
                key={t} 
                variant="outline" 
                size="sm" 
                className="h-7 px-2 text-[9px] font-bold border-[#4892CC]/20 text-[#4892CC] hover:bg-[#E8F1F8]"
                onClick={() => uploadModalRef.current?.open({ 
                  socioId: row.original.id, 
                  socioName: `${row.original.nombres} ${row.original.apellidoPaterno} ${row.original.apellidoMaterno}`, 
                  documentType: t 
                })}
              >
                + {t.split(' ')[0]}
              </Button>
            ))}
          </div>
        );
      },
    },
  ], [canDeleteDocsOrAdmin, canDeleteBlueprints, isAdmin, isEngineer, canManageEngineering]);

  if (loading || userLoading) return (
    <div className="min-h-screen bg-[#FAFBFC] page-enter pb-20">
      <header className="relative h-64 md:h-80 flex items-center overflow-hidden bg-white border-b border-gray-100">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <div className="h-6 w-32 bg-slate-200 rounded-full animate-pulse mb-4" />
            <div className="h-10 w-80 bg-slate-200 rounded-xl animate-pulse mb-3" />
            <div className="h-5 w-96 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        </div>
      </header>
      <div className="container mx-auto px-6 -mt-10 relative z-20">
        <div className="flex gap-3 mb-6">
          <div className="h-12 w-72 bg-white rounded-xl border animate-pulse shadow-sm" />
          <div className="h-12 w-48 bg-white rounded-xl border animate-pulse shadow-sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="rounded-2xl border-gray-100 shadow-glass p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-slate-50 rounded animate-pulse" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-8 bg-slate-50 rounded-lg animate-pulse" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFBFC] page-enter pb-20">
      <header className="relative h-64 md:h-80 flex items-center overflow-hidden bg-white border-b border-gray-100">
        <div className="absolute inset-0 bg-gradient-to-r from-[#4892CC]/10 to-transparent z-0"></div>
        <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none">
          <LayoutGrid className="w-full h-full text-[#4892CC]" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-[#E8F1F8] text-[#4892CC] border-none font-bold px-4 py-1 rounded-full">
              MÓDULO DE INGENIERÍA v2.0
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter mb-4">
              Expedientes <span className="text-[#4892CC]">Digitales</span>
            </h1>
            <p className="text-lg text-gray-500 font-medium leading-relaxed">
              Gestión centralizada de planimetría, memorias descriptivas y control de medición de lotes.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-[#4892CC]/10 text-[#4892CC] rounded-xl text-sm font-bold">
              <Users className="w-4 h-4" />
              <span>{filteredData.length} expediente{filteredData.length !== 1 ? 's' : ''} encontrado{filteredData.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 -mt-12 relative z-20">
        {/* Tarjetas de Estadísticas de Lotes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-5 rounded-2xl border-gray-100 shadow-glass flex items-center gap-4 bg-white">
            <div className="p-3 rounded-xl bg-slate-50 text-slate-500">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Lotes</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{stats.total}</p>
            </div>
          </Card>
          <Card className="p-5 rounded-2xl border-gray-100 shadow-glass flex items-center gap-4 bg-white">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lotes Medidos</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{stats.medidos}</p>
            </div>
          </Card>
          <Card className="p-5 rounded-2xl border-gray-100 shadow-glass flex items-center gap-4 bg-white">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lotes Pendientes</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{stats.pendientes}</p>
            </div>
          </Card>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-glass border border-gray-100 mb-8 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full lg:w-[400px]">
            <SearchInputWithDebounce
              placeholder="Buscar por socio, DNI, manzana, lote o recibo..."
              onDebouncedChange={setDebouncedSearchQuery}
              inputClassName="h-14 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#4892CC]/20 text-gray-700 font-bold w-full"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <LocalidadCombobox
              value={selectedLocalidad}
              onValueChange={setSelectedLocalidad}
              triggerClassName="h-14 w-full sm:w-[240px]"
              distritoFilter={selectedDistrito}
            />

            <DistritoCombobox
              value={selectedDistrito}
              onValueChange={setSelectedDistrito}
              triggerClassName="h-14 w-full sm:w-[240px]"
            />

            <Select value={loteMedidoFilter} onValueChange={setLoteMedidoFilter}>
              <SelectTrigger className="h-14 w-full sm:w-[200px] bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#4892CC]/20 text-gray-700 font-bold">
                <SelectValue placeholder="Estado Lote" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-gray-100 shadow-premium">
                <SelectItem value="all" className="rounded-xl font-bold">Todos los Lotes</SelectItem>
                <SelectItem value="medido" className="rounded-xl font-bold text-emerald-600">Solo Medidos</SelectItem>
                <SelectItem value="pendiente" className="rounded-xl font-bold text-amber-600">Solo Pendientes</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cruceFilter} onValueChange={setCruceFilter}>
              <SelectTrigger className="h-14 w-full sm:w-[230px] bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#4892CC]/20 text-gray-700 font-bold">
                <SelectValue placeholder="Cruce Operativo" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-gray-100 shadow-premium">
                <SelectItem value="all" className="rounded-xl font-bold">Todos los socios</SelectItem>
                <SelectItem value="medido_sin_pago" className="rounded-xl font-bold text-rose-600">⚠️ Medidos sin Pago</SelectItem>
                <SelectItem value="pagado_por_medir" className="rounded-xl font-bold text-sky-600">⚡ Pagados por Medir</SelectItem>
                <SelectItem value="listo_impresion" className="rounded-xl font-bold text-emerald-600">✅ Listos para Impresión</SelectItem>
              </SelectContent>
            </Select>

            {canManageEngineering && Object.keys(rowSelection).length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-14 px-6 bg-[#4892CC] hover:bg-[#3C8B93] rounded-2xl font-bold shadow-lg shadow-[#4892CC]/20">
                    Acciones ({Object.keys(rowSelection).length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-2xl p-2 border-gray-100 shadow-premium">
                  <DropdownMenuItem 
                    onClick={() => handleBulkUpdateLoteMedido(true, filteredData.filter((_, i) => rowSelection[i]))} 
                    className="rounded-xl font-bold text-emerald-600"
                  >
                    <CheckSquare className="w-4 h-4 mr-2" /> Marcar como Medido
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleBulkUpdateLoteMedido(false, filteredData.filter((_, i) => rowSelection[i]))} 
                    className="rounded-xl font-bold text-amber-600"
                  >
                    <Square className="w-4 h-4 mr-2" /> Marcar como Pendiente
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap bg-gray-100/50 p-1 rounded-2xl mb-6">
            <TabsTrigger 
              value="documents" 
              className="flex-1 rounded-xl data-[state=active]:bg-[#4892CC] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:font-bold"
            >
              Expedientes Digitales
            </TabsTrigger>

            {canDeleteDocsOrAdmin && (
              <TabsTrigger 
                value="deletion-requests" 
                className="flex-1 rounded-xl data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:font-bold"
              >
                Solicitudes de Eliminación
              </TabsTrigger>
            )}
          </TabsList>



          <TabsContent value="documents" className="mt-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {filteredData.length === 0 ? (
                <div className="py-32 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6">
                    <FileWarning className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">No se encontraron expedientes</h3>
                  <p className="text-gray-400 mt-2">Intenta ajustar los filtros o términos de búsqueda.</p>
                </div>
              ) : (
                <>
                  {isDesktop ? (
                    <div className="hidden md:block">
                      <DataTable 
                        columns={columns} 
                        data={filteredData} 
                        rowSelection={rowSelection}
                        onRowSelectionChange={setRowSelection}
                      />
                    </div>
                  ) : (
                    <div className="md:hidden p-4">
                      <DocumentCardView
                        data={filteredData}
                        resetTrigger={debouncedSearchQuery + selectedLocalidad + selectedDistrito}
                        canManageLoteMedido={canManageEngineering}
                        onOpenUploadModal={(socio, type) => uploadModalRef.current?.open({ 
                          socioId: socio.id, 
                          socioName: `${socio.nombres} ${socio.apellidoPaterno} ${socio.apellidoMaterno}`, 
                          documentType: type as any 
                        })}
                        onUpdateLoteMedido={async (socioId, newValue, socio) => {
                          if (!canManageEngineering) { toast.error('Acceso restringido'); return; }
                          const s = socio as SocioConDocumentos;
                          const hasReqDocs = s.has_planos || s.has_memoria;
                          if (!newValue && hasReqDocs) { toast.warning('Acción bloqueada', { description: 'No se puede desmarcar un lote con planos subidos.' }); return; }
                          
                          // Optimistic UI Update
                          queryClient.setQueriesData({ queryKey: ['supabaseData', 'vw_socio_titulares_estado'] }, (oldData: any) => {
                            if (!oldData || !oldData.data) return oldData;
                            return {
                              ...oldData,
                              data: oldData.data.map((item: any) => 
                                item.id === socioId ? { ...item, is_lote_medido: newValue } : item
                              )
                            };
                          });
                          
                          if (!navigator.onLine) {
                            await offlineSync.addJob({
                              id: crypto.randomUUID(),
                              type: 'update_lote_medido',
                              payload: { id: socioId, is_lote_medido: newValue, socioName: s.nombreCompleto }
                            });
                            toast.success('Guardado offline. Se sincronizará al conectar.');
                            return;
                          }

                          try {
                            await updateMutation.mutateAsync({ tableName: 'socio_titulares', id: socioId, record: { is_lote_medido: newValue } });
                          } catch { 
                            // Revert on error
                            queryClient.setQueriesData({ queryKey: ['supabaseData', 'vw_socio_titulares_estado'] }, (oldData: any) => {
                              if (!oldData || !oldData.data) return oldData;
                              return {
                                ...oldData,
                                data: oldData.data.map((item: any) => 
                                  item.id === socioId ? { ...item, is_lote_medido: !newValue } : item
                                )
                              };
                            });
                          }
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {canDeleteDocsOrAdmin && (
            <TabsContent value="deletion-requests" className="mt-0">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <DeletionRequestsTable />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <UploadModalWrapper ref={uploadModalRef} onSuccess={refreshAllData} />
      <DeleteDialogWrapper ref={deleteDialogRef} onConfirm={handleDeleteDocumentDirect} />
    </div>
  );
}

export default PartnerDocuments;
