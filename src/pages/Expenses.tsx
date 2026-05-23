import { useState, useEffect, useMemo, useRef } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO, isValid, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, Edit, CalendarIcon, Search, Trash2, Hash, Tag, FileText, Loader2, TrendingDown, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui-custom/DataTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Gasto as GastoType, Cuenta } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { formatCurrency, cn } from '@/lib/utils';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { DateMaskInput } from '@/components/ui/date-mask-input';
import { useUser } from '@/context/UserContext';
import { useDebounce } from 'use-debounce';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { offlineSync } from '@/lib/offlineSync';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
const expenseFormSchema = z.object({
  amount: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ required_error: 'El monto es requerido.' }).positive('El monto debe ser positivo.')
  ),
  account: z.string().min(1, 'La cuenta es requerida.'),
  date: z.date({
    required_error: "La fecha es requerida",
    invalid_type_error: "Fecha inválida",
  }),
  category: z.string().min(1, 'La categoría es requerida.'),
  sub_category: z.string().optional().nullable(),
  description: z.string().min(1, 'La descripción es requerida.').max(255),
  numero_gasto: z.string().optional().nullable(),
  colaborador_id: z.string().uuid().optional().nullable(),
  is_declaracion_jurada: z.boolean().default(false).optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const MAIN_EXPENSE_CATEGORIES = [
  { value: 'Gasto Fijo', label: 'Gasto Fijo' },
  { value: 'Viáticos', label: 'Viáticos' },
  { value: 'Otros', label: 'Otros' },
];

const GASTOS_FIJOS_SUB_CATEGORIES = [
  { value: 'internet', label: 'Internet' },
  { value: 'servidor', label: 'Servidor' },
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'agua_mantenimiento', label: 'Agua/Mantenimiento' },
  { value: 'luz', label: 'Luz' },
  { value: 'sueldo', label: 'Sueldo' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'afp', label: 'AFP' },
  { value: 'contador', label: 'Contador' },
];

const VIATICOS_SUB_CATEGORIES = [
  { value: 'tecnicos', label: 'Técnicos' },
  { value: 'proyecto', label: 'Proyecto' },
  { value: 'representantes', label: 'Representantes' },
  { value: 'ocasional', label: 'Ocasional' },
];

const generateNextNumeroGasto = (expenses: GastoType[]): string => {
  let maxNumber = 0;
  expenses.forEach(expense => {
    if (expense.numero_gasto?.startsWith('GA')) {
      const numPart = parseInt(expense.numero_gasto.substring(2), 10);
      if (!isNaN(numPart) && numPart > maxNumber) maxNumber = numPart;
    }
  });
  return `GA${String(maxNumber + 1).padStart(3, '0')}`;
};

export default function Expenses() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch] = useDebounce(searchInput, 300);

  const { roles, customPermissions, user } = useUser();
  const canManageFinances = useMemo(() => 
    roles?.includes('admin') || roles?.includes('finanzas_senior') || !!customPermissions?.can_manage_finances || !!customPermissions?.can_view_expenses, 
  [roles, customPermissions]);
  
  const checkRole = (roleName: string) => roles?.some(r => r.toLowerCase().includes(roleName.toLowerCase()));

  const isEngineerAndNotAdmin = useMemo(() => 
    !!((checkRole('ingenier') || checkRole('engin') || checkRole('engen')) && !checkRole('admin') && !checkRole('finanzas_senior')),
    [roles]
  );

  const canAddExpense = canManageFinances || isEngineerAndNotAdmin;

  // Filtro de servidor para que ingenieros solo vean sus gastos aprobados
  const serverFilters = useMemo(() => {
    const filters: Record<string, any> = {};
    if (isEngineerAndNotAdmin && user?.id) {
      filters['colaborador_id'] = user.id;
    }
    return filters;
  }, [isEngineerAndNotAdmin, user?.id]);

  const { data: expenseData, totalCount, loading, addRecord, updateRecord, deleteRecord } = useSupabaseData<GastoType>({
    tableName: 'gastos',
    initialSort: { column: 'date', ascending: false },
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    searchQuery: debouncedSearch,
    searchColumns: ['description', 'category', 'sub_category', 'numero_gasto'],
    initialFilters: serverFilters
  });

  const { data: accountsRaw } = useSupabaseData<Cuenta>({ tableName: 'cuentas' });
  const accountsData = accountsRaw.length > 0 ? accountsRaw : [
    { id: 'offline-1', name: 'Efectivo' } as Cuenta,
    { id: 'offline-2', name: 'BBVA Empresa' } as Cuenta,
    { id: 'offline-3', name: 'Cuenta Fidel' } as Cuenta
  ];

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GastoType | null>(null);
  const [dateInput, setDateInput] = useState('');

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [dataToConfirm, setDataToConfirm] = useState<ExpenseFormValues | null>(null);
  const [isConfirmingSubmission, setIsConfirmingSubmission] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Cargar solicitudes pendientes si es ingeniero
  useEffect(() => {
    const fetchPending = async () => {
      if (isEngineerAndNotAdmin && user?.id) {
        const { supabase } = await import('@/lib/supabaseClient');
        const { data, error } = await supabase
          .from('approval_requests')
          .select('*')
          .eq('requested_by', user.id)
          .eq('request_type', 'engineer_expense')
          .in('status', ['pending', 'rejected'])
          .order('created_at', { ascending: false });
        if (!error && data) {
          setPendingRequests(data);
        }
      }
    };
    fetchPending();
  }, [isEngineerAndNotAdmin, user?.id, isConfirmDialogOpen]); // Refresh on close dialog

  // Infinite scroll para móvil
  const [mobileVisibleCount, setMobileVisibleCount] = useState(10);
  const observerTarget = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: 0,
      account: '',
      date: new Date(),
      category: '',
      sub_category: null,
      description: '',
      numero_gasto: null,
      colaborador_id: null,
    },
  });

  const watchedDate = form.watch('date');
  const watchedCategory = form.watch('category');

  useEffect(() => {
    if (watchedDate && isValid(watchedDate)) {
      const formatted = format(watchedDate, 'dd/MM/yyyy');
      if (formatted !== dateInput) {
        setDateInput(formatted);
      }
    }
  }, [watchedDate, dateInput]);

  const handleMaskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDateInput(val);
    if (val.length === 10) {
      const parsedDate = parse(val, 'dd/MM/yyyy', new Date());
      if (isValid(parsedDate)) {
        form.setValue('date', parsedDate, { shouldValidate: true });
      }
    }
  };

  // Reset mobile count al cambiar filtros
  useEffect(() => {
    setMobileVisibleCount(10);
  }, [searchInput]);

  // IntersectionObserver para móvil
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && mobileVisibleCount < expenseData.length) {
          setMobileVisibleCount((prev) => prev + 10);
        }
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [mobileVisibleCount, expenseData.length]);

  const handleOpenDialog = (expense?: GastoType) => {
    setEditingExpense(expense || null);
    if (expense) {
      const parsedDate = parseISO(expense.date);
      form.reset({
        amount: Math.abs(expense.amount),
        account: expense.account || '',
        date: parsedDate,
        category: expense.category || '',
        sub_category: expense.sub_category || null,
        description: expense.description || '',
        numero_gasto: expense.numero_gasto || null,
        colaborador_id: expense.colaborador_id || null,
        is_declaracion_jurada: (expense as any).is_declaracion_jurada || false,
      });
      setReceiptFile(null);
      setDateInput(format(parsedDate, 'dd/MM/yyyy'));
    } else {
      const today = new Date();
      form.reset({
        amount: 0,
        account: '',
        date: today,
        category: '',
        sub_category: null,
        description: '',
        numero_gasto: generateNextNumeroGasto(expenseData),
        colaborador_id: null,
        is_declaracion_jurada: false,
      });
      setReceiptFile(null);
      setDateInput(format(today, 'dd/MM/yyyy'));
    }
    setIsDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!dataToConfirm) return;
    setIsConfirmingSubmission(true);
    try {
      const amountToStore = -Math.abs(dataToConfirm.amount);
      const payload = {
        ...dataToConfirm,
        amount: amountToStore,
        date: format(dataToConfirm.date, 'yyyy-MM-dd')
      };

      payload.colaborador_id = user?.id || null;
      const isAdminOrFinanzas = checkRole('admin') || checkRole('finanzas_senior');

      if (!navigator.onLine) {
        await offlineSync.addJob({
          id: crypto.randomUUID(),
          type: isAdminOrFinanzas ? 'direct_expense' : 'expense_approval',
          payload: isAdminOrFinanzas ? payload : {
            requested_by: user?.id,
            request_type: 'expense_approval',
            payload: payload,
            status: 'pending'
          },
          file: receiptFile || undefined,
          fileName: receiptFile?.name
        });
        toast.success('Guardado offline. Se sincronizará automáticamente al conectar.');
        setIsDialogOpen(false);
        setIsConfirmDialogOpen(false);
      } else {
        let fileUrl = null;
        if (receiptFile) {
          const filePath = `receipts/${Date.now()}_${receiptFile.name}`;
          const { supabase } = await import('@/lib/supabaseClient');
          const { error: uploadError } = await supabase.storage.from('documentos').upload(filePath, receiptFile);
          if (uploadError) {
             toast.error('Error subiendo comprobante', { description: uploadError.message });
             throw uploadError;
          }
          const { data: publicUrlData } = supabase.storage.from('documentos').getPublicUrl(filePath);
          fileUrl = publicUrlData.publicUrl;
          (payload as any).receipt_url = fileUrl;
        }

        if (editingExpense) {
          await updateRecord(editingExpense.id, payload);
          toast.success('Gasto actualizado');
        } else {
          if (isAdminOrFinanzas) {
            await addRecord(payload);
            toast.success('Gasto añadido directamente');
          } else {
            const { supabase } = await import('@/lib/supabaseClient');
            const { error } = await supabase.from('approval_requests').insert({
              requested_by: user?.id,
              request_type: 'expense_approval',
              payload: payload,
              status: 'pending'
            });
            if (error) throw error;
            toast.success('Gasto enviado para aprobación.');
          }
        }
        setIsDialogOpen(false);
        setIsConfirmDialogOpen(false);
      }
    } catch (err) {
      toast.error('Error: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setIsConfirmingSubmission(false);
    }
  };

  // Estado para eliminar con diálogo de confirmación
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);

  const handleDeleteClick = (id: number) => {
    setDeletingExpenseId(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteExpense = async () => {
    if (deletingExpenseId === null) return;
    setIsDeletingExpense(true);
    await deleteRecord(deletingExpenseId);
    setIsDeletingExpense(false);
    setIsDeleteConfirmOpen(false);
    setDeletingExpenseId(null);
  };

  const columns: ColumnDef<GastoType>[] = useMemo(() => {
    const cols: ColumnDef<GastoType>[] = [
      {
        accessorKey: 'date',
        header: 'Fecha',
        cell: ({ row }) => format(parseISO(row.getValue('date')), 'dd/MM/yyyy'),
      },
      {
        accessorKey: 'numero_gasto',
        header: 'Nº Gasto',
        cell: ({ row }) => <span className="font-bold text-slate-700">{row.getValue('numero_gasto') || 'N/A'}</span>,
      },
      {
        accessorKey: 'description',
        header: 'Descripción',
        cell: ({ row }) => <span className="font-medium text-slate-600">{row.getValue('description')}</span>,
      },
      {
        accessorKey: 'category',
        header: 'Categoría',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-slate-400">{row.getValue('category')}</span>
            <span className="text-xs font-semibold text-corp-blue">{row.original.sub_category || '-'}</span>
          </div>
        ),
      },
      {
        accessorKey: 'amount',
        header: () => <div className="text-right">Monto</div>,
        cell: ({ row }) => (
          <div className="text-right font-bold text-red-600">
            {formatCurrency(row.getValue('amount'))}
          </div>
        ),
      },
    ];

    if (canManageFinances) {
      cols.push({
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => {
          const expense = row.original;
          return (
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenDialog(expense)}
                className="h-8 w-8 p-0 text-corp-teal hover:text-corp-dark hover:bg-corp-teal/10"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteClick(expense.id)}
                className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      });
    }

    return cols;
  }, [canManageFinances]);

  const mobileData = expenseData.slice(0, mobileVisibleCount);

  return (
    <div className="p-4 md:p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500 rounded-2xl shadow-lg shadow-red-500/20">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
                Gastos
              </h1>
              <p className="text-slate-500 font-medium text-sm">
                Registro y control de egresos
              </p>
            </div>
          </div>
          {canAddExpense && (
            <Button 
              onClick={() => {
                form.reset({
                  amount: 0,
                  account: '',
                  date: new Date(),
                  category: '',
                  sub_category: null,
                  description: '',
                  numero_gasto: generateNextNumeroGasto(expenseData),
                  colaborador_id: user?.id || null,
                });
                setEditingExpense(null);
                setIsDialogOpen(true);
              }}
              className="bg-corp-teal hover:bg-corp-dark text-white font-bold rounded-xl shadow-lg shadow-corp-teal/20 h-12 px-6"
            >
              <PlusCircle className="mr-2 h-5 w-5" /> Nuevo Gasto
            </Button>
          )}
        </header>

        {isEngineerAndNotAdmin && pendingRequests.length > 0 && (
          <Card className="border border-amber-200 bg-amber-50/50 shadow-sm rounded-3xl overflow-hidden mb-6">
            <CardHeader className="border-b border-amber-100 bg-amber-100/50 p-4">
              <CardTitle className="text-sm font-black uppercase text-amber-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" /> Mis Solicitudes Pendientes / Rechazadas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-amber-100">
                {pendingRequests.map(req => (
                  <div key={req.id} className="p-4 flex items-center justify-between hover:bg-amber-100/30 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold text-amber-900">{req.payload?.description || 'Sin descripción'}</span>
                      <span className="text-xs text-amber-700/80 font-medium">
                        {req.payload?.category} • {format(parseISO(req.created_at), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-amber-900">
                        {formatCurrency(req.payload?.amount || 0)}
                      </span>
                      {req.status === 'pending' ? (
                        <Badge className="bg-amber-200 text-amber-800 border-none font-bold uppercase text-[10px]">Pendiente</Badge>
                      ) : (
                        <Badge className="bg-red-200 text-red-800 border-none font-bold uppercase text-[10px]">Rechazado</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white/50 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-lg font-black uppercase text-slate-800 flex items-center gap-2">
                <Database className="w-5 h-5 text-corp-teal" /> Historial de Gastos
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar gastos..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9 bg-slate-50 border-slate-200 focus:border-corp-teal focus:ring-corp-teal rounded-xl w-full md:w-64 h-10 font-medium"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {!isMobile && (
              <div className="hidden md:block">
                <DataTable
                  columns={columns}
                  data={expenseData}
                  isLoading={loading}
                  manualPagination={true}
                  pageCount={Math.ceil(totalCount / pagination.pageSize)}
                  pagination={pagination}
                  onPaginationChange={setPagination}
                />
              </div>
            )}

            {isMobile && (
              <div className="grid gap-4 md:hidden">
              {mobileData.length > 0 ? (
                <>
                {mobileData.map((expense) => (
                  <Card key={expense.id} className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
                    <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-corp-blue" />
                      <span className="text-xs font-bold text-slate-600">
                        {format(parseISO(expense.date), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <Badge variant="outline" className="bg-white font-mono text-corp-blue border-corp-blue/20">
                      <Hash className="h-3 w-3 mr-1" /> {expense.numero_gasto || 'N/A'}
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-400">
                        <FileText className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Descripción</span>
                      </div>
                      <p className="font-bold text-slate-700 leading-tight">{expense.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-corp-blue/10 text-corp-blue border-none text-[10px] font-bold uppercase">
                        <Tag className="h-3 w-3 mr-1" /> {expense.category}
                      </Badge>
                      {expense.sub_category && (
                        <Badge variant="outline" className="border-corp-blue/20 text-corp-blue text-[10px] font-bold uppercase">
                          {expense.sub_category}
                        </Badge>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Monto</span>
                        <p className="text-lg font-black text-red-600">
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>
                      {canManageFinances && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-10 w-10 rounded-xl border-corp-teal/20 text-corp-teal hover:bg-corp-teal/10"
                            onClick={() => handleOpenDialog(expense)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-10 w-10 rounded-xl border-red-100 text-red-500 hover:bg-red-50"
                            onClick={() => handleDeleteClick(expense.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div ref={observerTarget} className="py-8 flex justify-center">
                {mobileVisibleCount < expenseData.length ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-[#4892CC]" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargando más gastos...</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Has llegado al final</span>
                )}
              </div>
              </>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold">No se encontraron gastos</p>
              </div>
            )}
            </div>
            )}
          </CardContent>
        </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl border border-gray-100 shadow-premium">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase">{editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}</DialogTitle>
            <DialogDescription>Complete los detalles del egreso.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((vals) => { setDataToConfirm(vals); setIsConfirmDialogOpen(true); })} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} className="rounded-xl h-11" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <DateMaskInput
                          value={dateInput}
                          onChange={handleMaskChange}
                          className={cn(
                            "rounded-xl border-slate-200 h-11",
                            form.formState.errors.date && "border-error ring-1 ring-error/20"
                          )}
                        />
                      </FormControl>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="px-3 rounded-xl border-slate-200 h-11">
                            <CalendarIcon className="h-4 w-4 text-corp-blue" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(date);
                                setDateInput(format(date, 'dd/MM/yyyy'));
                              }
                            }}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="account" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuenta</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {accountsData.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={(val) => { field.onChange(val); form.setValue('sub_category', null); }} value={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Categoría" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {MAIN_EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {(watchedCategory === 'Gasto Fijo' || watchedCategory === 'Viáticos') && (
                  <FormField control={form.control} name="sub_category" render={({ field }) => (
                    <FormItem className="animate-in fade-in slide-in-from-left-2 duration-300">
                      <FormLabel>Subcategoría</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl><SelectTrigger className="rounded-xl h-11 border-corp-blue/20 bg-corp-blue/10/30"><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {(watchedCategory === 'Gasto Fijo' ? GASTOS_FIJOS_SUB_CATEGORIES : VIATICOS_SUB_CATEGORIES).map(s => (
                            <SelectItem key={s.value} value={s.label}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl><Textarea {...field} className="rounded-xl min-h-[80px]" placeholder="Detalle del gasto..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="space-y-3 p-4 bg-slate-50 border border-slate-100 rounded-xl mt-4">
                <FormField control={form.control} name="is_declaracion_jurada" render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-bold text-slate-700">Gasto sin comprobante (Declaración Jurada)</FormLabel>
                    </div>
                  </FormItem>
                )} />

                {!form.watch('is_declaracion_jurada') && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Comprobante de Pago (Opcional)</Label>
                    <Input 
                      type="file" 
                      accept="image/*,.pdf" 
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="bg-white"
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11">Cancelar</Button>
                <Button type="submit" className="bg-[#4892CC] hover:bg-[#3C8B93] rounded-xl h-11 px-8 font-bold">Guardar Gasto</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirmar Gasto"
        description="¿Desea guardar este registro de gasto?"
        data={dataToConfirm || {}}
        isConfirming={isConfirmingSubmission}
      />

      <ConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteExpense}
        title="Eliminar Gasto"
        description="¿Estás seguro de que quieres eliminar este gasto? Esta acción no se puede deshacer."
        isConfirming={isDeletingExpense}
      />
    </div>
  </div>
  );
}
