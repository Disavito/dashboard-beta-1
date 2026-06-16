import { useState, useEffect, useMemo, useRef } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO, isValid, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, Edit, CalendarIcon, Search, Trash2, Hash, Tag, FileText, Loader2, TrendingDown, Database, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui-custom/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToExcel, exportToCSV } from '@/lib/exportUtils';
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
import { updateMontoRendido } from '@/lib/api/presupuestosApi';
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
  presupuesto_id: z.string().uuid().optional().nullable(),
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

const fetchNextNumeroGasto = async (): Promise<string> => {
  try {
    const { supabase } = await import('@/lib/supabaseClient');
    
    // Intentar obtener el siguiente número llamando a la función RPC (SECURITY DEFINER)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_next_numero_gasto');
    if (!rpcError && rpcData) {
      return rpcData;
    }
    
    // Fallback: Si no se ha ejecutado el script SQL para la función RPC, usar la lógica local
    const { data: activeGastos, error: activeError } = await supabase
      .from('gastos')
      .select('numero_gasto');
    
    let maxNumber = 0;
    if (!activeError && activeGastos) {
      activeGastos.forEach(expense => {
        if (expense.numero_gasto?.startsWith('GA')) {
          const numPart = parseInt(expense.numero_gasto.substring(2), 10);
          if (!isNaN(numPart) && numPart > maxNumber) maxNumber = numPart;
        }
      });
    }

    const { data: pendingReqs, error: pendingError } = await supabase
      .from('approval_requests')
      .select('payload');

    if (!pendingError && pendingReqs) {
      pendingReqs.forEach(req => {
        const payload = req.payload as any;
        if (payload && payload.numero_gasto?.startsWith('GA')) {
          const numPart = parseInt(payload.numero_gasto.substring(2), 10);
          if (!isNaN(numPart) && numPart > maxNumber) maxNumber = numPart;
        }
      });
    }

    return `GA${String(maxNumber + 1).padStart(3, '0')}`;
  } catch (err) {
    console.error('Error fetching next gasto number:', err);
    return 'GA001';
  }
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



  // Permitir que cualquier usuario logueado pueda registrar un gasto o solicitar aprobación
  const canAddExpense = !!user;

  const [userColabId, setUserColabId] = useState<string | null>(null);

  useEffect(() => {
    if (!canManageFinances && user?.id) {
      const fetchColabId = async () => {
        const { supabase } = await import('@/lib/supabaseClient');
        const { data } = await supabase.from('colaboradores').select('id').eq('user_id', user.id).maybeSingle();
        if (data) {
          setUserColabId(data.id);
        } else {
          // Si no tiene colaborador asignado, usamos un ID inexistente para que no vea nada
          setUserColabId('not-found');
        }
      };
      fetchColabId();
    }
  }, [canManageFinances, user?.id]);

  // Filtro de servidor para que usuarios no financieros solo vean sus gastos
  const serverFilters = useMemo(() => {
    const filters: Record<string, any> = {};
    if (!canManageFinances) {
      // Si aún no ha cargado el colabId, prevenimos que traiga todos
      filters['colaborador_id'] = userColabId || 'pending-fetch';
    }
    return filters;
  }, [canManageFinances, userColabId]);

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

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GastoType | null>(null);
  const [editingRequest, setEditingRequest] = useState<any | null>(null);
  const [, setPendingRequests] = useState<any[]>([]);
  const [dateInput, setDateInput] = useState('');

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [dataToConfirm, setDataToConfirm] = useState<ExpenseFormValues | null>(null);
  const [isConfirmingSubmission, setIsConfirmingSubmission] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [activePresupuestos, setActivePresupuestos] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<Record<string, string>>({});

  // Cargar presupuestos activos y colaboradores
  useEffect(() => {
    const loadPresupuestosAndColaboradores = async () => {
      if (!user) return;
      try {
        const { supabase } = await import('@/lib/supabaseClient');
        
        let query = supabase
          .from('presupuestos_operativos')
          .select('id, motivo, colaborador_id, monto_aprobado, monto_rendido')
          .eq('estado', 'Aprobado');
        
        const isAdminOrFinanzas = roles?.some(r => ['admin', 'finanzas_senior', 'finanzas_junior'].includes(r.toLowerCase()));
        if (!isAdminOrFinanzas) {
          query = query.eq('colaborador_id', user.id);
        }
        
        const { data: presData } = await query;
        if (presData) {
          setActivePresupuestos(presData);
        }

        if (isAdminOrFinanzas) {
          const { data: colabsData } = await supabase
            .from('colaboradores')
            .select('user_id, name, apellidos');
          if (colabsData) {
            const map: Record<string, string> = {};
            colabsData.forEach(c => {
              if (c.user_id) {
                map[c.user_id] = `${c.name} ${c.apellidos}`.trim();
              }
            });
            setColaboradores(map);
          }
        }
      } catch (err) {
        console.error('Error al cargar datos de presupuestos/colaboradores:', err);
      }
    };

    loadPresupuestosAndColaboradores();
  }, [user, roles]);

  // Cargar solicitudes pendientes si es usuario no financiero
  useEffect(() => {
    const fetchPending = async () => {
      if (!canManageFinances && user?.id) {
        const { supabase } = await import('@/lib/supabaseClient');
        const { data, error } = await supabase
          .from('approval_requests')
          .select('*')
          .eq('requested_by', user.id)
          .in('request_type', ['engineer_expense', 'expense_approval'])
          .in('status', ['pending', 'rejected'])
          .order('created_at', { ascending: false });
        if (!error && data) {
          setPendingRequests(data);
        }
      }
    };
    fetchPending();
  }, [canManageFinances, user?.id, isConfirmDialogOpen]); // Refresh on close dialog

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
    setEditingRequest(null);
    if (expense) {
      const parsedDate = parseISO(expense.date);
      let desc = expense.description || '';
      
      const isDj = desc.startsWith('[Declaración Jurada]');
      if (isDj) desc = desc.replace('[Declaración Jurada]', '').trim();

      const receiptMatch = desc.match(/\n\nComprobante: (https?:\/\/[^\s]+)/);
      if (receiptMatch) {
        desc = desc.replace(receiptMatch[0], '').trim();
      }

      form.reset({
        amount: Math.abs(expense.amount),
        account: expense.account || '',
        date: parsedDate,
        category: expense.category || '',
        sub_category: expense.sub_category || null,
        description: desc,
        numero_gasto: expense.numero_gasto || null,
        colaborador_id: expense.colaborador_id || null,
        is_declaracion_jurada: isDj,
        presupuesto_id: (expense as any).presupuesto_id || null,
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
        numero_gasto: 'GA...',
        colaborador_id: user?.id || null,
        is_declaracion_jurada: false,
        presupuesto_id: null,
      });
      setReceiptFile(null);
      setDateInput(format(today, 'dd/MM/yyyy'));
      
      fetchNextNumeroGasto().then(nextNum => {
        form.setValue('numero_gasto', nextNum);
      });
    }
    setIsDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!dataToConfirm) return;
    setIsConfirmingSubmission(true);
    try {
      const amountToStore = -Math.abs(dataToConfirm.amount);
      const payload: any = {
        ...dataToConfirm,
        amount: amountToStore,
        date: format(dataToConfirm.date, 'yyyy-MM-dd')
      };

      if (payload.is_declaracion_jurada) {
        payload.description = `[Declaración Jurada] ${payload.description}`;
      }
      delete payload.is_declaracion_jurada;

      // Obtener el ID del colaborador (de la tabla 'colaboradores', no del Auth user.id)
      // para evitar violaciones de clave foránea en la tabla 'gastos'.
      let colabIdToStore = null;
      if (user?.id) {
        const { supabase } = await import('@/lib/supabaseClient');
        const { data: colabRecord } = await supabase
          .from('colaboradores')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (colabRecord) {
          colabIdToStore = colabRecord.id;
        }
      }
      payload.colaborador_id = colabIdToStore;


      const isAdminOrFinanzas = checkRole('admin') || checkRole('finanzas_senior');
      const isAutoApproved = dataToConfirm.category === 'Gasto Fijo' || dataToConfirm.sub_category === 'sueldo' || dataToConfirm.sub_category === 'Sueldo';
      const shouldDirectInsert = isAdminOrFinanzas || isAutoApproved;

      if (!navigator.onLine) {
        // Para offline, no podemos subir el archivo aún, 
        // pero podemos formatear la descripción asumiendo que se subirá luego
        // si hay receiptFile, el sync job se encarga de subirlo y agregarlo al payload
        await offlineSync.addJob({
          id: crypto.randomUUID(),
          type: shouldDirectInsert ? 'direct_expense' : 'expense_approval',
          payload: shouldDirectInsert ? payload : {
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
          
          // Inject URL directly into description instead of the unsupported receipt_url column
          payload.description = `${payload.description || ''}\n\nComprobante: ${fileUrl}`;
        }

        if (editingRequest) {
          const { supabase } = await import('@/lib/supabaseClient');
          const { error } = await supabase
            .from('approval_requests')
            .update({
              payload: payload,
              status: 'pending'
            })
            .eq('id', editingRequest.id);

          if (error) throw error;
          toast.success('Solicitud de gasto actualizada');
          
          const { data } = await supabase
            .from('approval_requests')
            .select('*')
            .eq('requested_by', user?.id)
            .in('request_type', ['engineer_expense', 'expense_approval'])
            .in('status', ['pending', 'rejected'])
            .order('created_at', { ascending: false });
          if (data) setPendingRequests(data);
          
          setEditingRequest(null);
        } else if (editingExpense) {
          const oldPresupuestoId = (editingExpense as any).presupuesto_id;
          const newPresupuestoId = payload.presupuesto_id;

          await updateRecord(editingExpense.id, payload);
          toast.success('Gasto actualizado');

          if (oldPresupuestoId) {
            await updateMontoRendido(oldPresupuestoId);
          }
          if (newPresupuestoId && newPresupuestoId !== oldPresupuestoId) {
            await updateMontoRendido(newPresupuestoId);
          }
        } else {
          if (shouldDirectInsert) {
            await addRecord(payload);
            toast.success(isAutoApproved && !isAdminOrFinanzas ? 'Gasto Fijo Auto-Aprobado' : 'Gasto añadido directamente');
            if (payload.presupuesto_id) {
              await updateMontoRendido(payload.presupuesto_id);
            }
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
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: oldExpense } = await supabase
        .from('gastos')
        .select('presupuesto_id')
        .eq('id', deletingExpenseId)
        .single();

      await deleteRecord(deletingExpenseId);

      if (oldExpense?.presupuesto_id) {
        await updateMontoRendido(oldExpense.presupuesto_id);
      }
    } catch (err) {
      console.error('Error al eliminar gasto y actualizar presupuesto:', err);
    } finally {
      setIsDeletingExpense(false);
      setIsDeleteConfirmOpen(false);
      setDeletingExpenseId(null);
    }
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
        cell: ({ row }) => <span className="font-bold text-foreground/80">{row.getValue('numero_gasto') || 'N/A'}</span>,
      },
      {
        accessorKey: 'description',
        header: 'Descripción',
        cell: ({ row }) => {
          const rawDesc = row.getValue('description') as string || '';
          let desc = rawDesc;
          
          const isDj = desc.startsWith('[Declaración Jurada]');
          if (isDj) desc = desc.replace('[Declaración Jurada]', '').trim();

          let receiptUrl = null;
          const receiptMatch = desc.match(/\n\nComprobante: (https?:\/\/[^\s]+)/);
          if (receiptMatch) {
            receiptUrl = receiptMatch[1];
            desc = desc.replace(receiptMatch[0], '').trim();
          }

          return (
            <div className="flex flex-col gap-1 items-start">
              <span className="font-medium text-muted-foreground">{desc}</span>
              <div className="flex gap-2 items-center">
                {isDj && <Badge variant="outline" className="w-fit text-[9px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">Declaración Jurada</Badge>}
                {receiptUrl && (
                  <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-[10px] flex items-center gap-1 text-corp-blue hover:underline bg-corp-blue/10 px-2 py-0.5 rounded-full font-bold">
                    <FileText className="w-3 h-3" /> Ver Comprobante
                  </a>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'category',
        header: 'Categoría',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-muted-foreground/70">{row.getValue('category')}</span>
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
                className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 dark:bg-red-500/10 dark:text-red-400"
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
    <div className="min-h-screen bg-background page-enter pb-10">
      <div className="w-full bg-card dark:bg-slate-900 border-b border-border/50 py-12 px-8 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#4892CC]/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <TrendingDown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-foreground tracking-tight uppercase">Gastos</h1>
                <p className="text-muted-foreground font-medium mt-1">Registro y control de egresos.</p>
              </div>
            </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 px-4 rounded-xl border-border text-muted-foreground font-bold shadow-sm hover:bg-muted/50 gap-2"
                >
                  <Download className="h-4 w-4" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                <DropdownMenuItem
                  className="gap-2 font-medium cursor-pointer"
                  onClick={() => {
                    const headers = ['Fecha', 'Nº Gasto', 'Categoría', 'Subcategoría', 'Monto', 'Cuenta', 'Descripción'];
                    const rows = expenseData.map(r => [
                      r.date ? format(parseISO(r.date), 'dd/MM/yyyy') : '',
                      r.numero_gasto || '',
                      r.category || '',
                      r.sub_category || '',
                      r.amount,
                      r.account || '',
                      (r.description || '').replace(/\n\nComprobante: https?:\/\/[^\s]+/, '').replace('[Declaración Jurada] ', ''),
                    ]);
                    exportToExcel({ filePrefix: 'gastos', headers, rows });
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Exportar Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 font-medium cursor-pointer"
                  onClick={() => {
                    const headers = ['Fecha', 'Nº Gasto', 'Categoría', 'Subcategoría', 'Monto', 'Cuenta', 'Descripción'];
                    const rows = expenseData.map(r => [
                      r.date ? format(parseISO(r.date), 'dd/MM/yyyy') : '',
                      r.numero_gasto || '',
                      r.category || '',
                      r.sub_category || '',
                      r.amount,
                      r.account || '',
                      (r.description || '').replace(/\n\nComprobante: https?:\/\/[^\s]+/, '').replace('[Declaración Jurada] ', ''),
                    ]);
                    exportToCSV({ filePrefix: 'gastos', headers, rows });
                  }}
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  Exportar CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canAddExpense && (
              <Button 
                onClick={() => handleOpenDialog()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-11 px-6 shadow-sm transition-all flex items-center gap-2"
              >
                <PlusCircle className="h-5 w-5" /> Nuevo Gasto
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6 px-4 md:px-8">

        <div className="bg-card dark:bg-slate-900 border border-border/50 rounded-2xl p-4 flex flex-col md:flex-row gap-4 shadow-sm items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="w-5 h-5 text-primary" />
            <span className="font-bold uppercase tracking-wider text-sm">Historial de Gastos</span>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
            <Input
              placeholder="Buscar gastos..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-12 h-11 bg-muted/50 border-transparent rounded-xl focus:bg-background focus:ring-2 focus:ring-primary/20 text-foreground/80 font-medium placeholder:text-muted-foreground/70 w-full"
            />
          </div>
        </div>

        <Card className="rounded-2xl border border-border/50 shadow-sm bg-card dark:bg-slate-900 overflow-hidden">
          <CardContent className="p-0">
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
                  <Card key={expense.id} className="border-none shadow-md bg-card dark:bg-slate-900 rounded-2xl overflow-hidden">
                    <div className="p-4 bg-muted/50/50 border-b border-border/50 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-corp-blue" />
                      <span className="text-xs font-bold text-muted-foreground">
                        {format(parseISO(expense.date), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <Badge variant="outline" className="bg-card dark:bg-slate-900 font-mono text-corp-blue border-corp-blue/20">
                      <Hash className="h-3 w-3 mr-1" /> {expense.numero_gasto || 'N/A'}
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground/70">
                        <FileText className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Descripción</span>
                      </div>
                      <p className="font-bold text-foreground/80 leading-tight">
                        {(() => {
                          let d = expense.description || '';
                          if (d.startsWith('[Declaración Jurada]')) d = d.replace('[Declaración Jurada]', '').trim();
                          const rm = d.match(/\n\nComprobante: (https?:\/\/[^\s]+)/);
                          if (rm) d = d.replace(rm[0], '').trim();
                          return d;
                        })()}
                      </p>
                      <div className="flex gap-2 items-center mt-1">
                        {(expense.description || '').startsWith('[Declaración Jurada]') && (
                          <Badge variant="outline" className="w-fit text-[9px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">Declaración Jurada</Badge>
                        )}
                        {(expense.description || '').match(/\n\nComprobante: (https?:\/\/[^\s]+)/) && (
                          <a href={(expense.description || '').match(/\n\nComprobante: (https?:\/\/[^\s]+)/)![1]} target="_blank" rel="noreferrer" className="text-[10px] flex items-center gap-1 text-corp-blue hover:underline bg-corp-blue/10 px-2 py-0.5 rounded-full font-bold w-fit">
                            <FileText className="w-3 h-3" /> Comprobante
                          </a>
                        )}
                      </div>
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
                        <span className="text-[10px] font-bold text-muted-foreground/70 uppercase">Monto</span>
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
                            className="h-10 w-10 rounded-xl border-red-100 text-red-500 hover:bg-red-50 dark:bg-red-500/10 dark:text-red-400"
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
                    <span className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">Cargando más gastos...</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Has llegado al final</span>
                )}
              </div>
              </>
            ) : (
              <div className="text-center py-12 bg-muted/50 rounded-2xl border-2 border-dashed border-border">
                <p className="text-muted-foreground/70 font-bold">No se encontraron gastos</p>
              </div>
            )}
            </div>
            )}
          </CardContent>
        </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card dark:bg-slate-900 rounded-2xl border border-border/50 shadow-premium">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground uppercase">{editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}</DialogTitle>
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
                            "rounded-xl border-border h-11",
                            form.formState.errors.date && "border-error ring-1 ring-error/20"
                          )}
                        />
                      </FormControl>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="px-3 rounded-xl border-border h-11">
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
                        {MAIN_EXPENSE_CATEGORIES
                          .filter(c => {
                            // "Gasto Fijo" solo visible para admin/finanzas
                            if (c.value === 'Gasto Fijo' && !canManageFinances) return false;
                            return true;
                          })
                          .map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
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

              {activePresupuestos.length > 0 && (
                <FormField control={form.control} name="presupuesto_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vincular a Presupuesto Operativo (Opcional)</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "none" ? null : val)} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="Ninguno" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Ninguno (Gasto general)</SelectItem>
                        {activePresupuestos.map(p => {
                          const name = colaboradores[p.colaborador_id] || '';
                          const label = `${p.motivo} ${name ? `(${name})` : ''} - Saldo: S/ ${(p.monto_aprobado - p.monto_rendido).toFixed(2)}`;
                          return (
                            <SelectItem key={p.id} value={p.id}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <div className="space-y-3 p-4 bg-muted/50 border border-border/50 rounded-xl mt-4">
                <FormField control={form.control} name="is_declaracion_jurada" render={({ field }) => (
                  <FormItem className="flex flex-col gap-3 space-y-0">
                    <div className="flex flex-row items-center gap-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-bold text-foreground/80">Gasto sin comprobante (Declaración Jurada)</FormLabel>
                      </div>
                    </div>
                    {field.value && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 rounded-lg border border-amber-200">
                        <p className="text-xs text-amber-800 leading-relaxed font-medium">
                          <strong>Advertencia:</strong> Al marcar esta opción, declaras bajo juramento que los fondos fueron utilizados estrictamente para los fines descritos y asumes total responsabilidad sobre la veracidad de este gasto ante cualquier auditoría.
                        </p>
                      </div>
                    )}
                  </FormItem>
                )} />

                {!form.watch('is_declaracion_jurada') && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Comprobante de Pago (Opcional)</Label>
                    <Input 
                      type="file" 
                      accept="image/*,.pdf" 
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="bg-card dark:bg-slate-900"
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
    </div>
  );
}
