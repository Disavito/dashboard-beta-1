import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Loader2, Package, Plus, ArrowDownToLine, ArrowUpFromLine,
  History, Box, Trash2, UserCheck, ClipboardList,
  Download, FileSpreadsheet, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToExcel, exportToCSV } from '@/lib/exportUtils';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  fetchInventoryItems, fetchAssignments, fetchActiveAssignments,
  fetchColaboradores, addInventoryItem, checkoutEquipment,
  returnEquipment, returnAllByColaborador, deleteInventoryItem,
  InventoryItem, InventoryAssignment
} from '@/lib/api/inventoryApi';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser } from '@/context/UserContext';
import { cn } from '@/lib/utils';
// ── Tipo local para el formulario de salida multi-ítem ──
interface CheckoutRow {
  item_id: string;
  quantity: number;
}

export default function InventoryPage() {
  // ── State ─────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [allAssignments, setAllAssignments] = useState<InventoryAssignment[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<InventoryAssignment[]>([]);
  const [colaboradores, setColaboradores] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // ── Permisos ──────────────────────────────────────────
  const { roles, customPermissions } = useUser();
  const isAdmin = useMemo(() => roles?.some(r => r.toLowerCase() === 'admin') ?? false, [roles]);
  
  // Verificar si el usuario actual es admin O tiene el permiso personalizado
  const canEdit = useMemo(() => {
    return isAdmin || !!customPermissions?.can_manage_inventory;
  }, [isAdmin, customPermissions]);

  // Add Item Modal
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newQty, setNewQty] = useState('1');

  // Checkout Modal (Salida de Campo)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutColabId, setCheckoutColabId] = useState('');
  const [checkoutRows, setCheckoutRows] = useState<CheckoutRow[]>([{ item_id: '', quantity: 1 }]);
  const [checkoutNotes, setCheckoutNotes] = useState('');

  // Return All Modal
  const [isReturnAllOpen, setIsReturnAllOpen] = useState(false);
  const [returnAllColabId, setReturnAllColabId] = useState('');

  // Pagination for History
  const [historyPage, setHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * ITEMS_PER_PAGE;
    return allAssignments.slice(start, start + ITEMS_PER_PAGE);
  }, [allAssignments, historyPage]);
  const totalHistoryPages = Math.ceil(allAssignments.length / ITEMS_PER_PAGE);

  // ── Data Loading ──────────────────────────────────────
  const loadData = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const [_items, _all, _active, _colabs] = await Promise.all([
        fetchInventoryItems(),
        fetchAssignments(),
        fetchActiveAssignments(),
        fetchColaboradores()
      ]);
      setItems(_items);
      setAllAssignments(_all);
      setActiveAssignments(_active);
      setColaboradores(_colabs);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cargar inventario');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(true); }, [loadData]);

  // ── Suscribirse a cambios en tiempo real ───────────────
  useEffect(() => {
    const channel = supabase
      .channel('inventory-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items' },
        () => {
          loadData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_assignments' },
        () => {
          loadData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // ── Agrupar activos por colaborador ───────────────────
  const activeByColab = activeAssignments.reduce<Record<string, { name: string; items: InventoryAssignment[] }>>((acc, a) => {
    const colab = a.colaboradores;
    const colabName = colab ? `${colab.name} ${colab.apellidos || ''}`.trim() : 'Desconocido';
    if (!acc[a.colaborador_id]) {
      acc[a.colaborador_id] = { name: colabName, items: [] };
    }
    acc[a.colaborador_id].items.push(a);
    return acc;
  }, {});

  // ── Handlers ──────────────────────────────────────────
  const handleAddItem = async () => {
    const qty = parseInt(newQty);
    if (!newName.trim() || qty <= 0) return toast.error('Nombre y cantidad válidos son requeridos');
    try {
      setSaving(true);
      await addInventoryItem({ name: newName.trim(), description: newDesc.trim() || undefined, total_quantity: qty });
      toast.success(`"${newName}" añadido al catálogo`);
      setIsAddItemOpen(false);
      setNewName(''); setNewDesc(''); setNewQty('1');
      loadData(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear equipo');
    } finally { setSaving(false); }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (!confirm(`¿Eliminar "${item.name}" del catálogo?`)) return;
    try {
      await deleteInventoryItem(item.id);
      toast.success('Equipo eliminado');
      loadData(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    }
  };

  const handleCheckout = async () => {
    if (!checkoutColabId) return toast.error('Selecciona un colaborador');
    const validRows = checkoutRows.filter(r => r.item_id && r.quantity > 0);
    if (validRows.length === 0) return toast.error('Agrega al menos un equipo');
    
    // Guardar estado previo (Optimistic Update)
    const previousActive = [...activeAssignments];
    const previousItems = [...items];

    // Actualización Optimista
    const colab = colaboradores.find(c => c.id === checkoutColabId);
    const tempAssignments: any[] = validRows.map(r => {
      const item = items.find(i => i.id === r.item_id);
      return {
        id: `temp-${Math.random()}`,
        item_id: r.item_id,
        colaborador_id: checkoutColabId,
        quantity: r.quantity,
        assigned_at: new Date().toISOString(),
        status: 'Asignado',
        inventory_items: item ? { name: item.name } : null,
        colaboradores: colab ? { name: colab.name, apellidos: '' } : null,
      };
    });

    setActiveAssignments(prev => [...prev, ...tempAssignments]);
    setItems(prev => prev.map(item => {
      const row = validRows.find(r => r.item_id === item.id);
      if (row) {
        return { ...item, available_quantity: item.available_quantity - row.quantity };
      }
      return item;
    }));

    setIsCheckoutOpen(false); // Cerrar de inmediato
    const colabName = colab?.name || '';
    toast.success(`Salida registrada para ${colabName}`);

    try {
      await checkoutEquipment(validRows.map(r => ({
        item_id: r.item_id,
        colaborador_id: checkoutColabId,
        quantity: r.quantity,
        notes: checkoutNotes
      })));
      setCheckoutColabId(''); setCheckoutRows([{ item_id: '', quantity: 1 }]); setCheckoutNotes('');
      loadData(false);
    } catch (error) {
      // Rollback
      setActiveAssignments(previousActive);
      setItems(previousItems);
      toast.error(error instanceof Error ? error.message : 'Error al registrar salida');
    }
  };

  const handleReturnSingle = async (a: InventoryAssignment) => {
    // Guardar estados previos para revertir en caso de error (Optimistic Update)
    const previousActive = [...activeAssignments];
    const previousItems = [...items];

    // Actualizar optimísticamente la UI
    setActiveAssignments(prev => prev.filter(item => item.id !== a.id));
    setItems(prev => prev.map(item => {
      if (item.id === a.item_id) {
        return {
          ...item,
          available_quantity: item.available_quantity + a.quantity
        };
      }
      return item;
    }));

    try {
      await returnEquipment(a.id, a.item_id, a.quantity);
      toast.success(`${a.inventory_items?.name || 'Equipo'} devuelto`);
      loadData(false);
    } catch (error) {
      // Revertir en caso de fallo
      setActiveAssignments(previousActive);
      setItems(previousItems);
      toast.error(error instanceof Error ? error.message : 'Error al devolver');
    }
  };

  const handleReturnAll = async () => {
    if (!returnAllColabId) return toast.error('Selecciona un colaborador');
    
    // Obtener asignaciones activas de este colaborador
    const colabAssignments = activeAssignments.filter(a => a.colaborador_id === returnAllColabId);
    if (colabAssignments.length === 0) return toast.info('Este colaborador no tiene equipos pendientes');

    // Guardar estados previos para revertir en caso de error (Optimistic Update)
    const previousActive = [...activeAssignments];
    const previousItems = [...items];

    // Actualizar optimísticamente la UI
    setActiveAssignments(prev => prev.filter(a => a.colaborador_id !== returnAllColabId));
    setItems(prev => prev.map(item => {
      const returnedForThisItem = colabAssignments
        .filter(a => a.item_id === item.id)
        .reduce((sum, a) => sum + a.quantity, 0);
      if (returnedForThisItem > 0) {
        return {
          ...item,
          available_quantity: item.available_quantity + returnedForThisItem
        };
      }
      return item;
    }));

    try {
      setSaving(true);
      const count = await returnAllByColaborador(returnAllColabId);
      toast.success(`${count} equipo(s) devueltos con éxito`);
      setIsReturnAllOpen(false);
      setReturnAllColabId('');
      loadData(false);
    } catch (error) {
      // Revertir en caso de fallo
      setActiveAssignments(previousActive);
      setItems(previousItems);
      toast.error(error instanceof Error ? error.message : 'Error al devolver');
    } finally { setSaving(false); }
  };

  const addCheckoutRow = () => setCheckoutRows(prev => [...prev, { item_id: '', quantity: 1 }]);
  const updateCheckoutRow = (index: number, field: keyof CheckoutRow, value: string | number) => {
    setCheckoutRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };
  const removeCheckoutRow = (index: number) => {
    if (checkoutRows.length <= 1) return;
    setCheckoutRows(prev => prev.filter((_, i) => i !== index));
  };

  // ── Configuracion de Columnas AG Grid ─────────────────
  const historyColumnDefs: any[] = useMemo(() => [
    { 
      headerName: "Equipo", 
      field: "inventory_items.name", 
      flex: 1, 
      filter: true 
    },
    { 
      headerName: "Ingeniero", 
      valueGetter: (params: any) => {
        const colab = params.data?.colaboradores;
        return colab ? `${colab.name} ${colab.apellidos || ''}`.trim() : '—';
      },
      flex: 1,
      filter: true
    },
    { field: "quantity", headerName: "Cant.", width: 100 },
    { 
      headerName: "Salida", 
      valueGetter: (params: any) => params.data?.assigned_at ? format(new Date(params.data.assigned_at), "d MMM yy, HH:mm", { locale: es }) : '—',
      width: 150
    },
    { 
      headerName: "Retorno", 
      valueGetter: (params: any) => {
        if (params.data?.status === 'Devuelto' && params.data?.returned_at) {
          return format(new Date(params.data.returned_at), "d MMM yy, HH:mm", { locale: es });
        }
        return '—';
      },
      width: 150
    },
    { 
      field: "status", 
      headerName: "Estado", 
      width: 150, 
      filter: true,
      cellRenderer: (params: any) => {
        return params.value === 'Devuelto' 
          ? <span className="text-emerald-600 font-black border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-widest">Devuelto</span>
          : <span className="text-amber-600 font-black border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-widest">En Uso</span>;
      }
    }
  ], []);

  // ── Render ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const totalEnUso = activeAssignments.length;
  const ingenierosEnCampo = Object.keys(activeByColab).length;

  return (
    <div className="min-h-screen bg-background page-enter pb-10">
      <div className="w-full bg-card dark:bg-slate-900 border-b border-border/50 py-12 px-8 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-foreground tracking-tight uppercase">Inventario de Campo</h1>
                <p className="text-muted-foreground font-medium mt-1">
                  Registro de entrada y salida de equipos para ingenieros en salidas a campo.
                </p>
              </div>
            </div>
        <div className="flex flex-wrap gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 px-4 rounded-xl border-border text-muted-foreground font-bold shadow-sm hover:bg-muted/50 gap-2">
                <Download className="w-4 h-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
              <DropdownMenuItem
                className="gap-2 font-medium cursor-pointer"
                onClick={() => {
                  const headers = ['Nombre', 'Descripción', 'Stock Total', 'Disponible', 'En Uso'];
                  const rows = items.map(item => [
                    item.name || '',
                    item.description || '',
                    item.total_quantity,
                    item.available_quantity,
                    item.total_quantity - item.available_quantity,
                  ]);
                  exportToExcel({ filePrefix: 'inventario', headers, rows });
                }}
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Exportar Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 font-medium cursor-pointer"
                onClick={() => {
                  const headers = ['Nombre', 'Descripción', 'Stock Total', 'Disponible', 'En Uso'];
                  const rows = items.map(item => [
                    item.name || '',
                    item.description || '',
                    item.total_quantity,
                    item.available_quantity,
                    item.total_quantity - item.available_quantity,
                  ]);
                  exportToCSV({ filePrefix: 'inventario', headers, rows });
                }}
              >
                <FileText className="h-4 w-4 text-blue-600" />
                Exportar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canEdit && (
            <>
              <Button onClick={() => setIsAddItemOpen(true)} variant="outline" className="h-11 px-4 rounded-xl border-border shadow-sm text-muted-foreground font-bold hover:bg-muted/50 gap-2">
                <Plus className="w-4 h-4" /> Nuevo Equipo
              </Button>
              <Button onClick={() => setIsReturnAllOpen(true)} variant="outline" className="h-11 px-4 rounded-xl border-border shadow-sm text-muted-foreground font-bold hover:bg-muted/50 gap-2">
                <ArrowDownToLine className="w-4 h-4" /> Recepción Total
              </Button>
              <Button onClick={() => setIsCheckoutOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-11 px-6 shadow-sm transition-all flex items-center gap-2">
                <ArrowUpFromLine className="w-4 h-4" /> Registrar Salida
              </Button>
            </>
          )}
          </div>
        </div>
      </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6 px-4 md:px-8">
      {/* ── Stats rápidos ───────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="rounded-2xl border-border/50 shadow-glass">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-black text-foreground/90">{items.length}</p>
            <p className="text-xs font-bold text-muted-foreground/70 uppercase mt-1">Tipos de Equipo</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 shadow-glass">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-black text-green-500">{items.reduce((s, i) => s + i.available_quantity, 0)}</p>
            <p className="text-xs font-bold text-muted-foreground/70 uppercase mt-1">Disponibles</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 shadow-glass">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-black text-amber-500">{totalEnUso}</p>
            <p className="text-xs font-bold text-muted-foreground/70 uppercase mt-1">En Uso</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 shadow-glass">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-black text-primary">{ingenierosEnCampo}</p>
            <p className="text-xs font-bold text-muted-foreground/70 uppercase mt-1">Ingenieros en Campo</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ────────────────────────────────────── */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="bg-card dark:bg-slate-900/80 backdrop-blur-md border border-border p-1.5 rounded-2xl h-14 shadow-sm mb-6 flex overflow-x-auto max-w-full scrollbar-none shrink-0 justify-start sm:justify-center">
          <TabsTrigger value="active" className="rounded-xl px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-muted-foreground transition-all">
            <UserCheck className="w-4 h-4 mr-2" /> Equipos en Campo
          </TabsTrigger>
          <TabsTrigger value="catalog" className="rounded-xl px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-muted-foreground transition-all">
            <Box className="w-4 h-4 mr-2" /> Catálogo
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-muted-foreground transition-all">
            <History className="w-4 h-4 mr-2" /> Historial
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: Equipos en Campo (por ingeniero) ── */}
        <TabsContent value="active" className="mt-4">
          {Object.keys(activeByColab).length === 0 ? (
            <div className="py-20 text-center bg-card dark:bg-slate-900 rounded-2xl border border-dashed border-border">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground/80">Sin equipos en campo</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                Todos los equipos están en almacén. Usa "Registrar Salida" cuando un ingeniero vaya a campo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(activeByColab).map(([colabId, { name, items: colabItems }]) => (
                <Card key={colabId} className="rounded-2xl border border-border/50 shadow-glass overflow-hidden">
                  <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-sky-50/30 dark:from-slate-800/80 dark:to-slate-900/50 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-black text-foreground/90 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCheck className="w-4 h-4 text-primary" />
                        </div>
                        {name}
                      </CardTitle>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold">
                        {colabItems.length} equipo(s)
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-gray-50">
                      {colabItems.map(a => (
                        <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/50/50 transition-colors">
                          <div>
                            <p className="font-bold text-sm text-foreground/80">{a.inventory_items?.name || 'Equipo'}</p>
                            <p className="text-xs text-muted-foreground/70">
                              Cant: {a.quantity} · Salida: {format(new Date(a.assigned_at), "d MMM", { locale: es })}
                            </p>
                          </div>
                          {canEdit && (
                            <Button
                              size="sm"
                              onClick={() => handleReturnSingle(a)}
                              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-8 text-xs"
                            >
                              <ArrowDownToLine className="w-3 h-3 mr-1" /> Devolver
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── TAB: Catálogo de Equipos ──────────────── */}
        <TabsContent value="catalog" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => {
              const inUse = item.total_quantity - item.available_quantity;
              const pct = item.total_quantity > 0 ? (item.available_quantity / item.total_quantity) * 100 : 0;
              return (
                <Card key={item.id} className="rounded-2xl border border-border/50 shadow-glass overflow-hidden group relative">
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 dark:bg-red-500/10 dark:text-red-400 text-slate-300 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <CardHeader className="pb-3 border-b border-border/50 bg-muted/50/50">
                    <CardTitle className="text-base font-bold text-foreground/90">{item.name}</CardTitle>
                    {item.description && <CardDescription className="line-clamp-1 text-xs">{item.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex justify-between text-center">
                      <div>
                        <p className="text-2xl font-black text-foreground/90">{item.total_quantity}</p>
                        <p className="text-[10px] font-bold text-muted-foreground/70 uppercase">Total</p>
                      </div>
                      <div className="h-10 w-px bg-muted" />
                      <div>
                        <p className={`text-2xl font-black ${item.available_quantity > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {item.available_quantity}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground/70 uppercase">Disponible</p>
                      </div>
                      <div className="h-10 w-px bg-muted" />
                      <div>
                        <p className="text-2xl font-black text-amber-500">{inUse}</p>
                        <p className="text-[10px] font-bold text-muted-foreground/70 uppercase">En Uso</p>
                      </div>
                    </div>
                    {/* Barra de progreso */}
                    <div className="w-full bg-muted rounded-full h-2">
                       <div className="h-2 rounded-full bg-gradient-to-r from-primary to-[#3C9384] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {items.length === 0 && (
              <div className="col-span-full py-20 text-center bg-card dark:bg-slate-900 rounded-2xl border border-dashed border-border">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground/80">Catálogo Vacío</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                  Agrega los equipos de campo (cascos, chalecos, GPS, etc.) para empezar a controlar entradas y salidas.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── TAB: Historial ───────────────────────── */}
        <TabsContent value="history" className="mt-4">
          {/* Vista Desktop: Tabla Golden UI */}
          <Card className="hidden md:block rounded-2xl border border-border/50 shadow-premium overflow-hidden">
             <div className="w-full">
              <Table>
                <TableHeader className="bg-muted/50/50">
                  <TableRow className="border-border/50">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Equipo</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Ingeniero</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground text-center">Cant.</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Salida</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Retorno</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedHistory.length > 0 ? (
                    paginatedHistory.map(item => {
                      const colab = item.colaboradores;
                      const colabName = colab ? `${colab.name} ${colab.apellidos || ''}`.trim() : '—';
                      return (
                        <TableRow key={item.id} className="hover:bg-muted/50/50 transition-colors border-border/50">
                          <TableCell className="font-bold text-sm">{item.inventory_items?.name || '—'}</TableCell>
                          <TableCell className="font-medium text-xs text-muted-foreground">{colabName}</TableCell>
                          <TableCell className="text-center font-mono font-bold text-xs">{item.quantity}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-medium">
                            {item.assigned_at ? format(new Date(item.assigned_at), "d MMM yy, HH:mm", { locale: es }) : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-medium">
                            {item.status === 'Devuelto' && item.returned_at ? format(new Date(item.returned_at), "d MMM yy, HH:mm", { locale: es }) : '—'}
                          </TableCell>
                          <TableCell>
                            {item.status === 'Devuelto' ? (
                              <span className="text-emerald-600 font-black border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-widest">
                                Devuelto
                              </span>
                            ) : (
                              <span className="text-amber-600 font-black border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-widest">
                                En Uso
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center">
                          <ClipboardList className="h-8 w-8 mb-2 opacity-20" />
                          <span className="text-xs font-bold uppercase tracking-widest opacity-50">Aún no hay movimientos de inventario registrados</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {totalHistoryPages > 1 && (
                <div className="p-4 border-t border-border/50 flex items-center justify-between bg-muted/20">
                  <span className="text-xs font-medium text-muted-foreground">
                    Mostrando {((historyPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(historyPage * ITEMS_PER_PAGE, allAssignments.length)} de {allAssignments.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg" 
                      onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-bold px-2">
                      {historyPage} / {totalHistoryPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg" 
                      onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                      disabled={historyPage === totalHistoryPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Vista Móvil: Tarjetas optimizadas */}
          <div className="md:hidden space-y-4">
            {allAssignments.length === 0 ? (
              <div className="py-20 text-center bg-card dark:bg-slate-900 rounded-2xl border border-dashed border-border">
                <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground/80">Historial vacío</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mt-2">Aún no hay movimientos de inventario registrados.</p>
              </div>
            ) : (
              allAssignments.map(a => {
                const colab = a.colaboradores;
                const colabName = colab ? `${colab.name} ${colab.apellidos || ''}`.trim() : '—';
                const formattedSalida = a.assigned_at ? format(new Date(a.assigned_at), "d MMM yyyy, HH:mm", { locale: es }) : '—';
                const formattedRetorno = (a.status === 'Devuelto' && a.returned_at) ? format(new Date(a.returned_at), "d MMM yyyy, HH:mm", { locale: es }) : '—';
                return (
                  <Card key={a.id} className="rounded-2xl border border-border/50 shadow-sm p-4 space-y-3 bg-card dark:bg-slate-900">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-foreground/90 text-sm">{a.inventory_items?.name || 'Equipo'}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">Asignado a: {colabName}</p>
                      </div>
                      <Badge className={cn(
                        "font-bold text-[10px] px-2 py-0.5 border-none",
                        a.status === 'Devuelto' ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                      )}>
                        {a.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs border-t border-slate-50 pt-2.5">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground/70 uppercase">Cantidad</p>
                        <p className="font-bold text-foreground/80 mt-0.5">{a.quantity}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold text-muted-foreground/70 uppercase">Fecha Salida</p>
                        <p className="text-foreground/80 font-medium mt-0.5">{formattedSalida}</p>
                      </div>
                    </div>
                    {a.status === 'Devuelto' && (
                      <div className="text-xs border-t border-slate-50 pt-2.5">
                        <p className="text-[10px] font-bold text-muted-foreground/70 uppercase">Fecha Retorno</p>
                        <p className="text-foreground/80 font-medium mt-0.5">{formattedRetorno}</p>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════════ */}
      {/* MODALES                                          */}
      {/* ════════════════════════════════════════════════ */}

      {/* ── Modal: Nuevo Equipo ─────────────────────── */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-6 border-none shadow-premium">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Nuevo Equipo</DialogTitle>
            <DialogDescription>Añade un recurso al catálogo de equipos de campo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/80">Nombre</label>
              <Input placeholder="Ej. Casco de Seguridad" value={newName} onChange={e => setNewName(e.target.value)}
                className="rounded-xl bg-muted/50 border-border focus-visible:ring-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/80">Descripción (Opcional)</label>
              <Input placeholder="Color, talla, marca..." value={newDesc} onChange={e => setNewDesc(e.target.value)}
                className="rounded-xl bg-muted/50 border-border focus-visible:ring-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/80">Stock Inicial</label>
              <Input type="number" min="1" value={newQty} onChange={e => setNewQty(e.target.value)}
                className="rounded-xl bg-muted/50 border-border focus-visible:ring-primary" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddItemOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleAddItem} disabled={saving} className="bg-primary hover:bg-primary/90 text-white rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Registrar Salida a Campo ─────────── */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[560px] rounded-3xl p-6 border-none shadow-premium max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Registrar Salida a Campo</DialogTitle>
            <DialogDescription>Selecciona al ingeniero y los equipos que se lleva.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            {/* Selección de Ingeniero */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/80">Ingeniero / Colaborador</label>
              <Select onValueChange={setCheckoutColabId} value={checkoutColabId}>
                <SelectTrigger className="rounded-xl bg-muted/50 border-border focus:ring-primary">
                  <SelectValue placeholder="¿Quién sale a campo?" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-60">
                  {colaboradores.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lista de Equipos */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground/80">Equipos que se lleva</label>
              {checkoutRows.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select onValueChange={v => updateCheckoutRow(index, 'item_id', v)} value={row.item_id}>
                    <SelectTrigger className="rounded-xl bg-muted/50 border-border focus:ring-primary flex-1">
                      <SelectValue placeholder="Seleccionar equipo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {items.map(item => (
                        <SelectItem key={item.id} value={item.id} disabled={item.available_quantity <= 0}>
                          {item.name} ({item.available_quantity} disp.)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" min="1" value={row.quantity}
                    onChange={e => updateCheckoutRow(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-20 rounded-xl bg-muted/50 border-border focus-visible:ring-primary text-center"
                  />
                  {checkoutRows.length > 1 && (
                    <Button size="icon" variant="ghost" onClick={() => removeCheckoutRow(index)} className="h-9 w-9 text-muted-foreground/70 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addCheckoutRow} className="rounded-xl border-dashed w-full text-muted-foreground">
                <Plus className="w-4 h-4 mr-2" /> Agregar otro equipo
              </Button>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/80">Observaciones (Opcional)</label>
              <Input placeholder="Ej. Salida a Zona Norte, proyecto ABC..." value={checkoutNotes}
                onChange={e => setCheckoutNotes(e.target.value)}
                className="rounded-xl bg-muted/50 border-border focus-visible:ring-primary" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCheckoutOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCheckout} disabled={saving} className="bg-primary hover:bg-primary/90 text-white rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Salida'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Recepción Total ──────────────────── */}
      <Dialog open={isReturnAllOpen} onOpenChange={setIsReturnAllOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-6 border-none shadow-premium">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Recepción Total</DialogTitle>
            <DialogDescription>Devuelve todos los equipos que un ingeniero tiene en campo de una sola vez.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/80">Ingeniero que regresa</label>
              <Select onValueChange={setReturnAllColabId} value={returnAllColabId}>
                <SelectTrigger className="rounded-xl bg-muted/50 border-border focus:ring-primary">
                  <SelectValue placeholder="Seleccionar colaborador" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-60">
                  {Object.entries(activeByColab).map(([colabId, { name, items: ci }]) => (
                    <SelectItem key={colabId} value={colabId}>
                      {name} ({ci.length} equipo(s))
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {returnAllColabId && activeByColab[returnAllColabId] && (
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-muted-foreground/70 uppercase">Equipos a devolver:</p>
                {activeByColab[returnAllColabId].items.map(a => (
                  <div key={a.id} className="flex justify-between text-sm">
                    <span className="text-foreground/80 font-medium">{a.inventory_items?.name}</span>
                    <span className="text-muted-foreground">×{a.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsReturnAllOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleReturnAll} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Devolución'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
