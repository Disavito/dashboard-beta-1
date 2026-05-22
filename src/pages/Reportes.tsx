import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, startOfDay, endOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/utils';
import { safeFormatDate } from '@/lib/dateUtils';
import { useUser } from '@/context/UserContext';
import {
  BarChart3, CalendarIcon, Users, DollarSign, TrendingUp, TrendingDown,
  PieChart, Clock, Loader2, ArrowUpCircle, ArrowDownCircle,
  Filter, ChevronLeft, ChevronRight, FileText, MapPin, Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { utils, writeFile } from 'xlsx';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { FinancialReportPDF } from '@/components/pdf/FinancialReportPDF';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Mail, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// ─── Tipos ──────────────────
type ViewMode = 'day' | 'week' | 'month' | '3months';

const VIEW_LABELS: Record<ViewMode, string> = {
  day: 'Diario',
  week: 'Semanal',
  month: 'Mensual',
  '3months': 'Trimestral',
};

function getRange(date: Date, mode: ViewMode): { start: string; end: string } {
  let s: Date, e: Date;
  switch (mode) {
    case 'day':
      s = startOfDay(date); e = endOfDay(date); break;
    case 'week':
      s = startOfWeek(date, { weekStartsOn: 1 }); e = endOfWeek(date, { weekStartsOn: 1 }); break;
    case '3months':
      s = startOfMonth(subMonths(date, 2)); e = endOfMonth(date); break;
    default:
      s = startOfMonth(date); e = endOfMonth(date);
  }
  return { start: format(s, 'yyyy-MM-dd'), end: format(e, 'yyyy-MM-dd') };
}

function getLabel(date: Date, mode: ViewMode): string {
  const { start, end } = getRange(date, mode);
  const s = parseISO(start), e = parseISO(end);
  switch (mode) {
    case 'day': return format(date, "EEEE d 'de' LLLL yyyy", { locale: es });
    case 'week': return `${format(s, "d LLL", { locale: es })} – ${format(e, "d LLL yyyy", { locale: es })}`;
    case '3months': return `${format(s, "LLL", { locale: es })} – ${format(e, "LLL yyyy", { locale: es })}`;
    default: return format(date, "LLLL yyyy", { locale: es });
  }
}

function navigate(date: Date, mode: ViewMode, direction: number): Date {
  switch (mode) {
    case 'day': return subDays(date, -direction);
    case 'week': return subDays(date, -7 * direction);
    case '3months': return subMonths(date, -3 * direction);
    default: return subMonths(date, -direction);
  }
}

// ─────── Componente Principal ────────
const ReportesPage: React.FC = () => {
  const { roles, loading: userLoading } = useUser();
  const isFinanceUser = roles?.includes('admin') || roles?.includes('finanzas');

  const [baseDate, setBaseDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [localidadFilter, setLocalidadFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('asistencia');

  useEffect(() => {
    if (!userLoading) {
      setActiveTab(isFinanceUser ? 'financiero' : 'asistencia');
    }
  }, [userLoading, isFinanceUser]);

  const { start: startDate, end: endDate } = getRange(baseDate, viewMode);
  const label = getLabel(baseDate, viewMode);

  // ── Fetch cuentas ──
  const { data: accounts } = useQuery({
    queryKey: ['reporteAccounts'],
    queryFn: async () => {
      const { data } = await supabase.from('cuentas').select('id, name').order('name');
      return data || [];
    },
    enabled: !!isFinanceUser,
  });

  // ── Fetch datos financieros ──
  const { data: financialData, isLoading: loadingFinancial } = useQuery({
    queryKey: ['reporteFinanciero', startDate, endDate],
    queryFn: async () => {
      const [incRes, expRes] = await Promise.all([
        supabase.from('ingresos').select('id, date, amount, transaction_type, account, full_name, receipt_number').gte('date', startDate).lte('date', endDate),
        supabase.from('gastos').select('id, date, amount, category, account, description, numero_gasto').gte('date', startDate).lte('date', endDate),
      ]);
      return { ingresos: incRes.data || [], gastos: expRes.data || [] };
    },
    enabled: !!isFinanceUser,
  });

  // ── Fetch datos de asistencia ──
  const { data: jornadaData, isLoading: loadingJornada } = useQuery({
    queryKey: ['reporteJornada', startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('registros_jornada')
        .select('id, fecha, hora_inicio_jornada, hora_fin_jornada, hora_inicio_almuerzo, hora_fin_almuerzo, justificacion_inicio, justificacion_fin, colaborador_id, colaboradores(name, apellidos)')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: false });
      return data || [];
    },
  });

  // ── Fetch socios ──
  const { data: socioStats } = useQuery({
    queryKey: ['reporteSocios'],
    queryFn: async () => {
      const { data } = await supabase.from('socio_titulares').select('id, localidad, mz, lote');
      const total = data?.length || 0;
      const conDatos = data?.filter(s => s.mz && s.lote).length || 0;
      const porLocalidad = new Map<string, number>();
      data?.forEach(s => { if (s.localidad) porLocalidad.set(s.localidad, (porLocalidad.get(s.localidad) || 0) + 1); });
      return {
        total, conDatos, sinDatos: total - conDatos,
        porLocalidad: Array.from(porLocalidad.entries()).sort((a, b) => b[1] - a[1]),
        localidades: Array.from(porLocalidad.keys()).sort(),
      };
    },
  });

  // ── Categorías únicas ──
  const categories = useMemo(() => {
    if (!financialData) return [];
    return [...new Set(financialData.gastos.map(g => g.category).filter(Boolean))].sort();
  }, [financialData]);

  // ── Cálculos financieros (con filtros) ──
  const financialStats = useMemo(() => {
    if (!financialData) return null;
    let { ingresos, gastos } = financialData;

    if (accountFilter !== 'all') {
      ingresos = ingresos.filter(i => i.account === accountFilter);
      gastos = gastos.filter(g => g.account === accountFilter);
    }
    if (categoryFilter !== 'all') {
      gastos = gastos.filter(g => g.category === categoryFilter);
    }

    const totalIngresos = ingresos.reduce((s, i) => s + (i.amount > 0 ? i.amount : 0), 0);
    const totalGastos = gastos.reduce((s, g) => s + Math.abs(g.amount), 0);

    // Gastos por categoría
    const porCategoria = new Map<string, number>();
    gastos.forEach(g => {
      const cat = g.category || 'Sin categoría';
      porCategoria.set(cat, (porCategoria.get(cat) || 0) + Math.abs(g.amount));
    });

    // Ingresos por cuenta
    const porCuenta = new Map<string, { ingresos: number; gastos: number }>();
    ingresos.forEach(i => {
      const acc = i.account || 'Sin cuenta';
      const e = porCuenta.get(acc) || { ingresos: 0, gastos: 0 };
      e.ingresos += i.amount > 0 ? i.amount : 0;
      porCuenta.set(acc, e);
    });
    gastos.forEach(g => {
      const acc = g.account || 'Sin cuenta';
      const e = porCuenta.get(acc) || { ingresos: 0, gastos: 0 };
      e.gastos += Math.abs(g.amount);
      porCuenta.set(acc, e);
    });

    // Movimiento diario
    const porDia = new Map<string, { ingresos: number; gastos: number }>();
    ingresos.forEach(i => {
      const day = i.date?.split('T')[0] || '';
      const e = porDia.get(day) || { ingresos: 0, gastos: 0 };
      e.ingresos += i.amount > 0 ? i.amount : 0;
      porDia.set(day, e);
    });
    gastos.forEach(g => {
      const day = g.date?.split('T')[0] || '';
      const e = porDia.get(day) || { ingresos: 0, gastos: 0 };
      e.gastos += Math.abs(g.amount);
      porDia.set(day, e);
    });

    // Top transacciones
    const topIngresos = [...ingresos].sort((a, b) => b.amount - a.amount).slice(0, 5);
    const topGastos = [...gastos].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 5);

    return {
      totalIngresos, totalGastos,
      balance: totalIngresos - totalGastos,
      numIngresos: ingresos.length, numGastos: gastos.length,
      porCategoria: Array.from(porCategoria.entries()).sort((a, b) => b[1] - a[1]),
      porCuenta: Array.from(porCuenta.entries()).sort((a, b) => (b[1].ingresos - b[1].gastos) - (a[1].ingresos - a[1].gastos)),
      porDia: Array.from(porDia.entries()).sort((a, b) => a[0].localeCompare(b[0])),
      topIngresos, topGastos,
    };
  }, [financialData, accountFilter, categoryFilter]);

  // ── Cálculos de asistencia ──
  const attendanceStats = useMemo(() => {
    if (!jornadaData) return null;
    const totalRegistros = jornadaData.length;
    const completados = jornadaData.filter(j => j.hora_fin_jornada).length;

    const porColaborador = new Map<string, { nombre: string; minutos: number; dias: number; tardanzas: number }>();
    jornadaData.forEach(j => {
      const colab = (j as any).colaboradores;
      const nombre = colab ? `${colab.name} ${colab.apellidos}` : 'Desconocido';
      const entry = porColaborador.get(j.colaborador_id) || { nombre, minutos: 0, dias: 0, tardanzas: 0 };
      entry.dias++;
      if (j.justificacion_inicio) entry.tardanzas++;

      if (j.hora_inicio_jornada && j.hora_fin_jornada) {
        const inicio = new Date(j.hora_inicio_jornada);
        const fin = new Date(j.hora_fin_jornada);
        let mins = (fin.getTime() - inicio.getTime()) / 60000;
        if (j.hora_inicio_almuerzo && j.hora_fin_almuerzo) {
          const almInicio = new Date(j.hora_inicio_almuerzo);
          const almFin = new Date(j.hora_fin_almuerzo);
          mins -= (almFin.getTime() - almInicio.getTime()) / 60000;
        }
        entry.minutos += Math.max(0, mins);
      }
      porColaborador.set(j.colaborador_id, entry);
    });

    // Registros detallados recientes
    const registrosDetalle = jornadaData.slice(0, 20).map(j => {
      const colab = (j as any).colaboradores;
      return {
        fecha: j.fecha,
        nombre: colab ? `${colab.name} ${colab.apellidos}` : 'Desconocido',
        entrada: j.hora_inicio_jornada,
        salida: j.hora_fin_jornada,
        justInicio: j.justificacion_inicio,
        justFin: j.justificacion_fin,
      };
    });

    return {
      totalRegistros, completados, enCurso: totalRegistros - completados,
      totalTardanzas: jornadaData.filter(j => j.justificacion_inicio).length,
      porColaborador: Array.from(porColaborador.values()).sort((a, b) => b.minutos - a.minutos),
      registrosDetalle,
    };
  }, [jornadaData]);

  const isLoading = loadingFinancial || loadingJornada;

  const exportAdvancedExcel = () => {
    if (!financialData) return;
    const wb = utils.book_new();

    // Hoja 1: Resumen
    const sumData = [
      { Concepto: 'Total Ingresos', Monto: financialStats?.totalIngresos || 0 },
      { Concepto: 'Total Gastos', Monto: financialStats?.totalGastos || 0 },
      { Concepto: 'Balance', Monto: financialStats?.balance || 0 },
    ];
    const ws1 = utils.json_to_sheet(sumData);
    utils.book_append_sheet(wb, ws1, "Resumen");

    // Hoja 2: Ingresos
    const ingData = financialData.ingresos.map(i => ({
      Fecha: i.date,
      Monto: i.amount,
      Recibo: i.receipt_number,
      Nombre: i.full_name,
      Cuenta: i.account
    }));
    const ws2 = utils.json_to_sheet(ingData);
    utils.book_append_sheet(wb, ws2, "Ingresos");

    // Hoja 3: Gastos
    const gasData = financialData.gastos.map(g => ({
      Fecha: g.date,
      Monto: Math.abs(g.amount),
      Descripcion: g.description,
      Categoria: g.category,
      Cuenta: g.account
    }));
    const ws3 = utils.json_to_sheet(gasData);
    utils.book_append_sheet(wb, ws3, "Gastos");

    writeFile(wb, `Reporte_Financiero_${label.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="p-4 md:p-8 bg-[#FFFFFF] min-h-screen max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#4892CC] rounded-2xl shadow-lg shadow-[#4892CC]/20">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Reportes</h1>
            <p className="text-slate-500 font-medium text-sm">Analiza el rendimiento de tu organización</p>
          </div>
        </div>
      </header>

      {/* ── Barra de navegación de periodo ── */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        {/* Vista selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Vista</label>
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
            {(Object.entries(VIEW_LABELS) as [ViewMode, string][]).map(([key, lbl]) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-bold transition-all",
                  viewMode === key ? "bg-white shadow-sm text-[#4892CC]" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Navegación de fechas */}
        <div className="flex items-end gap-2 flex-1">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={() => setBaseDate(d => navigate(d, viewMode, -1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center">
            <p className="text-lg font-black text-slate-900 capitalize">{label}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {format(parseISO(startDate), 'dd/MM')} → {format(parseISO(endDate), 'dd/MM/yyyy')}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={() => setBaseDate(d => navigate(d, viewMode, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs h-10 px-3 shrink-0" onClick={() => setBaseDate(new Date())}>
            Hoy
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#4892CC] mb-4" />
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Generando reportes...</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={cn("bg-slate-50 p-1 rounded-2xl border border-slate-100 grid gap-1", isFinanceUser ? "grid-cols-3" : "grid-cols-2")}>
            {isFinanceUser && (
              <TabsTrigger value="financiero" className="rounded-xl font-bold text-xs uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Financiero
              </TabsTrigger>
            )}
            <TabsTrigger value="asistencia" className="rounded-xl font-bold text-xs uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Clock className="w-3.5 h-3.5 mr-1.5" /> Asistencia
            </TabsTrigger>
            <TabsTrigger value="socios" className="rounded-xl font-bold text-xs uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Socios
            </TabsTrigger>
          </TabsList>

          {/* ════════ REPORTE FINANCIERO ════════ */}
          {isFinanceUser && (
            <TabsContent value="financiero" className="space-y-6">
              {/* Filtros financieros */}
              <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                <Filter className="w-4 h-4 text-slate-400 ml-2" />
                <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger className="w-[160px] border-none focus:ring-0 font-bold text-slate-700 text-xs">
                    <SelectValue placeholder="Cuenta" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Todas las cuentas</SelectItem>
                    {(accounts || []).map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                <Filter className="w-4 h-4 text-slate-400 ml-2" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px] border-none focus:ring-0 font-bold text-slate-700 text-xs">
                    <SelectValue placeholder="Categoría gasto" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={exportAdvancedExcel}
                className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 rounded-xl shadow-sm text-xs px-4"
              >
                <Download className="w-4 h-4 mr-2" /> Exportar Multi-Hoja
              </Button>
              {financialStats && (
                <PDFDownloadLink
                  document={<FinancialReportPDF label={label} stats={financialStats} />}
                  fileName={`Reporte_Financiero_${label.replace(/\s+/g, '_')}.pdf`}
                  className="bg-[#4892CC] hover:bg-[#4892CC]/90 text-white font-bold h-9 rounded-xl shadow-sm text-xs px-4 flex items-center justify-center transition-colors"
                >
                  {({ loading }) => (
                    <>
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                      Exportar PDF
                    </>
                  )}
                </PDFDownloadLink>
              )}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-9 rounded-xl shadow-sm text-xs px-4 font-bold border-slate-200">
                    <CalendarDays className="w-4 h-4 mr-2 text-[#4892CC]" /> Programar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-900">
                      <Mail className="w-5 h-5 text-[#4892CC]" /> Envío Programado
                    </DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">
                      Configura el envío automático de este reporte por correo electrónico. (Requiere Supabase Edge Functions y un proveedor de correo).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Frecuencia</label>
                      <Select defaultValue="weekly">
                        <SelectTrigger className="bg-slate-50 border-slate-200 h-12 rounded-xl focus:ring-0"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Diario (Cierre de caja)</SelectItem>
                          <SelectItem value="weekly">Semanal (Cada lunes)</SelectItem>
                          <SelectItem value="monthly">Mensual (Día 1 del mes)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Correos Destinatarios</label>
                      <Input placeholder="admin@fimagadi.com, finanzas@fimagadi.com" className="bg-slate-50 border-slate-200 h-12 rounded-xl focus:ring-0" />
                    </div>
                    <Button 
                      className="w-full bg-[#4892CC] hover:bg-[#4892CC]/90 text-white font-bold h-12 rounded-xl mt-4"
                      onClick={() => toast.success("Configuración guardada (En desarrollo)")}
                    >
                      Guardar Configuración
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {financialStats && (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card className="rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Ingresos</p>
                    <p className="text-xl font-black text-emerald-600 mt-1">{formatCurrency(financialStats.totalIngresos)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{financialStats.numIngresos} operaciones</p>
                  </Card>
                  <Card className="rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Gastos</p>
                    <p className="text-xl font-black text-red-600 mt-1">{formatCurrency(financialStats.totalGastos)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{financialStats.numGastos} operaciones</p>
                  </Card>
                  <Card className="rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-black text-[#4892CC] uppercase tracking-widest">Balance</p>
                    <p className={cn("text-xl font-black mt-1", financialStats.balance >= 0 ? "text-emerald-600" : "text-red-600")}>
                      {formatCurrency(financialStats.balance)}
                    </p>
                  </Card>
                  <Card className="rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Promedio Diario</p>
                    <p className="text-xl font-black text-slate-900 mt-1">
                      {financialStats.porDia.length > 0 ? formatCurrency(financialStats.totalIngresos / financialStats.porDia.length) : 'S/ 0'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">de ingresos</p>
                  </Card>
                  <Card className="rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Ops</p>
                    <p className="text-xl font-black text-slate-900 mt-1">{financialStats.numIngresos + financialStats.numGastos}</p>
                    <p className="text-[10px] text-slate-400 mt-1">transacciones</p>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gastos por Categoría */}
                  <Card className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <CardHeader className="p-5 border-b border-slate-50">
                      <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-[#4892CC]" /> Gastos por Categoría
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[320px] overflow-y-auto">
                      <div className="divide-y divide-slate-50">
                        {financialStats.porCategoria.map(([cat, amount]) => {
                          const pct = financialStats.totalGastos > 0 ? (amount / financialStats.totalGastos * 100) : 0;
                          return (
                            <div key={cat} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
                              <div className="flex-1">
                                <p className="font-bold text-slate-700 text-xs">{cat}</p>
                                <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-black text-red-600 text-sm">{formatCurrency(amount)}</p>
                                <p className="text-[10px] font-bold text-slate-400">{pct.toFixed(1)}%</p>
                              </div>
                            </div>
                          );
                        })}
                        {financialStats.porCategoria.length === 0 && <div className="p-6 text-center text-slate-400 italic text-sm">Sin gastos</div>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Balance por Cuenta */}
                  <Card className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <CardHeader className="p-5 border-b border-slate-50">
                      <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#4892CC]" /> Balance por Cuenta
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[320px] overflow-y-auto">
                      <div className="divide-y divide-slate-50">
                        {financialStats.porCuenta.map(([acc, vals]) => (
                          <div key={acc} className="px-5 py-3 hover:bg-slate-50/50 transition-colors">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-slate-700 text-xs">{acc}</span>
                              <span className={cn("font-black text-sm", vals.ingresos - vals.gastos >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {formatCurrency(vals.ingresos - vals.gastos)}
                              </span>
                            </div>
                            <div className="flex gap-4 text-[10px] font-bold text-slate-400">
                              <span className="text-emerald-500">↑ {formatCurrency(vals.ingresos)}</span>
                              <span className="text-red-400">↓ {formatCurrency(vals.gastos)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Movimiento Diario */}
                <Card className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <CardHeader className="p-5 border-b border-slate-50">
                    <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-[#4892CC]" /> Movimiento por Día
                    </CardTitle>
                    <CardDescription>{financialStats.porDia.length} días con actividad</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                    <div className="divide-y divide-slate-50">
                      {financialStats.porDia.map(([dia, vals]) => (
                        <div key={dia} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                          <span className="text-xs font-bold text-slate-500 w-24">{safeFormatDate(dia, "EEE dd/MM")}</span>
                          <div className="flex gap-6 items-center">
                            <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" /> {formatCurrency(vals.ingresos)}
                            </span>
                            <span className="text-xs font-black text-red-500 flex items-center gap-1">
                              <TrendingDown className="w-3 h-3" /> {formatCurrency(vals.gastos)}
                            </span>
                            <Badge className={cn("text-[10px] font-black border-none px-2", vals.ingresos - vals.gastos >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                              {formatCurrency(vals.ingresos - vals.gastos)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top 5 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <CardHeader className="p-5 border-b border-slate-50">
                      <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                        <ArrowUpCircle className="w-4 h-4 text-emerald-500" /> Top 5 Ingresos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-50">
                        {financialStats.topIngresos.map((i, idx) => (
                          <div key={idx} className="px-5 py-3 flex justify-between items-center hover:bg-slate-50/50">
                            <div>
                              <p className="font-bold text-slate-700 text-xs uppercase">{i.full_name || 'Sin nombre'}</p>
                              <p className="text-[10px] text-slate-400">{safeFormatDate(i.date, 'dd/MM/yyyy')} · {i.receipt_number}</p>
                            </div>
                            <span className="font-black text-emerald-600 text-sm">{formatCurrency(i.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <CardHeader className="p-5 border-b border-slate-50">
                      <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                        <ArrowDownCircle className="w-4 h-4 text-red-500" /> Top 5 Gastos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-50">
                        {financialStats.topGastos.map((g, idx) => (
                          <div key={idx} className="px-5 py-3 flex justify-between items-center hover:bg-slate-50/50">
                            <div>
                              <p className="font-bold text-slate-700 text-xs">{g.description}</p>
                              <p className="text-[10px] text-slate-400">{safeFormatDate(g.date, 'dd/MM/yyyy')} · {g.category}</p>
                            </div>
                            <span className="font-black text-red-600 text-sm">{formatCurrency(Math.abs(g.amount))}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
          )}

          {/* ════════ REPORTE ASISTENCIA ════════ */}
          <TabsContent value="asistencia" className="space-y-6">
            {attendanceStats && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registros</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{attendanceStats.totalRegistros}</p>
                  </Card>
                  <Card className="rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Completados</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{attendanceStats.completados}</p>
                  </Card>
                  <Card className="rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">En Curso</p>
                    <p className="text-2xl font-black text-amber-600 mt-1">{attendanceStats.enCurso}</p>
                  </Card>
                  <Card className="rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Tardanzas</p>
                    <p className="text-2xl font-black text-red-600 mt-1">{attendanceStats.totalTardanzas}</p>
                  </Card>
                </div>

                {/* Horas por Colaborador */}
                <Card className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <CardHeader className="p-5 border-b border-slate-50">
                    <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#4892CC]" /> Horas por Colaborador
                    </CardTitle>
                    <CardDescription>Periodo: <span className="capitalize font-bold">{label}</span></CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-50">
                      {attendanceStats.porColaborador.map((colab, idx) => {
                        const hours = Math.floor(colab.minutos / 60);
                        const mins = Math.round(colab.minutos % 60);
                        return (
                          <div key={idx} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#4892CC]/10 flex items-center justify-center text-[#4892CC] font-black text-sm">
                                {colab.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                              </div>
                              <div>
                                <p className="font-bold text-slate-700 text-sm">{colab.nombre}</p>
                                <div className="flex gap-3 text-[10px] font-bold mt-0.5">
                                  <span className="text-slate-400">{colab.dias} días</span>
                                  {colab.tardanzas > 0 && <span className="text-red-400">{colab.tardanzas} tardanzas</span>}
                                </div>
                              </div>
                            </div>
                            <Badge className="bg-[#4892CC]/10 text-[#4892CC] border-none font-black text-sm px-3 py-1 font-mono">
                              {hours}h {mins.toString().padStart(2, '0')}m
                            </Badge>
                          </div>
                        );
                      })}
                      {attendanceStats.porColaborador.length === 0 && (
                        <div className="p-8 text-center text-slate-400 italic text-sm">Sin registros en este periodo</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Detalle de registros */}
                <Card className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <CardHeader className="p-5 border-b border-slate-50">
                    <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#4892CC]" /> Detalle de Registros
                    </CardTitle>
                    <CardDescription>Últimos {attendanceStats.registrosDetalle.length} registros</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                          <th className="px-5 py-3">Fecha</th>
                          <th className="px-5 py-3">Colaborador</th>
                          <th className="px-5 py-3">Entrada</th>
                          <th className="px-5 py-3">Salida</th>
                          <th className="px-5 py-3">Justificación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {attendanceStats.registrosDetalle.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3 text-xs font-bold text-slate-500">{safeFormatDate(r.fecha, 'EEE dd/MM')}</td>
                            <td className="px-5 py-3 text-xs font-bold text-slate-700">{r.nombre}</td>
                            <td className="px-5 py-3 text-xs font-mono text-slate-600">
                              {r.entrada ? format(new Date(r.entrada), 'HH:mm') : '--:--'}
                            </td>
                            <td className="px-5 py-3 text-xs font-mono text-slate-600">
                              {r.salida ? format(new Date(r.salida), 'HH:mm') : '--:--'}
                            </td>
                            <td className="px-5 py-3">
                              {(r.justInicio || r.justFin) ? (
                                <div className="flex gap-1">
                                  {r.justInicio && <Badge className="bg-amber-50 text-amber-600 border-none text-[9px] px-1.5">E: {r.justInicio}</Badge>}
                                  {r.justFin && <Badge className="bg-red-50 text-red-600 border-none text-[9px] px-1.5">S: {r.justFin}</Badge>}
                                </div>
                              ) : <span className="text-slate-300 text-xs">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ════════ REPORTE SOCIOS ════════ */}
          <TabsContent value="socios" className="space-y-6">
            {/* Filtro de localidad */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                <MapPin className="w-4 h-4 text-slate-400 ml-2" />
                <Select value={localidadFilter} onValueChange={setLocalidadFilter}>
                  <SelectTrigger className="w-[200px] border-none focus:ring-0 font-bold text-slate-700 text-xs">
                    <SelectValue placeholder="Localidad" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Todas las localidades</SelectItem>
                    {(socioStats?.localidades || []).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {socioStats && (() => {
              const filteredLocalidades = localidadFilter === 'all'
                ? socioStats.porLocalidad
                : socioStats.porLocalidad.filter(([loc]) => loc === localidadFilter);
              const filteredTotal = localidadFilter === 'all' ? socioStats.total : filteredLocalidades.reduce((s, [, c]) => s + c, 0);

              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="rounded-2xl border border-gray-100 shadow-sm p-5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Socios</p>
                      <p className="text-2xl font-black text-slate-900 mt-1">{filteredTotal}</p>
                    </Card>
                    <Card className="rounded-2xl border border-gray-100 shadow-sm p-5">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Con Mz + Lote</p>
                      <p className="text-2xl font-black text-emerald-600 mt-1">{socioStats.conDatos}</p>
                    </Card>
                    <Card className="rounded-2xl border border-gray-100 shadow-sm p-5">
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Sin Datos</p>
                      <p className="text-2xl font-black text-amber-600 mt-1">{socioStats.sinDatos}</p>
                    </Card>
                    <Card className="rounded-2xl border border-gray-100 shadow-sm p-5">
                      <p className="text-[10px] font-black text-[#4892CC] uppercase tracking-widest">Cobertura</p>
                      <p className="text-2xl font-black text-[#4892CC] mt-1">
                        {socioStats.total > 0 ? ((socioStats.conDatos / socioStats.total) * 100).toFixed(1) : 0}%
                      </p>
                    </Card>
                  </div>

                  <Card className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <CardHeader className="p-5 border-b border-slate-50">
                      <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#4892CC]" /> Distribución por Localidad
                      </CardTitle>
                      <CardDescription>{filteredLocalidades.length} localidades</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                      <div className="divide-y divide-slate-50">
                        {filteredLocalidades.map(([loc, count]) => {
                          const pct = socioStats.total > 0 ? (count / socioStats.total * 100) : 0;
                          return (
                            <div key={loc} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
                              <div className="w-10 h-10 bg-[#4892CC]/10 rounded-xl flex items-center justify-center shrink-0">
                                <MapPin className="w-4 h-4 text-[#4892CC]" />
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-slate-700 text-sm">{loc}</p>
                                <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#4892CC] rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-black text-slate-900 text-sm">{count}</p>
                                <p className="text-[10px] font-bold text-slate-400">{pct.toFixed(1)}%</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ReportesPage;
