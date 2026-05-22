import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ColumnDef, 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  VisibilityState
} from '@tanstack/react-table';
import { 
  PlusCircle, 
  Loader2, 
  Edit, 
  Trash2, 
  Search, 
  Download, 
  ArrowUpDown,
  AlertCircle,
  CheckCircle2,
  XCircle,
  UserMinus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { SocioTitular } from '@/lib/types';
import SocioTitularRegistrationForm from '@/components/custom/SocioTitularRegistrationForm';
import LocalidadCombobox from '@/components/custom/LocalidadCombobox';
import DistritoCombobox from '@/components/custom/DistritoCombobox';
import ExportSociosDialog from '@/components/custom/ExportSociosDialog';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';
import { cn, sortReceipts, sortNames } from '@/lib/utils';
import { useUser } from '@/context/UserContext';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { DataTable } from '@/components/ui-custom/DataTable';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useDebounce } from 'use-debounce';

type SocioStatus = 'Activo' | 'Inactivo' | 'Retirado' | 'Sin Registro';

interface EnrichedSocio extends SocioTitular {
  status: SocioStatus;
  receiptNumber: string;
  lastTransactionDate?: string;
  lastTransactionType?: string;
  // Campos de documentos para exportación
  has_planos?: boolean;
  has_memoria?: boolean;
  has_ficha?: boolean;
  has_contrato?: boolean;
}

function People() {
  const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [socioToDelete, setSocioToDelete] = useState<EnrichedSocio | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch] = useDebounce(searchInput, 800);
  const [selectedLocalidad, setSelectedLocalidad] = useState<string>('all');
  const [selectedEstado, setSelectedEstado] = useState<string>('all');
  const [selectedDistrito, setSelectedDistrito] = useState<string>('all');
  
  const [sorting, setSorting] = useState<SortingState>([{ id: 'receiptNumber', desc: false }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const [mobileVisibleCount, setMobileVisibleCount] = useState(10);
  const observerTarget = useRef<HTMLDivElement>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [socioToEdit, setSocioToEdit] = useState<EnrichedSocio | null>(null);

  const { loading: userLoading } = useUser();

  const { data: socios, loading, setFilters, refreshData } = useSupabaseData<EnrichedSocio>({
    tableName: 'vw_socio_titulares_estado',
    initialSort: { column: 'apellidoPaterno', ascending: true },
    fetchAll: true,
    searchQuery: debouncedSearch,
    searchColumns: ['nombres', 'apellidoPaterno', 'apellidoMaterno', 'dni', 'receiptNumber']
  });

  // Apply column filters
  useEffect(() => {
    const newFilters: Record<string, any> = {};
    if (selectedLocalidad !== 'all') newFilters.localidad = selectedLocalidad;
    if (selectedDistrito !== 'all') newFilters.distritoVivienda = selectedDistrito;
    if (selectedEstado !== 'all') newFilters.status = selectedEstado;
    setFilters(newFilters);
  }, [selectedLocalidad, selectedDistrito, selectedEstado, setFilters]);

  // Realtime updates (basic refresh)
  useEffect(() => {
    const channel = supabase.channel('people_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'socio_titulares' }, () => refreshData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingresos' }, () => refreshData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'socio_documentos' }, () => refreshData(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refreshData]);

  useEffect(() => {
    setMobileVisibleCount(10);
  }, [debouncedSearch, selectedLocalidad, selectedEstado, selectedDistrito]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && mobileVisibleCount < socios.length) {
          setMobileVisibleCount((prev) => prev + 10);
        }
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [mobileVisibleCount, socios.length]);

  const columns: ColumnDef<EnrichedSocio>[] = useMemo(() => [
    {
      accessorKey: 'dni',
      header: ({ column }) => (
        <Button variant="ghost" className="pl-0 hover:bg-transparent font-semibold text-gray-700" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          DNI <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-mono text-sm text-gray-900">{row.getValue('dni')}</span>,
    },
    {
      accessorKey: 'nombres',
      header: ({ column }) => (
        <Button variant="ghost" className="pl-0 hover:bg-transparent font-semibold text-gray-700" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Socio Titular <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      sortingFn: sortNames,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold uppercase text-gray-900 leading-tight">
            {row.original.nombres} {row.original.apellidoPaterno}
          </span>
          <span className="text-[10px] text-gray-400 uppercase font-medium">
            {row.original.apellidoMaterno}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'localidad',
      header: 'Ubicación',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="uppercase text-[11px] font-bold text-gray-700">{row.getValue('localidad')}</span>
          <span className="text-[10px] font-mono text-gray-400">Mz: {row.original.mz || '-'} Lt: {row.original.lote || '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'receiptNumber',
      header: ({ column }) => (
        <Button variant="ghost" className="pl-0 hover:bg-transparent font-semibold text-gray-700" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Último Mov. <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      sortingFn: sortReceipts,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className={cn(
            "text-xs font-bold font-mono",
            row.original.lastTransactionType?.toLowerCase().includes('anulacion') ? "text-red-400 line-through" : "text-blue-600"
          )}>
            {row.original.receiptNumber}
          </span>
          <span className="text-[9px] text-gray-400 uppercase font-black">{row.original.lastTransactionType || 'Sin registro'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <Button variant="ghost" className="pl-0 hover:bg-transparent font-semibold text-gray-700" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Estado <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        const statusConfig = {
          'Activo': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
          'Inactivo': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle },
          'Retirado': { color: 'bg-red-100 text-red-700 border-red-200', icon: UserMinus },
          'Sin Registro': { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: XCircle },
        };
        const config = statusConfig[status];
        const Icon = config.icon;
        return (
          <Badge variant="outline" className={cn("font-black border px-3 py-1 rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit", config.color)}>
            <Icon className="w-3 h-3" />
            {status}
          </Badge>
        );
      }
    },
    {
      id: 'observaciones',
      header: 'Observaciones',
      cell: ({ row }) => {
        const socio = row.original as any;
        const hasObs = socio.isObservado && socio.observacion;
        const hasPayObs = socio.is_payment_observed && socio.payment_observation_detail;
        if (!hasObs && !hasPayObs) return <span className="text-gray-300 text-[10px]">—</span>;
        return (
          <div className="flex flex-col gap-1 max-w-[200px]">
            {hasObs && (
              <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-[10px] text-amber-700 font-medium leading-tight line-clamp-2">{socio.observacion}</span>
              </div>
            )}
            {hasPayObs && (
              <div className="flex items-start gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                <span className="text-[10px] text-red-700 font-medium leading-tight line-clamp-2">{socio.payment_observation_detail}</span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      id: 'docsSummary',
      header: 'Expediente',
      cell: ({ row }) => {
        const { has_planos, has_memoria, has_ficha, has_contrato } = row.original;
        
        const docs = [
          { name: 'Plano', active: has_planos },
          { name: 'Memoria', active: has_memoria },
          { name: 'Ficha', active: has_ficha },
          { name: 'Contrato', active: has_contrato },
        ];
        
        return (
          <div className="flex gap-1.5" title="Semáforo de Documentación">
            {docs.map(d => (
              <div 
                key={d.name} 
                title={d.name}
                className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-all border",
                  d.active 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                    : "bg-red-50 text-red-400 border-red-100 opacity-50"
                )}
              >
                {d.name.charAt(0)}
              </div>
            ))}
          </div>
        );
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => { setSocioToEdit(row.original); setIsEditDialogOpen(true); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => { setSocioToDelete(row.original); setIsDeleteDialogOpen(true); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ], []);

  const table = useReactTable({
    data: socios,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnVisibility },
  });

  const mobileData = useMemo(() => {
    return table.getSortedRowModel().rows.slice(0, mobileVisibleCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, mobileVisibleCount, socios, sorting]);

  if ((loading && socios.length === 0) || userLoading) return (
    <div className="min-h-screen bg-[#FAFBFC] page-enter pb-10">
      <div className="w-full bg-white border-b border-gray-100 py-12 px-8 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-64 bg-slate-200 rounded-xl animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-4 mb-6">
          <div className="h-10 w-64 bg-white rounded-xl border animate-pulse" />
          <div className="h-10 w-40 bg-white rounded-xl border animate-pulse" />
          <div className="h-10 w-40 bg-white rounded-xl border animate-pulse" />
        </div>
        <Card className="rounded-2xl border-gray-100 shadow-glass overflow-hidden">
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-6 px-6 py-4">
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                <div className="h-6 w-16 bg-slate-100 rounded-full animate-pulse" />
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse ml-auto" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFBFC] page-enter pb-10">
      <div className="w-full bg-white border-b border-gray-100 py-12 px-8 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#4892CC]/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">Gestión de Socios</h1>
              <p className="text-gray-500 font-medium mt-1">Control de estados basado en el movimiento más reciente.</p>
            </div>
            <Button className="h-12 bg-[#4892CC] hover:bg-[#3C8B93] text-white gap-2 rounded-2xl font-bold shadow-lg shadow-[#4892CC]/20 px-6" onClick={() => setIsRegistrationDialogOpen(true)}>
              <PlusCircle className="h-5 w-5" /> Registrar Nuevo Socio
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6 px-4 md:px-8">
        {/* Filtros */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative w-full lg:w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Buscar por DNI, nombre o recibo..." 
              className="pl-11 bg-gray-50 border-none focus:ring-2 focus:ring-[#4892CC]/20 h-12 rounded-xl font-medium" 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <LocalidadCombobox
              value={selectedLocalidad}
              onValueChange={setSelectedLocalidad}
              triggerClassName="w-full md:w-[220px] h-12"
              distritoFilter={selectedDistrito}
            />

            <DistritoCombobox
              value={selectedDistrito}
              onValueChange={setSelectedDistrito}
              triggerClassName="w-full md:w-[220px] h-12"
            />

            <Select value={selectedEstado} onValueChange={setSelectedEstado}>
              <SelectTrigger className="w-full md:w-[180px] h-12 bg-gray-50 border-none rounded-xl font-bold text-gray-700">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Todos los Estados</SelectItem>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
                <SelectItem value="Retirado">Retirado</SelectItem>
                <SelectItem value="Sin Registro">Sin Registro</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => setIsExportDialogOpen(true)}
              className="h-12 border-gray-200 text-gray-600 gap-2 rounded-xl font-bold px-5 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" /> Exportar Reporte
            </Button>
          </div>
        </div>

        {/* Vista Escritorio */}
        <div className="hidden md:block space-y-4">
          <DataTable 
            columns={columns} 
            data={table.getRowModel().rows.map(r => r.original)} 
            isLoading={loading}
            enableVirtualization={true}
          />
        </div>

        {/* Vista Móvil */}
        <div className="md:hidden space-y-4">
          {mobileData.length ? (
            <>
              {mobileData.map((row) => {
                const socio = row.original;
                return (
                  <Card key={socio.id} className="w-full bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                    <div className="p-5 space-y-3">
                      {/* Header: Nombre + Estado */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-mono font-bold text-gray-400">DNI {socio.dni}</span>
                          <h3 className="text-base font-black text-gray-900 uppercase leading-tight mt-0.5 truncate">
                            {socio.nombres} {socio.apellidoPaterno} {socio.apellidoMaterno}
                          </h3>
                        </div>
                        <Badge className={cn(
                          "font-black border px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider shrink-0",
                          socio.status === 'Activo' ? "bg-emerald-100 text-emerald-700" : 
                          socio.status === 'Inactivo' ? "bg-amber-100 text-amber-700" : 
                          socio.status === 'Retirado' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
                        )}>
                          {socio.status}
                        </Badge>
                      </div>

                      {/* Info Grid: Localidad, Mz/Lt, Recibo */}
                      <div className="grid grid-cols-3 gap-3 py-3 border-y border-gray-50">
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Comunidad</p>
                          <p className="text-xs font-bold text-gray-700 uppercase truncate">{socio.localidad || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Ubicación</p>
                          <p className="text-xs font-bold text-gray-700">Mz {socio.mz || '-'} Lt {socio.lote || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Recibo</p>
                          <p className={cn(
                            "text-xs font-bold font-mono",
                            socio.lastTransactionType?.toLowerCase().includes('anulacion') ? "text-red-400 line-through" : "text-blue-600"
                          )}>{socio.receiptNumber}</p>
                          <p className="text-[8px] text-gray-400 uppercase font-black truncate">{socio.lastTransactionType || ''}</p>
                        </div>
                      </div>

                      {/* Observaciones */}
                      {(socio as any).isObservado && (socio as any).observacion && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] font-black text-amber-600 uppercase">Observación</p>
                            <p className="text-xs text-amber-700 font-medium leading-tight">{(socio as any).observacion}</p>
                          </div>
                        </div>
                      )}
                      {(socio as any).is_payment_observed && (socio as any).payment_observation_detail && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] font-black text-red-600 uppercase">Obs. Pago</p>
                            <p className="text-xs text-red-700 font-medium leading-tight">{(socio as any).payment_observation_detail}</p>
                          </div>
                        </div>
                      )}

                      {/* Semáforo de docs */}
                      <div className="flex items-center gap-1.5">
                        {[
                          { name: 'Plano', active: socio.has_planos },
                          { name: 'Memoria', active: socio.has_memoria },
                          { name: 'Ficha', active: socio.has_ficha },
                          { name: 'Contrato', active: socio.has_contrato },
                        ].map(d => (
                          <div 
                            key={d.name} 
                            className={cn(
                              "flex-1 py-1 rounded-md flex items-center justify-center text-[10px] font-bold border",
                              d.active 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                                : "bg-red-50 text-red-400 border-red-100 opacity-50"
                            )}
                          >
                            {d.name}
                          </div>
                        ))}
                      </div>

                      {/* Acciones */}
                      <div className="flex justify-end gap-2 pt-1">
                        <Button variant="outline" size="sm" className="h-9 rounded-xl font-bold border-gray-100 text-blue-600 text-xs" onClick={() => { setSocioToEdit(socio); setIsEditDialogOpen(true); }}>
                          <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-gray-100 text-red-400" onClick={() => { setSocioToDelete(socio); setIsDeleteDialogOpen(true); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
              <div ref={observerTarget} className="py-8 flex justify-center">
                {mobileVisibleCount < socios.length ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-[#4892CC]" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargando más socios...</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Has llegado al final</span>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400 font-bold">No se encontraron socios</p>
            </div>
          )}
        </div>
      </div>

      {/* Diálogos */}
      <Dialog open={isRegistrationDialogOpen} onOpenChange={setIsRegistrationDialogOpen}>
        <DialogContent className="max-w-2xl bg-white border-none rounded-2xl p-0 overflow-hidden">
          <SocioTitularRegistrationForm onClose={() => setIsRegistrationDialogOpen(false)} onSuccess={() => setIsRegistrationDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white border-none rounded-[2rem]">
          <ExportSociosDialog onClose={() => setIsExportDialogOpen(false)} data={table.getRowModel().rows.map(r => r.original)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl bg-white border-none rounded-2xl p-0 overflow-hidden">
          {socioToEdit && <SocioTitularRegistrationForm socioId={socioToEdit.id} onClose={() => setIsEditDialogOpen(false)} onSuccess={() => setIsEditDialogOpen(false)} />}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog 
        isOpen={isDeleteDialogOpen} 
        onClose={() => setIsDeleteDialogOpen(false)} 
        onConfirm={async () => {
          if (!socioToDelete) return;
          setIsDeleting(true);
          const { error } = await supabase.from('socio_titulares').delete().eq('id', socioToDelete.id);
          if (!error) { toast.success('Socio eliminado correctamente'); setIsDeleteDialogOpen(false); }
          setIsDeleting(false);
        }} 
        title="Eliminar Socio" 
        description="¿Estás seguro de eliminar este registro? Esta acción es irreversible."
        isConfirming={isDeleting}
      />
    </div>
  );
}

export default People;
