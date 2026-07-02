import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ColumnDef, 
} from '@tanstack/react-table';
import { useMediaQuery } from '@/hooks/useMediaQuery';
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
  UserMinus,
  Users,
  FileSpreadsheet,
  FileText,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToExcel, exportToCSV } from '@/lib/exportUtils';
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
import { useMutation } from '@tanstack/react-query';
import { DataTable } from '@/components/ui-custom/DataTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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

function DebouncedSearchInput({ value: initialValue, onChange, className, placeholder }: { value: string, onChange: (value: string) => void, className?: string, placeholder?: string }) {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue] = useDebounce(value, 300);

  useEffect(() => {
    onChange(debouncedValue);
  }, [debouncedValue, onChange]);

  return (
    <Input 
      placeholder={placeholder}
      className={className}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

function People() {
  const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [socioToDelete, setSocioToDelete] = useState<EnrichedSocio | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [selectedLocalidad, setSelectedLocalidad] = useState<string>('all');
  const [selectedDistrito, setSelectedDistrito] = useState<string>('all');
  const [viewFilter, setViewFilter] = useState<string>('all');
  
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [mobileVisibleCount, setMobileVisibleCount] = useState(10);
  const observerTarget = useRef<HTMLDivElement>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [socioToEdit, setSocioToEdit] = useState<EnrichedSocio | null>(null);

  const { loading: userLoading } = useUser();
  const deleteMutation = useMutation<any, Error, { tableName: string; id: string | number; isSoftDelete: boolean }>({ mutationKey: ['deleteRecord'] });

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  
  const serverFilters = useMemo(() => {
    const filters: Record<string, any> = {};
    if (selectedLocalidad !== 'all') filters['localidad'] = selectedLocalidad;
    if (selectedDistrito !== 'all') filters['distritoVivienda'] = selectedDistrito;
    
    if (viewFilter === 'activos') filters['status'] = 'Activo';
    if (viewFilter === 'inactivos') filters['status'] = 'Inactivo';
    if (viewFilter === 'retirados') filters['status'] = 'Retirado';
    if (viewFilter === 'sin_registro') filters['status'] = 'Sin Registro';
    if (viewFilter === 'alertas_pago') filters['is_payment_observed'] = true;
    if (viewFilter === 'alertas_generales') filters['isObservado'] = true;
    return filters;
  }, [selectedLocalidad, selectedDistrito, viewFilter]);

  const { data: rawSocios, totalCount, loading, injectRealtimeEvent } = useSupabaseData<EnrichedSocio>({
    tableName: 'vw_socio_titulares_estado',
    initialSort: { column: 'apellidoPaterno', ascending: true },
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    searchQuery: debouncedSearch,
    searchColumns: ['nombres', 'apellidoPaterno', 'apellidoMaterno', 'dni', 'receiptNumber'],
    initialFilters: serverFilters
  });

  const socios = rawSocios || [];

  const handleExport = async (type: 'excel' | 'csv') => {
    try {
      setIsExporting(true);
      
      let query = supabase.from('vw_socio_titulares_estado').select('*');

      // Aplica los filtros de la interfaz
      for (const key in serverFilters) {
        query = query.eq(key, serverFilters[key]);
      }

      // Aplica la búsqueda inteligente global
      if (debouncedSearch) {
        const searchCols = ['nombres', 'apellidoPaterno', 'apellidoMaterno', 'dni', 'receiptNumber'];
        const tokens = debouncedSearch.trim().split(/\s+/).filter(Boolean);
        tokens.forEach(token => {
          const searchConditions = searchCols.map(col => `${col}.ilike.%${token}%`).join(',');
          query = query.or(searchConditions);
        });
      }

      query = query.order('apellidoPaterno', { ascending: true }).order('id', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      const headers = ['DNI', 'Nombres', 'Apellido Paterno', 'Apellido Materno', 'Localidad', 'Mz', 'Lote', 'Estado'];
      const rows = (data || []).map(s => [
        s.dni || '',
        s.nombres || '',
        s.apellidoPaterno || '',
        s.apellidoMaterno || '',
        s.localidad || '',
        s.mz || '',
        s.lote || '',
        s.status || '',
      ]);

      if (type === 'excel') {
        exportToExcel({ filePrefix: 'socios_completos', headers, rows });
      } else {
        exportToCSV({ filePrefix: 'socios_completos', headers, rows });
      }
      toast.success(`Se exportaron ${data.length} registros`);
    } catch (err) {
      console.error('Error al exportar:', err);
      toast.error('Error al exportar los datos');
    } finally {
      setIsExporting(false);
    }
  };

  // Realtime updates (Optimized Cache Merging)
  useEffect(() => {
    const channel = supabase.channel('people_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'socio_titulares' }, injectRealtimeEvent)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingresos' }, injectRealtimeEvent)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'socio_documentos' }, injectRealtimeEvent)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [injectRealtimeEvent]);

  useEffect(() => {
    setMobileVisibleCount(10);
  }, [debouncedSearch, selectedLocalidad, viewFilter, selectedDistrito]);

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
        <Button variant="ghost" className="pl-0 hover:bg-transparent font-semibold text-foreground/80" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          DNI <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-mono text-sm text-foreground">{row.getValue('dni')}</span>,
    },
    {
      accessorKey: 'nombres',
      header: ({ column }) => (
        <Button variant="ghost" className="pl-0 hover:bg-transparent font-semibold text-foreground/80" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Socio Titular <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      sortingFn: sortNames,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold uppercase text-foreground leading-tight">
            {row.original.nombres} {row.original.apellidoPaterno}
          </span>
          <span className="text-[10px] text-muted-foreground/70 uppercase font-medium">
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
          <span className="uppercase text-[11px] font-bold text-foreground/80">{row.getValue('localidad')}</span>
          <span className="text-[10px] font-mono text-muted-foreground/70">Mz: {row.original.mz || '-'} Lt: {row.original.lote || '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'receiptNumber',
      header: ({ column }) => (
        <Button variant="ghost" className="pl-0 hover:bg-transparent font-semibold text-foreground/80" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
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
          <span className="text-[9px] text-muted-foreground/70 uppercase font-black">{row.original.lastTransactionType || 'Sin registro'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <Button variant="ghost" className="pl-0 hover:bg-transparent font-semibold text-foreground/80" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Estado <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const status = row.original.status || 'Activo';
        const statusConfig = {
          'Activo': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
          'Inactivo': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle },
          'Retirado': { color: 'bg-red-100 text-red-700 border-red-200', icon: UserMinus },
          'Sin Registro': { color: 'bg-muted text-muted-foreground border-border', icon: XCircle },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['Activo'];
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
      accessorFn: (row: any) => `${row.observacion || ''} ${row.payment_observation_detail || ''}`.trim(),
      header: ({ column }) => (
        <Button variant="ghost" className="pl-0 hover:bg-transparent font-semibold text-foreground/80" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Observaciones <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const socio = row.original as any;
        const hasObs = socio.isObservado && socio.observacion;
        const hasPayObs = socio.is_payment_observed && socio.payment_observation_detail;
        if (!hasObs && !hasPayObs) return <span className="text-gray-300 text-[10px]">—</span>;
        return (
          <div className="flex flex-col gap-1 max-w-[200px]">
            {hasObs && (
              <div className="flex items-start gap-1.5 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 rounded-lg px-2 py-1">
                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-[10px] text-amber-700 font-medium leading-tight line-clamp-2">{socio.observacion}</span>
              </div>
            )}
            {hasPayObs && (
              <div className="flex items-start gap-1.5 bg-red-50 dark:bg-red-500/10 dark:text-red-400 border border-red-200 rounded-lg px-2 py-1">
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
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-4000/10 dark:text-emerald-400 dark:border-emerald-500/20" 
                    : "bg-red-50 text-red-400 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:bg-red-50 dark:bg-red-500/10 dark:text-red-4000/10 dark:text-red-400 dark:border-red-500/20 opacity-50"
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
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400" onClick={() => { setSocioToEdit(row.original); setIsEditDialogOpen(true); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:bg-red-500/10 dark:text-red-400" onClick={() => { setSocioToDelete(row.original); setIsDeleteDialogOpen(true); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ], []);

  const mobileData = useMemo(() => {
    return socios.slice(0, mobileVisibleCount);
  }, [mobileVisibleCount, socios]);

  if ((loading && socios.length === 0) || userLoading) return (
    <div className="min-h-screen bg-background page-enter pb-10">
      <div className="w-full bg-card dark:bg-slate-900 border-b border-border/50 py-12 px-8 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-64 bg-slate-200 rounded-xl animate-pulse mb-3" />
          <div className="h-4 w-96 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-4 mb-6">
          <div className="h-10 w-64 bg-card dark:bg-slate-900 rounded-xl border animate-pulse" />
          <div className="h-10 w-40 bg-card dark:bg-slate-900 rounded-xl border animate-pulse" />
          <div className="h-10 w-40 bg-card dark:bg-slate-900 rounded-xl border animate-pulse" />
        </div>
        <Card className="rounded-2xl border-border/50 shadow-glass overflow-hidden">
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-6 px-6 py-4">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse ml-auto" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background page-enter pb-10">
      <div className="w-full bg-card dark:bg-slate-900 border-b border-border/50 py-12 px-8 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#4892CC]/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-foreground tracking-tight uppercase">Gestión de Socios</h1>
                <p className="text-muted-foreground font-medium mt-1">Control de estados basado en el movimiento más reciente.</p>
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-11 px-6 shadow-sm transition-all flex items-center gap-2" onClick={() => setIsRegistrationDialogOpen(true)}>
              <PlusCircle className="h-5 w-5" /> Registrar Nuevo Socio
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6 px-4 md:px-8">
        {/* Filtros */}
        <div className="bg-card dark:bg-slate-900 border border-border/50 rounded-2xl p-4 flex flex-col lg:flex-row gap-4 shadow-sm items-center justify-between">
          <div className="flex items-center gap-3 w-full flex-wrap lg:flex-nowrap">
            <div className="relative w-full lg:w-72 shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
              <DebouncedSearchInput 
                placeholder="Buscar socio..." 
                className="pl-12 h-11 bg-muted/50 border-transparent rounded-xl focus:bg-background focus:ring-2 focus:ring-primary/20 text-foreground/80 font-medium placeholder:text-muted-foreground/70 w-full transition-all" 
                value={debouncedSearch}
                onChange={setDebouncedSearch}
              />
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap sm:flex-nowrap">
              <Select value={viewFilter} onValueChange={setViewFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-11 rounded-xl bg-muted/50 border-transparent text-sm font-medium">
                  <SelectValue placeholder="Estado y Alertas" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos los Socios</SelectItem>
                  <SelectItem value="activos" className="text-emerald-700 font-medium">Activos</SelectItem>
                  <SelectItem value="alertas_pago" className="text-red-600 font-medium">Alertas de Pago</SelectItem>
                  <SelectItem value="alertas_generales" className="text-amber-600 font-medium">Alertas Generales</SelectItem>
                  <SelectItem value="inactivos" className="text-muted-foreground">Inactivos</SelectItem>
                  <SelectItem value="retirados" className="text-muted-foreground">Retirados</SelectItem>
                  <SelectItem value="sin_registro" className="text-muted-foreground/70">No Registrados</SelectItem>
                </SelectContent>
              </Select>

              <LocalidadCombobox
                value={selectedLocalidad}
                onValueChange={setSelectedLocalidad}
                triggerClassName="w-full sm:w-auto min-w-[160px] h-11 rounded-xl bg-muted/50 border-transparent text-sm font-medium"
                distritoFilter={selectedDistrito}
              />

              <DistritoCombobox
                value={selectedDistrito}
                onValueChange={setSelectedDistrito}
                triggerClassName="w-full sm:w-auto min-w-[160px] h-11 rounded-xl bg-muted/50 border-transparent text-sm font-medium"
              />

              {(selectedLocalidad !== 'all' || selectedDistrito !== 'all' || viewFilter !== 'all') && (
                <Button 
                  variant="ghost" 
                  onClick={() => { setSelectedLocalidad('all'); setSelectedDistrito('all'); setViewFilter('all'); }}
                  className="h-11 w-11 rounded-xl p-0 text-muted-foreground/70 hover:text-foreground hover:bg-muted"
                  title="Limpiar filtros"
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="h-11 border-border text-muted-foreground font-bold gap-2 rounded-xl px-4 hover:bg-muted shadow-sm w-full lg:w-auto shrink-0"
                disabled={isExporting}
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} 
                <span className="hidden sm:inline">{isExporting ? 'Procesando...' : 'Exportar'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl shadow-lg w-56">
              <DropdownMenuItem
                className="gap-2 font-medium cursor-pointer"
                onClick={() => handleExport('excel')}
                disabled={isExporting}
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Exportar Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 font-medium cursor-pointer"
                onClick={() => handleExport('csv')}
                disabled={isExporting}
              >
                <FileText className="h-4 w-4 text-blue-600" />
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 font-medium cursor-pointer"
                onClick={() => setIsExportDialogOpen(true)}
              >
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                Exportación Avanzada...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Vista Escritorio */}
        {!isMobile && (
          <Card className="rounded-2xl border border-border/50 shadow-sm bg-card dark:bg-slate-900 overflow-hidden">
            <CardContent className="p-0">
              <div className="hidden md:block">
                  <DataTable 
                    columns={columns} 
                    data={socios} 
                    isLoading={loading}
                    manualPagination={true}
                    pageCount={Math.ceil(totalCount / pagination.pageSize)}
                    pagination={pagination}
                    onPaginationChange={setPagination}
                    rowClassName={(row) => {
                      const socio = row.original as any;
                      if (socio.is_payment_observed) return "bg-red-50/60 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100/50";
                      if (socio.isObservado) return "bg-amber-50/60 dark:bg-amber-500/10 dark:text-amber-400 hover:bg-amber-100/50";
                      return "";
                    }}
                  />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vista Móvil */}
        {isMobile && (
          <div className="md:hidden space-y-4">
          {mobileData.length ? (
            <>
              {mobileData.map((socio: any) => {
                return (
                  <Card 
                    key={socio.id} 
                    className={cn(
                      "w-full border shadow-sm rounded-2xl overflow-hidden transition-colors",
                      socio.is_payment_observed ? "bg-red-50/60 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" :
                      socio.isObservado ? "bg-amber-50/60 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" :
                      "bg-card dark:bg-slate-900 border-border/50"
                    )}
                  >
                    <div className="p-5 space-y-3">
                      {/* Header: Nombre + Estado */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground/70">DNI {socio.dni}</span>
                          <h3 className="text-base font-black text-foreground uppercase leading-tight mt-0.5 truncate">
                            {socio.nombres} {socio.apellidoPaterno} {socio.apellidoMaterno}
                          </h3>
                        </div>
                        <Badge className={cn(
                          "font-black border px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider shrink-0",
                          socio.status === 'Activo' ? "bg-emerald-100 text-emerald-700" : 
                          socio.status === 'Inactivo' ? "bg-amber-100 text-amber-700" : 
                          socio.status === 'Retirado' ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"
                        )}>
                          {socio.status}
                        </Badge>
                      </div>

                      {/* Info Grid: Localidad, Mz/Lt, Recibo */}
                      <div className="grid grid-cols-3 gap-3 py-3 border-y border-border/50">
                        <div>
                          <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest mb-0.5">Comunidad</p>
                          <p className="text-xs font-bold text-foreground/80 uppercase truncate">{socio.localidad || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest mb-0.5">Ubicación</p>
                          <p className="text-xs font-bold text-foreground/80">Mz {socio.mz || '-'} Lt {socio.lote || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest mb-0.5">Recibo</p>
                          <p className={cn(
                            "text-xs font-bold font-mono",
                            socio.lastTransactionType?.toLowerCase().includes('anulacion') ? "text-red-400 line-through" : "text-blue-600"
                          )}>{socio.receiptNumber}</p>
                          <p className="text-[8px] text-muted-foreground/70 uppercase font-black truncate">{socio.lastTransactionType || ''}</p>
                        </div>
                      </div>

                      {/* Observaciones */}
                      {(socio as any).isObservado && (socio as any).observacion && (
                        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 rounded-xl px-3 py-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] font-black text-amber-600 uppercase">Observación</p>
                            <p className="text-xs text-amber-700 font-medium leading-tight">{(socio as any).observacion}</p>
                          </div>
                        </div>
                      )}
                      {(socio as any).is_payment_observed && (socio as any).payment_observation_detail && (
                        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-500/10 dark:text-red-400 border border-red-200 rounded-xl px-3 py-2">
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
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-4000/10 dark:text-emerald-400 dark:border-emerald-500/20" 
                                : "bg-red-50 text-red-400 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:bg-red-50 dark:bg-red-500/10 dark:text-red-4000/10 dark:text-red-400 dark:border-red-500/20 opacity-50"
                            )}
                          >
                            {d.name}
                          </div>
                        ))}
                      </div>

                      {/* Acciones */}
                      <div className="flex justify-end gap-2 pt-1">
                        <Button variant="outline" size="sm" className="h-9 rounded-xl font-bold border-border/50 text-blue-600 text-xs" onClick={() => { setSocioToEdit(socio); setIsEditDialogOpen(true); }}>
                          <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-border/50 text-red-400" onClick={() => { setSocioToDelete(socio); setIsDeleteDialogOpen(true); }}>
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
                    <span className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">Cargando más socios...</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Has llegado al final</span>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20 bg-card dark:bg-slate-900 rounded-2xl border border-dashed border-border">
              <p className="text-muted-foreground/70 font-bold">No se encontraron socios</p>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Diálogos */}
      <Dialog open={isRegistrationDialogOpen} onOpenChange={setIsRegistrationDialogOpen}>
        <DialogContent className="max-w-2xl bg-card dark:bg-slate-900 border-none rounded-2xl p-0 overflow-hidden">
          <SocioTitularRegistrationForm onClose={() => setIsRegistrationDialogOpen(false)} onSuccess={() => setIsRegistrationDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-card dark:bg-slate-900 border-none rounded-[2rem]">
          <ExportSociosDialog onClose={() => setIsExportDialogOpen(false)} data={socios} />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl bg-card dark:bg-slate-900 border-none rounded-2xl p-0 overflow-hidden">
          {socioToEdit && <SocioTitularRegistrationForm socioId={socioToEdit.id} onClose={() => setIsEditDialogOpen(false)} onSuccess={() => setIsEditDialogOpen(false)} />}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog 
        isOpen={isDeleteDialogOpen} 
        onClose={() => setIsDeleteDialogOpen(false)} 
        onConfirm={async () => {
          if (!socioToDelete) return;
          setIsDeleting(true);
          try {
            // Se usa deleteMutation con la tabla base real para beneficiarse del Optimistic UI
            await deleteMutation.mutateAsync({ tableName: 'socio_titulares', id: socioToDelete.id, isSoftDelete: false });
            setIsDeleteDialogOpen(false);
          } catch (e: any) {
            toast.error('Error al eliminar: ' + e.message);
          } finally {
            setIsDeleting(false);
          }
        }} 
        title="Eliminar Socio" 
        description="¿Estás seguro de eliminar este registro? Esta acción es irreversible."
        isConfirming={isDeleting}
      />
    </div>
  );
}

export default People;
