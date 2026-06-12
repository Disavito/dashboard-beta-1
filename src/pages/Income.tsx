import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO, isValid } from 'date-fns';
import { PlusCircle, Edit, Loader2, Search, FilterX, Trash2, Calendar as CalendarIcon, Hash, User, MapPin, AlertCircle, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui-custom/DataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToExcel, exportToCSV } from '@/lib/exportUtils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import LocalidadCombobox from '@/components/custom/LocalidadCombobox';
import DistritoCombobox from '@/components/custom/DistritoCombobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Ingreso as IngresoType } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { useUser } from '@/context/UserContext';
import { useDebounce } from 'use-debounce';
import TransactionForm from '@/components/custom/TransactionForm';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';
import SavedFilters from '@/components/ui-custom/SavedFilters';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function Income() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch] = useDebounce(searchInput, 300);
  const [selectedLocalidadFilter, setSelectedLocalidadFilter] = useState<string>('all');
  const [selectedDistritoFilter, setSelectedDistritoFilter] = useState<string>('all');

  const serverFilters: Record<string, any> = {};
  if (selectedLocalidadFilter !== 'all') {
    serverFilters['socio_titulares.localidad'] = selectedLocalidadFilter;
  }
  if (selectedDistritoFilter !== 'all') {
    serverFilters['socio_titulares.distritoVivienda'] = selectedDistritoFilter;
  }

  const { data: incomeData, totalCount, loading, deleteRecord } = useSupabaseData<IngresoType>({
    tableName: 'ingresos',
    selectQuery: '*, socio_titulares!inner(localidad, distritoVivienda, is_payment_observed, payment_observation_detail)',
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    searchQuery: debouncedSearch,
    searchColumns: ['full_name', 'dni', 'receipt_number'],
    initialFilters: serverFilters
  });
  
  const { roles, customPermissions, loading: userLoading } = useUser();
  const canManageFinances = useMemo(() => 
    roles?.includes('admin') || roles?.includes('finanzas_senior') || !!customPermissions?.can_manage_finances || !!customPermissions?.can_view_income, 
  [roles, customPermissions]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<IngresoType | null>(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<IngresoType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [mobileVisibleCount, setMobileVisibleCount] = useState(10);
  const observerTarget = useRef<HTMLDivElement>(null);
  
  const isMobile = useMediaQuery('(max-width: 768px)');

  const currentFilters = useMemo(() => ({
    search: searchInput,
    localidad: selectedLocalidadFilter,
    distrito: selectedDistritoFilter,
  }), [searchInput, selectedLocalidadFilter, selectedDistritoFilter]);

  const handleApplyFilter = useCallback((filters: Record<string, any>) => {
    setSearchInput(filters.search ?? '');
    setSelectedLocalidadFilter(filters.localidad ?? 'all');
    setSelectedDistritoFilter(filters.distrito ?? 'all');
  }, []);

  const filteredData = incomeData;

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setSelectedIncome(null);
  };

  const handleEdit = (income: IngresoType) => {
    setSelectedIncome(income);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedIncome(null);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (income: IngresoType) => {
    setIncomeToDelete(income);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async (reason?: string) => {
    if (!incomeToDelete) return;
    setIsDeleting(true);
    try {
      const extraPayload = reason ? { reason } : undefined;
      await deleteRecord(incomeToDelete.id, extraPayload);
      toast.success('Registro eliminado correctamente');
    } catch (error) {
      toast.error('Error al eliminar: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setIncomeToDelete(null);
    }
  };

  useEffect(() => {
    setMobileVisibleCount(10);
  }, [searchInput, selectedLocalidadFilter, selectedDistritoFilter]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && mobileVisibleCount < filteredData.length) {
          setMobileVisibleCount((prev) => prev + 10);
        }
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [mobileVisibleCount, filteredData.length]);

  const mobileData = useMemo(() => filteredData.slice(0, mobileVisibleCount), [filteredData, mobileVisibleCount]);

  const incomeColumns: ColumnDef<IngresoType>[] = useMemo(() => [
    {
      accessorKey: 'date',
      header: 'Fecha',
      cell: ({ row }) => {
        const dateValue = parseISO(row.getValue('date'));
        return isValid(dateValue) ? format(dateValue, 'dd/MM/yyyy') : 'Fecha inválida';
      },
    },
    {
      accessorKey: 'receipt_number',
      header: 'Nº Recibo',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-foreground/80">{row.getValue('receipt_number')}</span>
          {/* Referencia corregida a socio_titulares */}
          {row.original.socio_titulares?.is_payment_observed && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="h-4 w-4 text-amber-500 animate-pulse" />
                </TooltipTrigger>
                <TooltipContent className="bg-amber-50 border-amber-200 text-amber-900 p-3 rounded-xl shadow-premium max-w-xs">
                  <p className="font-black text-[10px] uppercase tracking-widest mb-1">Socio Observado</p>
                  <p className="text-xs font-medium">{row.original.socio_titulares?.payment_observation_detail || 'Sin detalle de observación'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'full_name',
      header: 'Socio',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold uppercase text-xs text-foreground">{row.getValue('full_name')}</span>
          <span className="text-[10px] text-muted-foreground font-medium">{row.original.socio_titulares?.localidad || 'Sin localidad'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'dni',
      header: 'DNI',
      cell: ({ row }) => <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">{row.getValue('dni')}</span>,
    },
    {
      accessorKey: 'numeroOperacion',
      header: 'Operación',
      cell: ({ row }) => <span className="text-xs font-medium text-muted-foreground">{row.getValue('numeroOperacion') || '-'}</span>,
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">Monto</div>,
      cell: ({ row }) => {
        const amount = row.getValue('amount') as number;
        return (
          <div className={cn("text-right font-bold", amount >= 0 ? 'text-emerald-600' : 'text-red-600')}>
            {formatCurrency(amount)}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (!canManageFinances) return null;
        return (
          <div className="flex items-center justify-end gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-corp-teal hover:text-corp-dark hover:bg-corp-teal/10 transition-colors"
            onClick={() => handleEdit(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => handleDeleteClick(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        );
      },
    },
  ], [canManageFinances]);

  if (loading || userLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-12 w-12 text-corp-blue" />
          <p className="text-muted-foreground font-medium animate-pulse">Cargando registros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] p-4 md:p-8 page-enter">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">Ingresos</h1>
            <p className="text-muted-foreground font-medium">Gestión y búsqueda avanzada de pagos</p>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 px-4 rounded-xl border-border text-muted-foreground font-bold shadow-sm hover:bg-muted/50 gap-2"
                >
                  <Download className="h-4 w-4" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                <DropdownMenuItem
                  className="gap-2 font-medium cursor-pointer"
                  onClick={() => {
                    const headers = ['Fecha', 'Socio', 'DNI', 'Monto', 'Operación', 'Nº Recibo'];
                    const rows = filteredData.map(r => [
                      r.date ? format(parseISO(r.date), 'dd/MM/yyyy') : '',
                      r.full_name || '',
                      r.dni || '',
                      r.amount,
                      r.numeroOperacion || '',
                      r.receipt_number || '',
                    ]);
                    exportToExcel({ filePrefix: 'ingresos', headers, rows });
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Exportar Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 font-medium cursor-pointer"
                  onClick={() => {
                    const headers = ['Fecha', 'Socio', 'DNI', 'Monto', 'Operación', 'Nº Recibo'];
                    const rows = filteredData.map(r => [
                      r.date ? format(parseISO(r.date), 'dd/MM/yyyy') : '',
                      r.full_name || '',
                      r.dni || '',
                      r.amount,
                      r.numeroOperacion || '',
                      r.receipt_number || '',
                    ]);
                    exportToCSV({ filePrefix: 'ingresos', headers, rows });
                  }}
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  Exportar CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canManageFinances && (
              <Button 
                onClick={handleNew}
                className="bg-[#4892CC] hover:bg-[#3C8B93] text-white h-12 px-6 rounded-xl font-bold shadow-lg shadow-sky-100 transition-all active:scale-95 flex items-center gap-2"
              >
                <PlusCircle className="h-5 w-5" /> Nuevo Registro
              </Button>
            )}
          </div>
        </header>

        <Card className="border border-border/50 shadow-sm bg-card dark:bg-slate-900 rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                <Input
                  placeholder="Busca por nombre, DNI, recibo u operación..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-12 h-14 bg-muted/50 border-none rounded-2xl focus:ring-2 focus:ring-corp-blue/20 text-foreground/80 font-medium placeholder:text-muted-foreground/70"
                />
                {searchInput && (
                  <button 
                    onClick={() => setSearchInput('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground"
                  >
                    <FilterX className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              <LocalidadCombobox
                value={selectedLocalidadFilter}
                onValueChange={setSelectedLocalidadFilter}
                triggerClassName="w-full lg:w-[280px] h-14"
                distritoFilter={selectedDistritoFilter}
              />

              <DistritoCombobox
                value={selectedDistritoFilter}
                onValueChange={setSelectedDistritoFilter}
                triggerClassName="w-full lg:w-[280px] h-14"
              />

              <SavedFilters
                pageKey="income"
                currentFilters={currentFilters}
                onApplyFilter={handleApplyFilter}
              />
            </div>

            {/* Vista Escritorio */}
            {!isMobile && (
              <div className="hidden md:block rounded-xl border border-border/50 overflow-hidden">
                <DataTable
                  columns={incomeColumns}
                  data={filteredData}
                  isLoading={loading}
                  manualPagination={true}
                  pageCount={Math.ceil(totalCount / pagination.pageSize)}
                  pagination={pagination}
                  onPaginationChange={setPagination}
                />
              </div>
            )}
            
            {/* Vista Móvil */}
            {isMobile && (
              <div className="grid gap-4 md:hidden">
                {mobileData.length > 0 ? (
                  <>
                  {mobileData.map((income) => {
                  const incomeDate = parseISO(income.date);
                  const isObserved = income.socio_titulares?.is_payment_observed;
                  return (
                  <Card key={income.id} className={cn(
                    "border-none shadow-md bg-card dark:bg-slate-900 rounded-2xl overflow-hidden",
                    isObserved && "ring-2 ring-amber-400 ring-inset"
                  )}>
                    <div className={cn(
                      "p-4 border-b border-border/50 flex justify-between items-center",
                      isObserved ? "bg-amber-50" : "bg-muted/50/50"
                    )}>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-corp-blue" />
                        <span className="text-xs font-bold text-muted-foreground">
                          {isValid(incomeDate) ? format(incomeDate, 'dd/MM/yyyy') : 'Fecha inválida'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isObserved && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] font-black uppercase">
                            Socio Observado
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-card dark:bg-slate-900 font-mono text-corp-blue border-corp-blue/20">
                          <Hash className="h-3 w-3 mr-1" /> {income.receipt_number}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground/70">
                          <User className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Socio Titular</span>
                        </div>
                        <p className="font-black text-foreground uppercase leading-tight">{income.full_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground border-none">
                            DNI: {income.dni}
                          </Badge>
                          {income.socio_titulares?.localidad && (
                            <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-medium">
                              <MapPin className="h-3 w-3" /> {income.socio_titulares.localidad}
                            </div>
                          )}
                        </div>
                      </div>

                      {isObserved && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Detalle de Observación</p>
                          <p className="text-xs font-medium text-amber-900">{income.socio_titulares?.payment_observation_detail}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground/70 uppercase">Operación</span>
                          <p className="text-xs font-mono font-bold text-muted-foreground">{income.numeroOperacion || '-'}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground/70 uppercase">Monto</span>
                          <p className={cn(
                            "text-lg font-black",
                            income.amount >= 0 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {formatCurrency(income.amount)}
                          </p>
                        </div>
                      </div>

                      {canManageFinances && (
                        <div className="pt-4 flex gap-2 border-t border-slate-50">
                          <Button 
                            variant="outline" 
                            className="flex-1 h-10 rounded-xl border-corp-teal/20 text-corp-teal hover:bg-corp-teal/10 hover:text-corp-dark font-bold text-xs"
                            onClick={() => handleEdit(income)}
                          >
                            <Edit className="h-3.5 w-3.5 mr-2" /> Editar
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1 h-10 rounded-xl border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold text-xs"
                            onClick={() => handleDeleteClick(income)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
                })}
                <div ref={observerTarget} className="py-8 flex justify-center">
                  {mobileVisibleCount < filteredData.length ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-[#4892CC]" />
                      <span className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">Cargando más registros...</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Has llegado al final</span>
                  )}
                </div>
                </>
              ) : (
                <div className="text-center py-12 bg-muted/50 rounded-2xl border-2 border-dashed border-border">
                  <p className="text-muted-foreground/70 font-bold">No se encontraron ingresos</p>
                </div>
              )}
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setSelectedIncome(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card dark:bg-slate-900 rounded-2xl border border-border/50 shadow-premium">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground uppercase tracking-tight">
              {selectedIncome ? 'Editar Transacción' : 'Registrar Nueva Transacción'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              {selectedIncome ? 'Modifique los datos del registro seleccionado.' : 'Complete los datos para registrar un ingreso, gasto o devolución.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <TransactionForm 
              initialData={selectedIncome || undefined}
              onClose={() => {
                setIsDialogOpen(false);
                setSelectedIncome(null);
              }} 
              onSuccess={handleSuccess} 
            />
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Registro"
        description="¿Estás seguro de que deseas eliminar este registro de ingreso? Esta acción no se puede deshacer."
        isConfirming={isDeleting}
        variant="destructive"
        showReasonInput={true}
        reasonPlaceholder="Escribe el motivo de la eliminación del ingreso..."
        confirmButtonText="Eliminar"
      />
    </div>
  );
}

export default Income;
