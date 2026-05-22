import { useState, useMemo } from 'react';
import {
  Users,
  Activity,
  Briefcase,
  TrendingUp,
  Wallet,
  PieChart as PieChartIcon,
  Lock,
  AlertCircle,
  RefreshCcw,
  XCircle,
  UserCheck,
  UserMinus,
  Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Ingreso, Gasto, Colaborador, SocioTitular } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpecialTransactionsDialog } from '@/components/invoicing/SpecialTransactionsDialog';
import { cn, formatCurrency } from '@/lib/utils';
import {
  format,
  parseISO,
  getQuarter as dateFnsGetQuarter,
  getMonth,
  getYear,
  startOfMonth,
  isAfter,
  isValid // <--- Añadido: Importar isValid
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser } from '@/context/UserContext';

const getQuarter = (date: Date): string => {
  const quarter = dateFnsGetQuarter(date);
  const year = getYear(date);
  return `Q${quarter}-${year}`;
};

const getSemester = (date: Date): string => {
  const month = getMonth(date);
  const semester = month < 6 ? 1 : 2;
  const year = getYear(date);
  return `S${semester}-${year}`;
};

function Dashboard() {
  const { roles, loading: authLoading } = useUser();
  const [filterPeriodType, setFilterPeriodType] = useState<'month' | 'quarter' | 'semester' | 'all' | 'custom'>('month');
  const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isSpecialDialogOpen, setIsSpecialDialogOpen] = useState(false);
  const [specialDialogType, setSpecialDialogType] = useState<'annulled' | 'returned'>('annulled');

  const [previewAsEngineer, setPreviewAsEngineer] = useState(false);

  const isAdminOrFinanzas = useMemo(() => {
    if (previewAsEngineer) return false;
    if (!roles) return false;
    return roles.some(role => ['admin', 'finanzas'].includes(role.toLowerCase()));
  }, [roles, previewAsEngineer]);

  const { data: ingresos } = useSupabaseData<Ingreso>({ tableName: 'ingresos', selectQuery: 'id, date, amount, dni, receipt_number, transaction_type', fetchAll: true });
  const { data: gastos } = useSupabaseData<Gasto>({ tableName: 'gastos', selectQuery: 'id, date, amount', fetchAll: true });
  const { data: socios } = useSupabaseData<SocioTitular & { status?: string }>({ tableName: 'vw_socio_titulares_estado', selectQuery: 'id, dni, nombres, apellidoPaterno, mz, lote, status', fetchAll: true });
  const { data: ingresosLocalidad } = useSupabaseData<any>({ tableName: 'vw_ingresos_localidad', selectQuery: '*', fetchAll: true });
  const { data: colaboradores } = useSupabaseData<Colaborador>({ tableName: 'colaboradores', selectQuery: 'id, name, cargo' });

  const periodOptions = useMemo(() => {
    const dates = [...ingresos, ...gastos].map(i => parseISO(i.date)).filter(d => isValid(d));

    if (dates.length === 0) {
      return { months: [], quarters: [], semesters: [] };
    }

    const months = Array.from(new Set(dates.map(d => format(d, 'yyyy-MM')))).sort().reverse().map(m => ({ value: m, label: format(parseISO(`${m}-01`), 'MMMM yyyy', { locale: es }) }));
    const quarters = Array.from(new Set(dates.map(d => getQuarter(d)))).sort().reverse().map(q => ({ value: q, label: `Trimestre ${q.split('-')[0].replace('Q','')} - ${q.split('-')[1]}` }));
    const semesters = Array.from(new Set(dates.map(d => getSemester(d)))).sort().reverse().map(s => ({ value: s, label: `Semestre ${s.split('-')[0].replace('S','')} - ${s.split('-')[1]}` }));
    return { months, quarters, semesters };
  }, [ingresos, gastos]);

  const filteredData = useMemo(() => {
    const filterFn = (item: any) => {
      if (filterPeriodType === 'all' || !selectedPeriod && filterPeriodType !== 'custom') return true;
      const d = parseISO(item.date);
      if (!isValid(d)) return false;
      if (filterPeriodType === 'custom') {
        if (!dateRange?.from) return true;
        const isAfterFrom = d >= dateRange.from;
        const isBeforeTo = dateRange.to ? d <= dateRange.to : true;
        return isAfterFrom && isBeforeTo;
      }
      if (filterPeriodType === 'month') return format(d, 'yyyy-MM') === selectedPeriod;
      if (filterPeriodType === 'quarter') return getQuarter(d) === selectedPeriod;
      if (filterPeriodType === 'semester') return getSemester(d) === selectedPeriod;
      return true;
    };
    const fIngresos = ingresos.filter(filterFn);
    const fGastos = gastos.filter(filterFn);
    const totalI = fIngresos.reduce((sum, i) => sum + i.amount, 0);
    const totalG = Math.abs(fGastos.reduce((sum, g) => sum + g.amount, 0));
    return { totalIngresos: totalI, totalGastos: totalG, balance: totalI - totalG, ingresos: fIngresos, gastos: fGastos };
  }, [ingresos, gastos, filterPeriodType, selectedPeriod, dateRange]);

  const socioStats = useMemo(() => {
    const total = socios.length;
    const currentMonthStart = startOfMonth(new Date());
    const pagadosDnis = new Set(ingresos.filter(i => isValid(parseISO(i.date)) && isAfter(parseISO(i.date), currentMonthStart) && i.amount > 0).map(i => i.dni));
    const pagadosCount = socios.filter(s => pagadosDnis.has(s.dni)).length;
    
    const activosCount = socios.filter(s => s.status === 'Activo').length;
    const activosPorcentaje = total > 0 ? Math.round((activosCount / total) * 100) : 0;

    return { 
      total, 
      pagados: pagadosCount, 
      pendientes: total - pagadosCount, 
      porcentaje: total > 0 ? Math.round((pagadosCount / total) * 100) : 0,
      activosPorcentaje
    };
  }, [socios, ingresos]);

  const chartData = useMemo(() => {
    const monthly: Record<string, { ingresos: number; gastos: number }> = {};
    [...filteredData.ingresos, ...filteredData.gastos].forEach(item => {
      const parsedDate = parseISO(item.date);
      if (!isValid(parsedDate)) return;
      const key = format(parsedDate, 'MMM yy', { locale: es });
      if (!monthly[key]) monthly[key] = { ingresos: 0, gastos: 0 };
      if ('receipt_number' in item) monthly[key].ingresos += item.amount;
      else monthly[key].gastos += Math.abs(item.amount);
    });
    return Object.entries(monthly).map(([name, data]) => ({ name, ...data }));
  }, [filteredData]);

  const specialStats = useMemo(() => {
    const annulled = ingresos.filter(i => i.transaction_type === 'Anulacion').length;
    const returned = Math.abs(ingresos.filter(i => isValid(parseISO(i.date)) && i.transaction_type === 'Devolucion').reduce((s, i) => s + i.amount, 0));
    return { annulled, returned };
  }, [ingresos]);

  const localidadData = useMemo(() => {
    const map = new Map<string, number>();
    ingresosLocalidad.forEach((item: any) => {
      const d = parseISO(item.date || item.mes);
      if (filterPeriodType === 'custom' && dateRange?.from) {
        if (d < dateRange.from || (dateRange.to && d > dateRange.to)) return;
      }
      if (item.transaction_type === 'Ingreso') {
        const loc = item.localidad || 'Sin Localidad';
        map.set(loc, (map.get(loc) || 0) + Number(item.total_amount || item.amount));
      }
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [ingresosLocalidad, filterPeriodType, dateRange]);

  if (authLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FFFFFF]">
        <Loader2 className="w-12 h-12 text-[#4892CC] animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Cargando panel...</p>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-[#FAFBFC] min-h-screen page-enter">
      <header className="relative h-auto py-8 md:h-72 flex items-center overflow-hidden bg-white border-b border-slate-100/60">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4892CC]/[0.06] via-transparent to-corp-teal/[0.02] z-0"></div>
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
            <div>
              <Badge className="mb-3 bg-[#4892CC]/10 text-[#4892CC] border-none font-bold px-4 py-1 rounded-full text-[10px] md:text-xs">
                SISTEMA DE GESTIÓN V2025
              </Badge>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">
                Panel de <span className="text-[#4892CC]">Administración</span>
              </h1>
              <p className="text-gray-500 font-medium mt-2">
                {isAdminOrFinanzas
                  ? 'Consolidado completo de activos, equipo y flujo de caja.'
                  : 'Resumen de tareas, expedientes pendientes y herramientas asignadas.'}
              </p>
            </div>
              <div className="bg-white shadow-sm border border-gray-100 p-1.5 rounded-2xl flex items-center gap-2">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center cursor-pointer" onClick={() => setPreviewAsEngineer(!previewAsEngineer)} title="Click para simular vista">
                  <Activity className="text-emerald-500 w-5 h-5" />
                </div>
                <div className="pr-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{previewAsEngineer ? 'Simulando' : 'Estado'}</p>
                  <p className="text-sm font-black text-gray-900">{previewAsEngineer ? 'Vista Ing.' : 'En Línea'}</p>
                </div>
              </div>
            </div>
          </div>
      </header>

      <div className="container mx-auto px-4 md:px-8 -mt-6 md:-mt-10 relative z-20">
        <Tabs defaultValue="titulares" className="space-y-8">
          {isAdminOrFinanzas && (
            <div className="flex justify-center">
              <TabsList className="bg-white/80 backdrop-blur-xl border border-slate-200/60 p-1.5 rounded-2xl h-14 shadow-premium">
                <TabsTrigger value="titulares" className="rounded-xl px-8 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-corp-teal data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-gray-500 transition-all duration-300">
                  <Users className="w-4 h-4 mr-2" /> Titulares y Equipo
                </TabsTrigger>
                <TabsTrigger value="finanzas" className="rounded-xl px-8 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-corp-teal data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-gray-500 transition-all duration-300">
                  <Wallet className="w-4 h-4 mr-2" /> Finanzas y Balance
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          <TabsContent value="titulares" className="space-y-8 animate-fade-in-up">
            {isAdminOrFinanzas ? (
              <>
                <div className="grid gap-6 grid-cols-1 md:grid-cols-3 stagger-fade">
                  <Card className="rounded-2xl border border-gray-100 shadow-premium bg-white p-8 hover:shadow-premium-lg hover:scale-[1.02] transition-all duration-300">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-[#E8F1F8] rounded-2xl flex items-center justify-center"><Users className="text-[#4892CC] w-7 h-7" /></div>
                      <Badge className="bg-gray-100 text-gray-500 border-none font-bold">Total</Badge>
                    </div>
                    <h3 className="text-5xl font-black text-gray-900">{socioStats.total}</h3>
                    <p className="text-gray-400 font-bold text-sm uppercase tracking-wider mt-2">Socios Titulares</p>
                  </Card>

                  <Card className="rounded-2xl border border-gray-100 shadow-premium bg-white p-8 hover:shadow-premium-lg hover:scale-[1.02] transition-all duration-300">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center"><UserCheck className="text-emerald-500 w-7 h-7" /></div>
                      <Badge className="bg-emerald-100 text-emerald-600 border-none font-bold">{socioStats.porcentaje}%</Badge>
                    </div>
                    <h3 className="text-5xl font-black text-emerald-600">{socioStats.pagados}</h3>
                    <p className="text-gray-400 font-bold text-sm uppercase tracking-wider mt-2">Pagos Mes Actual</p>
                  </Card>

                  <Card className="rounded-2xl border border-gray-100 shadow-premium bg-white p-8 hover:shadow-premium-lg hover:scale-[1.02] transition-all duration-300">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center"><UserMinus className="text-amber-500 w-7 h-7" /></div>
                      <Badge className="bg-amber-100 text-amber-600 border-none font-bold">Pendiente</Badge>
                    </div>
                    <h3 className="text-5xl font-black text-amber-600">{socioStats.pendientes}</h3>
                    <p className="text-gray-400 font-bold text-sm uppercase tracking-wider mt-2">Por Regularizar</p>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center"><Briefcase className="text-[#4892CC] w-5 h-5" /></div>
                      <h2 className="text-2xl font-black text-gray-900">Equipo de Trabajo</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {colaboradores.slice(0, 4).map((colab, idx) => (
                        <div key={colab.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-[#4892CC]/30 hover:shadow-md transition-all duration-200" style={{ animationDelay: `${idx * 80}ms` }}>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-[#4892CC] group-hover:bg-[#E8F1F8] transition-colors duration-200">{colab.name.charAt(0)}</div>
                            <div>
                              <p className="font-black text-gray-900">{colab.name}</p>
                              <p className="text-xs text-gray-400 font-bold uppercase">{colab.cargo || 'Colaborador'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Card className="rounded-2xl border border-gray-100 shadow-premium bg-[#373435] p-8 text-white relative overflow-hidden">
                    <div className="relative z-10">
                      <PieChartIcon className="w-12 h-12 text-[#4892CC] mb-6" />
                      <h3 className="text-2xl font-black mb-2">Distribución</h3>
                      <p className="text-gray-400 font-medium mb-8">Participación de socios por comunidad.</p>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center"><span className="text-sm font-bold text-gray-300">Activos</span><span className="text-sm font-black">{socioStats.activosPorcentaje}%</span></div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#4892CC] to-corp-teal rounded-full transition-all duration-700" style={{ width: `${socioStats.activosPorcentaje}%` }} /></div>
                      </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#4892CC]/10 rounded-full blur-3xl" />
                  </Card>
                </div>
              </>
            ) : (
              <div className="space-y-8 mt-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                    <Briefcase className="text-[#4892CC] w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Tu Espacio de Trabajo</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="rounded-2xl border border-gray-100 shadow-sm p-5 bg-white">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Socios</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{socios.length}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Registrados en el padrón</p>
                  </Card>
                  <Card className="rounded-2xl border border-gray-100 shadow-sm p-5 bg-white">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Con Datos</p>
                    <p className="text-3xl font-black text-emerald-600 mt-1">{socios.filter(s => s.mz && s.lote).length}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Mz y Lote asignado</p>
                  </Card>
                  <Card className="rounded-2xl border border-amber-100 shadow-sm p-5 bg-amber-50/30">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Sin Mz</p>
                    <p className="text-3xl font-black text-amber-600 mt-1">{socios.filter(s => !s.mz).length}</p>
                    <p className="text-[10px] text-amber-500/80 font-medium mt-1">Faltan datos de manzana</p>
                  </Card>
                  <Card className="rounded-2xl border border-red-100 shadow-sm p-5 bg-red-50/30">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Sin Lote</p>
                    <p className="text-3xl font-black text-red-600 mt-1">{socios.filter(s => !s.lote).length}</p>
                    <p className="text-[10px] text-red-500/80 font-medium mt-1">Faltan datos de lote</p>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card className="rounded-2xl border border-[#4892CC]/20 shadow-premium bg-[#F8FAFC] p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-[#4892CC] rounded-xl"><AlertCircle className="w-6 h-6 text-white"/></div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900">Gabinete / Documentos</h3>
                        <p className="text-sm text-gray-500 font-medium">Expedientes que requieren tu edición</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-800">Cargar Planos Faltantes</p>
                          <p className="text-xs text-gray-400 font-medium mt-1">Hay {socios.filter(s => !s.mz).length} terrenos sin plano registrado.</p>
                        </div>
                        <Badge className="bg-red-50 text-red-600 border-red-200">Alta Prioridad</Badge>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-800">Revisión de Memorias</p>
                          <p className="text-xs text-gray-400 font-medium mt-1">Hay {socios.filter(s => !s.lote).length} terrenos sin memoria registrada.</p>
                        </div>
                        <Badge className="bg-amber-50 text-amber-600 border-amber-200">Pendiente</Badge>
                      </div>
                    </div>
                  </Card>
                  <Card className="rounded-2xl border border-gray-100 shadow-premium bg-white p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-emerald-50 rounded-xl"><RefreshCcw className="w-6 h-6 text-emerald-500"/></div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900">Acceso Rápido</h3>
                        <p className="text-sm text-gray-500 font-medium">Navega directamente a tus módulos</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <a href="/partner-documents" className="p-4 bg-[#4892CC]/5 rounded-xl border border-[#4892CC]/10 flex items-center justify-between hover:bg-[#4892CC]/10 transition-colors group">
                        <span className="font-bold text-[#4892CC] group-hover:translate-x-1 transition-transform">📄 Expedientes Técnicos</span>
                        <span className="text-[10px] font-black text-slate-300 uppercase">Ir →</span>
                      </a>
                      <a href="/inventory" className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between hover:bg-emerald-50 transition-colors group">
                        <span className="font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">🧰 Inventario de Campo</span>
                        <span className="text-[10px] font-black text-slate-300 uppercase">Ir →</span>
                      </a>
                      <a href="/jornada" className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center justify-between hover:bg-amber-50 transition-colors group">
                        <span className="font-bold text-amber-700 group-hover:translate-x-1 transition-transform">⏰ Mi Jornada Laboral</span>
                        <span className="text-[10px] font-black text-slate-300 uppercase">Ir →</span>
                      </a>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          {isAdminOrFinanzas ? (
            <TabsContent value="finanzas" className="space-y-8 animate-fade-in-up">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center"><TrendingUp className="text-[#4892CC] w-5 h-5" /></div>
                  <h2 className="text-2xl font-black text-gray-900">Análisis de Flujo</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
                  <Select value={filterPeriodType} onValueChange={(v: any) => { setFilterPeriodType(v); setSelectedPeriod(undefined); }}>
                    <SelectTrigger className="w-[180px] border-none bg-transparent font-bold text-gray-700 focus:ring-0"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="month">Mensual</SelectItem>
                      <SelectItem value="quarter">Trimestral</SelectItem>
                      <SelectItem value="semester">Semestral</SelectItem>
                      <SelectItem value="custom">Rango Personalizado</SelectItem>
                      <SelectItem value="all">Histórico</SelectItem>
                    </SelectContent>
                  </Select>
                  {filterPeriodType !== 'all' && filterPeriodType !== 'custom' && (
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className="w-[180px] border-l border-gray-100 bg-transparent font-bold text-[#4892CC] focus:ring-0"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {filterPeriodType === 'month' && periodOptions.months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        {filterPeriodType === 'quarter' && periodOptions.quarters.map(q => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                        {filterPeriodType === 'semester' && periodOptions.semesters.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {filterPeriodType === 'custom' && (
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-fade">
                    <Card className="rounded-2xl border-none shadow-lg bg-white p-6 hover:shadow-xl transition-shadow duration-300">
                      <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest mb-1">Ingresos</p>
                      <h4 className="text-2xl font-black text-emerald-700">{formatCurrency(filteredData.totalIngresos)}</h4>
                    </Card>
                    <Card className="rounded-2xl border-none shadow-lg bg-white p-6 hover:shadow-xl transition-shadow duration-300">
                      <p className="text-red-600 font-bold text-xs uppercase tracking-widest mb-1">Gastos</p>
                      <h4 className="text-2xl font-black text-red-700">{formatCurrency(filteredData.totalGastos)}</h4>
                    </Card>
                    <Card className={cn("rounded-2xl border-none shadow-lg p-6", filteredData.balance >= 0 ? "bg-[#E8F1F8]" : "bg-red-50")}>
                      <p className={cn("font-bold text-xs uppercase tracking-widest mb-1", filteredData.balance >= 0 ? "text-[#4892CC]" : "text-red-600")}>Balance Neto</p>
                      <h4 className={cn("text-2xl font-black", filteredData.balance >= 0 ? "text-[#4892CC]" : "text-red-700")}>{formatCurrency(filteredData.balance)}</h4>
                    </Card>
                  </div>

                  <Card className="rounded-2xl border border-gray-100 shadow-premium bg-white p-8">
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorIng" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                            <linearGradient id="colorGas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                          <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                          <Area type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorIng)" />
                          <Area type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorGas)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Drill-down de Ingresos por Localidad */}
                  <div className="mt-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                    <Card className="rounded-3xl border-none shadow-premium bg-white p-6 md:p-8">
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <Activity className="w-5 h-5 text-emerald-500" />
                            Ingresos por Localidad
                          </h2>
                          <p className="text-gray-500 font-medium text-sm">Distribución geográfica de la recaudación</p>
                        </div>
                      </div>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={localidadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                              dy={10}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                              tickFormatter={(value) => `S/.${value/1000}k`}
                            />
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}
                              cursor={{ fill: '#F1F5F9' }}
                              formatter={(value: number) => [`S/. ${value.toLocaleString()}`, 'Ingresos']}
                            />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                              {localidadData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10B981' : '#4892CC'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center"><AlertCircle className="text-amber-500 w-5 h-5" /></div>
                    <h2 className="text-2xl font-black text-gray-900">Auditoría</h2>
                  </div>
                  <Card className="rounded-2xl border border-gray-100 shadow-premium bg-white p-6 space-y-4">
                    <div className="p-5 rounded-3xl bg-gray-50 border border-gray-100 cursor-pointer hover:bg-white hover:shadow-md transition-all group" onClick={() => { setSpecialDialogType('returned'); setIsSpecialDialogOpen(true); }}>
                      <div className="flex items-center justify-between mb-2"><RefreshCcw className="w-5 h-5 text-[#4892CC]" /><Badge className="bg-amber-100 text-amber-600 border-none">Devoluciones</Badge></div>
                      <p className="text-2xl font-black text-red-600">{formatCurrency(specialStats.returned)}</p>
                      <p className="text-xs text-gray-400 font-bold uppercase mt-1">Monto total devuelto</p>
                    </div>
                    <div className="p-5 rounded-3xl bg-gray-50 border border-gray-100 cursor-pointer hover:bg-white hover:shadow-md transition-all group" onClick={() => { setSpecialDialogType('annulled'); setIsSpecialDialogOpen(true); }}>
                      <div className="flex items-center justify-between mb-2"><XCircle className="w-5 h-5 text-red-500" /><Badge className="bg-red-100 text-red-600 border-none">Anulaciones</Badge></div>
                      <p className="text-2xl font-black text-gray-900">{specialStats.annulled}</p>
                      <p className="text-xs text-gray-400 font-bold uppercase mt-1">Boletas invalidadas</p>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>
          ) : (
            <TabsContent value="finanzas" className="py-20 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="w-10 h-10 text-gray-400" /></div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Acceso Restringido</h3>
                <p className="text-gray-500 font-medium">No tienes permisos para ver datos financieros.</p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <SpecialTransactionsDialog isOpen={isSpecialDialogOpen} onClose={() => setIsSpecialDialogOpen(false)} type={specialDialogType} />
    </div>
  );
}

export default Dashboard;
