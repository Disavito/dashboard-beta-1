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
  LineChart, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const { roles, customPermissions, loading: userLoading } = useUser();
  const isFinanceUser = roles?.includes('admin') || roles?.includes('finanzas_senior') || roles?.includes('finanzas_junior') || customPermissions?.can_manage_finances || customPermissions?.can_view_income || customPermissions?.can_view_expenses;

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
  const { data: accounts, isError: isErrorAccounts, error: errorAccounts } = useQuery({
    queryKey: ['reporteAccounts'],
    queryFn: async () => {
      const { data } = await supabase.from('cuentas').select('id, name').order('name');
      return data || [];
    },
    enabled: !!isFinanceUser,
  });

  // ── Fetch datos financieros ──
  const { data: financialData, isLoading: loadingFinancial, isError: isErrorFinancial, error: errorFinancial } = useQuery({
    queryKey: ['reporteFinanciero', startDate, endDate],
    queryFn: async () => {
      const [incRes, expRes] = await Promise.all([
        supabase.from('ingresos').select('id, date, amount, transaction_type, account, full_name, receipt_number').is('deleted_at', null).gte('date', startDate).lte('date', endDate),
        supabase.from('gastos').select('id, date, amount, category, account, description, numero_gasto').is('deleted_at', null).gte('date', startDate).lte('date', endDate),
      ]);
      return { ingresos: incRes.data || [], gastos: expRes.data || [] };
    },
    enabled: !!isFinanceUser,
  });

  // ── Fetch datos de asistencia ──
  const { data: jornadaData, isLoading: loadingJornada, isError: isErrorJornada, error: errorJornada } = useQuery({
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
  const { data: socioStats, isError: isErrorSocios, error: errorSocios } = useQuery({
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
  // ── Fetch progreso localidades ──
  const { data: progresoData, isLoading: loadingProgreso, isError: isErrorProgreso, error: errorProgreso } = useQuery({
    queryKey: ['reporteProgreso'],
    queryFn: async () => {
      const { data } = await supabase.from('view_progreso_localidades').select('*').order('total_socios', { ascending: false });
      return data || [];
    },
  });

  // ── Fetch Vistas Gerenciales Ocultas ──
  const { data: gerencialData, isLoading: loadingGerencial, isError: isErrorGerencial, error: errorGerencial } = useQuery({
    queryKey: ['reporteGerencial'],
    queryFn: async () => {
      const [resIngresos, resEstado, resMorosidad] = await Promise.all([
        supabase.from('vw_ingresos_localidad').select('*').order('mes', { ascending: false }).limit(500),
        supabase.from('view_socio_estado').select('*'),
        supabase.from('socios_con_ultimo_ingreso').select('*').order('last_income_date', { ascending: true, nullsFirst: true }).limit(5000)
      ]);
      return {
        ingresosLocalidad: resIngresos.data || [],
        socioEstado: resEstado.data || [],
        morosidad: resMorosidad.data || []
      };
    },
  });
  // ── Fetch Observaciones ──
  const { data: observacionesData, isLoading: loadingObservaciones } = useQuery({
    queryKey: ['reporteObservaciones'],
    queryFn: async () => {
      const { data } = await supabase.from('vw_socio_titulares_estado').select('localidad, isObservado, is_payment_observed');
      return data || [];
    },
  });

  const observacionesStats = useMemo(() => {
    if (!observacionesData) return null;
    let totalPersonObs = 0;
    let totalPaymentObs = 0;
    const byLocalidad = new Map<string, { personObs: number, paymentObs: number }>();
    
    observacionesData.forEach(s => {
      const loc = s.localidad || 'Sin Localidad';
      const isPersonObs = s.isObservado ? 1 : 0;
      const isPaymentObs = s.is_payment_observed ? 1 : 0;
      
      totalPersonObs += isPersonObs;
      totalPaymentObs += isPaymentObs;
      
      if (isPersonObs || isPaymentObs) {
        const entry = byLocalidad.get(loc) || { personObs: 0, paymentObs: 0 };
        entry.personObs += isPersonObs;
        entry.paymentObs += isPaymentObs;
        byLocalidad.set(loc, entry);
      }
    });

    const arrByLocalidad = Array.from(byLocalidad.entries()).map(([loc, stats]) => ({
      localidad: loc,
      personObs: stats.personObs,
      paymentObs: stats.paymentObs,
      total: stats.personObs + stats.paymentObs
    })).sort((a, b) => b.total - a.total);

    return {
      totalPersonObs,
      totalPaymentObs,
      totalAssociations: arrByLocalidad.length,
      byLocalidad: arrByLocalidad
    };
  }, [observacionesData]);

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

  const isLoading = loadingFinancial || loadingJornada || loadingProgreso || loadingGerencial;
  const hasError = isErrorAccounts || isErrorFinancial || isErrorJornada || isErrorSocios || isErrorProgreso || isErrorGerencial;
  const firstError = errorAccounts || errorFinancial || errorJornada || errorSocios || errorProgreso || errorGerencial;

  const exportAdvancedExcel = async () => {
    if (!financialData) return;
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const sumData = [
      { Concepto: 'Total Ingresos', Monto: financialStats?.totalIngresos || 0 },
      { Concepto: 'Total Gastos', Monto: financialStats?.totalGastos || 0 },
      { Concepto: 'Balance', Monto: financialStats?.balance || 0 },
    ];
    const ws1 = XLSX.utils.json_to_sheet(sumData);
    XLSX.utils.book_append_sheet(wb, ws1, "Resumen");

    // Hoja 2: Ingresos
    const ingData = financialData.ingresos.map(i => ({
      Fecha: i.date,
      Monto: i.amount,
      Recibo: i.receipt_number,
      Nombre: i.full_name,
      Cuenta: i.account
    }));
    const ws2 = XLSX.utils.json_to_sheet(ingData);
    XLSX.utils.book_append_sheet(wb, ws2, "Ingresos");

    // Hoja 3: Gastos
    const gasData = financialData.gastos.map(g => ({
      Fecha: g.date,
      Monto: Math.abs(g.amount),
      Descripcion: g.description,
      Categoria: g.category,
      Cuenta: g.account
    }));
    const ws3 = XLSX.utils.json_to_sheet(gasData);
    XLSX.utils.book_append_sheet(wb, ws3, "Gastos");

    XLSX.writeFile(wb, `Reporte_Financiero_${label.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-background page-enter pb-10">
      <div className="w-full bg-card dark:bg-slate-900 border-b border-border/50 py-12 px-8 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#4892CC]/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#4892CC] rounded-2xl shadow-lg shadow-[#4892CC]/20">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-foreground uppercase">Reportes</h1>
                <p className="text-muted-foreground font-medium mt-1">Analiza el rendimiento de tu organización.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6 px-4 md:px-8">

      {/* ── Barra de navegación de periodo ── */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end p-5 bg-card dark:bg-slate-900 border border-border/50 rounded-2xl shadow-sm">
        {/* Vista selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-muted-foreground/70 tracking-widest">Vista</label>
          <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50">
            {(Object.entries(VIEW_LABELS) as [ViewMode, string][]).map(([key, lbl]) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-bold transition-all",
                  viewMode === key ? "bg-card dark:bg-slate-900 shadow-sm text-[#4892CC]" : "text-muted-foreground/70 hover:text-muted-foreground"
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
            <p className="text-lg font-black text-foreground capitalize">{label}</p>
            <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
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
          <p className="text-muted-foreground/70 font-bold uppercase text-xs tracking-widest">Generando reportes...</p>
        </div>
      ) : hasError ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card dark:bg-slate-900 rounded-3xl border border-red-100 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Error al generar reportes</h2>
          <p className="text-muted-foreground font-medium text-center max-w-md">{(firstError as Error)?.message || 'Ha ocurrido un problema al descargar las estadísticas.'}</p>
          <Button onClick={() => window.location.reload()} className="mt-6 bg-[#4892CC]">Reintentar</Button>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={cn("bg-muted/50 p-1 rounded-2xl border border-border/50 grid gap-1", isFinanceUser ? "grid-cols-5" : "grid-cols-3")}>
            {isFinanceUser && (
              <TabsTrigger value="financiero" className="rounded-xl font-bold text-xs uppercase data-[state=active]:bg-card dark:bg-slate-900 data-[state=active]:shadow-sm">
                <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Financiero
              </TabsTrigger>
            )}
            {isFinanceUser && (
              <TabsTrigger value="gerencial" className="rounded-xl font-bold text-xs uppercase data-[state=active]:bg-card dark:bg-slate-900 data-[state=active]:shadow-sm text-[#4892CC]">
                <LineChart className="w-3.5 h-3.5 mr-1.5" /> Gerencial
              </TabsTrigger>
            )}
            <TabsTrigger value="asistencia" className="rounded-xl font-bold text-xs uppercase data-[state=active]:bg-card dark:bg-slate-900 data-[state=active]:shadow-sm">
              <Clock className="w-3.5 h-3.5 mr-1.5" /> Asistencia
            </TabsTrigger>
            <TabsTrigger value="socios" className="rounded-xl font-bold text-xs uppercase data-[state=active]:bg-card dark:bg-slate-900 data-[state=active]:shadow-sm">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Socios
            </TabsTrigger>
            <TabsTrigger value="observaciones" className="rounded-xl font-bold text-xs uppercase data-[state=active]:bg-card dark:bg-slate-900 data-[state=active]:shadow-sm text-amber-600 dark:text-amber-500">
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Observaciones
            </TabsTrigger>
          </TabsList>

          {/* ════════ REPORTE FINANCIERO ════════ */}
          {isFinanceUser && (
            <TabsContent value="financiero" className="space-y-6">
              {/* Filtros financieros */}
              <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-card dark:bg-slate-900 p-1.5 rounded-xl border border-border shadow-sm">
                <Filter className="w-4 h-4 text-muted-foreground/70 ml-2" />
                <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger className="w-[160px] border-none focus:ring-0 font-bold text-foreground/80 text-xs">
                    <SelectValue placeholder="Cuenta" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Todas las cuentas</SelectItem>
                    {(accounts || []).map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 bg-card dark:bg-slate-900 p-1.5 rounded-xl border border-border shadow-sm">
                <Filter className="w-4 h-4 text-muted-foreground/70 ml-2" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px] border-none focus:ring-0 font-bold text-foreground/80 text-xs">
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
                  <Button variant="outline" className="h-9 rounded-xl shadow-sm text-xs px-4 font-bold border-border">
                    <CalendarDays className="w-4 h-4 mr-2 text-[#4892CC]" /> Programar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-card dark:bg-slate-900 rounded-3xl p-6">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-black text-foreground">
                      <Mail className="w-5 h-5 text-[#4892CC]" /> Envío Programado
                    </DialogTitle>
                    <DialogDescription className="font-medium text-muted-foreground">
                      Configura el envío automático de este reporte por correo electrónico. (Requiere Supabase Edge Functions y un proveedor de correo).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Frecuencia</label>
                      <Select defaultValue="weekly">
                        <SelectTrigger className="bg-muted/50 border-border h-12 rounded-xl focus:ring-0"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Diario (Cierre de caja)</SelectItem>
                          <SelectItem value="weekly">Semanal (Cada lunes)</SelectItem>
                          <SelectItem value="monthly">Mensual (Día 1 del mes)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Correos Destinatarios</label>
                      <Input placeholder="admin@fimagadi.com, finanzas@fimagadi.com" className="bg-muted/50 border-border h-12 rounded-xl focus:ring-0" />
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
                  <Card className="rounded-2xl border border-border/50 shadow-sm p-5">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Ingresos</p>
                    <p className="text-xl font-black text-emerald-600 mt-1">{formatCurrency(financialStats.totalIngresos)}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{financialStats.numIngresos} operaciones</p>
                  </Card>
                  <Card className="rounded-2xl border border-border/50 shadow-sm p-5">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Gastos</p>
                    <p className="text-xl font-black text-red-600 mt-1">{formatCurrency(financialStats.totalGastos)}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{financialStats.numGastos} operaciones</p>
                  </Card>
                  <Card className="rounded-2xl border border-border/50 shadow-sm p-5">
                    <p className="text-[10px] font-black text-[#4892CC] uppercase tracking-widest">Balance</p>
                    <p className={cn("text-xl font-black mt-1", financialStats.balance >= 0 ? "text-emerald-600" : "text-red-600")}>
                      {formatCurrency(financialStats.balance)}
                    </p>
                  </Card>
                  <Card className="rounded-2xl border border-border/50 shadow-sm p-5">
                    <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">Promedio Diario</p>
                    <p className="text-xl font-black text-foreground mt-1">
                      {financialStats.porDia.length > 0 ? formatCurrency(financialStats.totalIngresos / financialStats.porDia.length) : 'S/ 0'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">de ingresos</p>
                  </Card>
                  <Card className="rounded-2xl border border-border/50 shadow-sm p-5">
                    <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">Total Ops</p>
                    <p className="text-xl font-black text-foreground mt-1">{financialStats.numIngresos + financialStats.numGastos}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">transacciones</p>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gastos por Categoría */}
                  <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
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
                            <div key={cat} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/50/50 transition-colors">
                              <div className="flex-1">
                                <p className="font-bold text-foreground/80 text-xs">{cat}</p>
                                <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-black text-red-600 text-sm">{formatCurrency(amount)}</p>
                                <p className="text-[10px] font-bold text-muted-foreground/70">{pct.toFixed(1)}%</p>
                              </div>
                            </div>
                          );
                        })}
                        {financialStats.porCategoria.length === 0 && <div className="p-6 text-center text-muted-foreground/70 italic text-sm">Sin gastos</div>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Balance por Cuenta */}
                  <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                    <CardHeader className="p-5 border-b border-slate-50">
                      <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#4892CC]" /> Balance por Cuenta
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[320px] overflow-y-auto">
                      <div className="divide-y divide-slate-50">
                        {financialStats.porCuenta.map(([acc, vals]) => (
                          <div key={acc} className="px-5 py-3 hover:bg-muted/50/50 transition-colors">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-foreground/80 text-xs">{acc}</span>
                              <span className={cn("font-black text-sm", vals.ingresos - vals.gastos >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {formatCurrency(vals.ingresos - vals.gastos)}
                              </span>
                            </div>
                            <div className="flex gap-4 text-[10px] font-bold text-muted-foreground/70">
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
                <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                  <CardHeader className="p-5 border-b border-slate-50">
                    <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-[#4892CC]" /> Movimiento por Día
                    </CardTitle>
                    <CardDescription>{financialStats.porDia.length} días con actividad</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                    <div className="divide-y divide-slate-50">
                      {financialStats.porDia.map(([dia, vals]) => (
                        <div key={dia} className="px-5 py-3 flex items-center justify-between hover:bg-muted/50/50 transition-colors">
                          <span className="text-xs font-bold text-muted-foreground w-24">{safeFormatDate(dia, "EEE dd/MM")}</span>
                          <div className="flex gap-6 items-center">
                            <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" /> {formatCurrency(vals.ingresos)}
                            </span>
                            <span className="text-xs font-black text-red-500 flex items-center gap-1">
                              <TrendingDown className="w-3 h-3" /> {formatCurrency(vals.gastos)}
                            </span>
                            <Badge className={cn("text-[10px] font-black border-none px-2", vals.ingresos - vals.gastos >= 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400")}>
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
                  <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                    <CardHeader className="p-5 border-b border-slate-50">
                      <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                        <ArrowUpCircle className="w-4 h-4 text-emerald-500" /> Top 5 Ingresos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-50">
                        {financialStats.topIngresos.map((i, idx) => (
                          <div key={idx} className="px-5 py-3 flex justify-between items-center hover:bg-muted/50/50">
                            <div>
                              <p className="font-bold text-foreground/80 text-xs uppercase">{i.full_name || 'Sin nombre'}</p>
                              <p className="text-[10px] text-muted-foreground/70">{safeFormatDate(i.date, 'dd/MM/yyyy')} · {i.receipt_number}</p>
                            </div>
                            <span className="font-black text-emerald-600 text-sm">{formatCurrency(i.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                    <CardHeader className="p-5 border-b border-slate-50">
                      <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                        <ArrowDownCircle className="w-4 h-4 text-red-500" /> Top 5 Gastos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-50">
                        {financialStats.topGastos.map((g, idx) => (
                          <div key={idx} className="px-5 py-3 flex justify-between items-center hover:bg-muted/50/50">
                            <div>
                              <p className="font-bold text-foreground/80 text-xs">{g.description}</p>
                              <p className="text-[10px] text-muted-foreground/70">{safeFormatDate(g.date, 'dd/MM/yyyy')} · {g.category}</p>
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
                  <Card className="rounded-2xl border border-border/50 shadow-sm p-5">
                    <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">Registros</p>
                    <p className="text-2xl font-black text-foreground mt-1">{attendanceStats.totalRegistros}</p>
                  </Card>
                  <Card className="rounded-2xl border border-border/50 shadow-sm p-5">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Completados</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{attendanceStats.completados}</p>
                  </Card>
                  <Card className="rounded-2xl border border-border/50 shadow-sm p-5">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">En Curso</p>
                    <p className="text-2xl font-black text-amber-600 mt-1">{attendanceStats.enCurso}</p>
                  </Card>
                  <Card className="rounded-2xl border border-border/50 shadow-sm p-5">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Tardanzas</p>
                    <p className="text-2xl font-black text-red-600 mt-1">{attendanceStats.totalTardanzas}</p>
                  </Card>
                </div>

                {/* Horas por Colaborador */}
                <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
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
                          <div key={idx} className="px-5 py-4 flex items-center justify-between hover:bg-muted/50/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#4892CC]/10 flex items-center justify-center text-[#4892CC] font-black text-sm">
                                {colab.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                              </div>
                              <div>
                                <p className="font-bold text-foreground/80 text-sm">{colab.nombre}</p>
                                <div className="flex gap-3 text-[10px] font-bold mt-0.5">
                                  <span className="text-muted-foreground/70">{colab.dias} días</span>
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
                        <div className="p-8 text-center text-muted-foreground/70 italic text-sm">Sin registros en este periodo</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Detalle de registros */}
                <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                  <CardHeader className="p-5 border-b border-slate-50">
                    <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#4892CC]" /> Detalle de Registros
                    </CardTitle>
                    <CardDescription>Últimos {attendanceStats.registrosDetalle.length} registros</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-muted/50/50 text-muted-foreground/70 text-[10px] font-black uppercase tracking-widest">
                          <th className="px-5 py-3">Fecha</th>
                          <th className="px-5 py-3">Colaborador</th>
                          <th className="px-5 py-3">Entrada</th>
                          <th className="px-5 py-3">Salida</th>
                          <th className="px-5 py-3">Justificación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {attendanceStats.registrosDetalle.map((r, i) => (
                          <tr key={i} className="hover:bg-muted/50/50 transition-colors">
                            <td className="px-5 py-3 text-xs font-bold text-muted-foreground">{safeFormatDate(r.fecha, 'EEE dd/MM')}</td>
                            <td className="px-5 py-3 text-xs font-bold text-foreground/80">{r.nombre}</td>
                            <td className="px-5 py-3 text-xs font-mono text-muted-foreground">
                              {r.entrada ? format(new Date(r.entrada), 'HH:mm') : '--:--'}
                            </td>
                            <td className="px-5 py-3 text-xs font-mono text-muted-foreground">
                              {r.salida ? format(new Date(r.salida), 'HH:mm') : '--:--'}
                            </td>
                            <td className="px-5 py-3">
                              {(r.justInicio || r.justFin) ? (
                                <div className="flex gap-1">
                                  {r.justInicio && <Badge className="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-none text-[9px] px-1.5">E: {r.justInicio}</Badge>}
                                  {r.justFin && <Badge className="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border-none text-[9px] px-1.5">S: {r.justFin}</Badge>}
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
              <div className="flex items-center gap-2 bg-card dark:bg-slate-900 p-1.5 rounded-xl border border-border shadow-sm">
                <MapPin className="w-4 h-4 text-muted-foreground/70 ml-2" />
                <Select value={localidadFilter} onValueChange={setLocalidadFilter}>
                  <SelectTrigger className="w-[200px] border-none focus:ring-0 font-bold text-foreground/80 text-xs">
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
                    <Card className="rounded-2xl border border-border/50 shadow-sm p-5">
                      <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">Total Socios</p>
                      <p className="text-2xl font-black text-foreground mt-1">{filteredTotal}</p>
                    </Card>
                    <Card className="rounded-2xl border border-border/50 shadow-sm p-5">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Con Mz + Lote</p>
                      <p className="text-2xl font-black text-emerald-600 mt-1">{socioStats.conDatos}</p>
                    </Card>
                    <Card className="rounded-2xl border border-border/50 shadow-sm p-5">
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Sin Datos</p>
                      <p className="text-2xl font-black text-amber-600 mt-1">{socioStats.sinDatos}</p>
                    </Card>
                    <Card className="rounded-2xl border border-border/50 shadow-sm p-5">
                      <p className="text-[10px] font-black text-[#4892CC] uppercase tracking-widest">Cobertura</p>
                      <p className="text-2xl font-black text-[#4892CC] mt-1">
                        {socioStats.total > 0 ? ((socioStats.conDatos / socioStats.total) * 100).toFixed(1) : 0}%
                      </p>
                    </Card>
                  </div>

                  <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden col-span-2 md:col-span-4 mt-4">
                    <CardHeader className="p-5 border-b border-slate-50 bg-muted/50/50">
                      <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#4892CC]" /> Progreso Operativo por Localidad
                      </CardTitle>
                      <CardDescription>Muestra los documentos faltantes críticos por sector</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-muted/50/50 text-muted-foreground/70 text-[10px] font-black uppercase tracking-widest border-y border-border/50">
                            <th className="px-5 py-3">Localidad</th>
                            <th className="px-5 py-3 text-center">Total Socios</th>
                            <th className="px-5 py-3 text-center text-amber-500">Planos Faltantes</th>
                            <th className="px-5 py-3 text-center text-rose-500">Fichas Faltantes</th>
                            <th className="px-5 py-3">Progreso</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {progresoData?.filter(p => localidadFilter === 'all' || p.localidad === localidadFilter).map((row: any, i: number) => {
                             const completedDocs = row.total_socios - row.planos_pendientes;
                             const pct = row.total_socios > 0 ? (completedDocs / row.total_socios * 100) : 0;
                             
                             return (
                              <tr key={i} className="hover:bg-muted/50/50 transition-colors">
                                <td className="px-5 py-3">
                                  <p className="font-bold text-foreground/80 text-sm">{row.localidad || 'Sin Localidad'}</p>
                                  <p className="text-[10px] text-muted-foreground/70 font-bold uppercase">{row.zona_distrito || 'Sin Distrito'}</p>
                                </td>
                                <td className="px-5 py-3 text-center font-black text-foreground">{row.total_socios}</td>
                                <td className="px-5 py-3 text-center font-bold text-amber-600">{row.planos_pendientes > 0 ? row.planos_pendientes : '✅'}</td>
                                <td className="px-5 py-3 text-center font-bold text-rose-600">{row.fichas_pendientes > 0 ? row.fichas_pendientes : '✅'}</td>
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden w-24">
                                      <div className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-4000" : "bg-[#4892CC]")} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-[10px] font-black text-muted-foreground">{pct.toFixed(0)}%</span>
                                  </div>
                                </td>
                              </tr>
                             );
                          })}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </TabsContent>

           {/* ════════ AUDITORIA GERENCIAL ════════ */}
          {isFinanceUser && (
            <TabsContent value="gerencial" className="space-y-6">
              {/* Filtro de localidad */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-card dark:bg-slate-900 p-1.5 rounded-xl border border-border shadow-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground/70 ml-2" />
                  <Select value={localidadFilter} onValueChange={setLocalidadFilter}>
                    <SelectTrigger className="w-[200px] border-none focus:ring-0 font-bold text-foreground/80 text-xs">
                      <SelectValue placeholder="Localidad" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Todas las localidades</SelectItem>
                      {(socioStats?.localidades || []).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loadingGerencial ? (
                 <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#4892CC]" /></div>
              ) : gerencialData && (
                 <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <Card className="rounded-2xl border border-border/50 shadow-sm p-5 bg-gradient-to-br from-white to-red-50/30">
                          <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-500"/> Riesgo Morosidad</p>
                          <p className="text-2xl font-black text-red-600 mt-1">{gerencialData.morosidad.filter((m:any) => (localidadFilter === 'all' || m.localidad === localidadFilter) && (!m.last_income_date || new Date(m.last_income_date) < subMonths(new Date(), 3))).length}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">Socios &gt; 3 meses sin pago</p>
                       </Card>
                       <Card className="rounded-2xl border border-border/50 shadow-sm p-5 bg-gradient-to-br from-white to-amber-50/30">
                          <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest flex items-center gap-1"><FileText className="w-3 h-3 text-amber-500"/> Fichas Faltantes Global</p>
                          <p className="text-2xl font-black text-foreground mt-1">{gerencialData.socioEstado.filter((s:any) => (localidadFilter === 'all' || s.localidad === localidadFilter) && s['FICHA OK'] === false).length}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">Socios sin ficha entregada</p>
                       </Card>
                       <Card className="rounded-2xl border border-border/50 shadow-sm p-5 bg-gradient-to-br from-white to-emerald-50/30">
                          <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500"/> Contratos Completos</p>
                          <p className="text-2xl font-black text-emerald-600 mt-1">{gerencialData.socioEstado.filter((s:any) => (localidadFilter === 'all' || s.localidad === localidadFilter) && s['CONTRATO OK'] === true).length}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">Socios formalizados al 100%</p>
                       </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                       {/* Morosidad Alerta */}
                       <Card className="rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                         <CardHeader className="p-5 border-b border-red-50 bg-red-50/30 dark:bg-red-500/10 dark:text-red-400">
                           <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2 text-red-800">
                             <AlertTriangle className="w-4 h-4 text-red-500" /> Alerta de Morosidad (Críticos)
                           </CardTitle>
                           <CardDescription>Top socios con mayor antigüedad sin pagos</CardDescription>
                         </CardHeader>
                         <CardContent className="p-0 max-h-[300px] overflow-y-auto">
                            <div className="divide-y divide-slate-50">
                               {gerencialData.morosidad.filter((m:any) => localidadFilter === 'all' || m.localidad === localidadFilter).slice(0,50).map((m:any, i:number) => (
                                  <div key={i} className="px-5 py-3 flex justify-between items-center hover:bg-muted/50 transition-colors">
                                     <div>
                                        <p className="font-bold text-foreground/80 text-xs uppercase">{m.nombres} {m.apellidoPaterno}</p>
                                        <p className="text-[10px] text-muted-foreground/70">{m.localidad || 'Sin Localidad'}</p>
                                     </div>
                                     <div className="text-right">
                                        <p className="font-black text-red-600 text-xs">{m.last_income_date ? safeFormatDate(m.last_income_date, 'dd/MM/yyyy') : 'NUNCA'}</p>
                                        <p className="text-[9px] text-muted-foreground/70 font-bold uppercase">Último Pago</p>
                                     </div>
                                  </div>
                               ))}
                            </div>
                         </CardContent>
                       </Card>
                       
                       {/* Ingresos x Zona */}
                       <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                         <CardHeader className="p-5 border-b border-slate-50 bg-muted/50/50">
                           <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                             <TrendingUp className="w-4 h-4 text-emerald-500" /> Ingresos por Zona
                           </CardTitle>
                           <CardDescription>Rentabilidad histórica por localidad</CardDescription>
                         </CardHeader>
                         <CardContent className="p-0 max-h-[300px] overflow-y-auto">
                            <div className="divide-y divide-slate-50">
                               {gerencialData.ingresosLocalidad.filter((ing:any) => localidadFilter === 'all' || ing.localidad === localidadFilter).slice(0,20).map((ing:any, i:number) => (
                                  <div key={i} className="px-5 py-3 flex justify-between items-center hover:bg-muted/50 transition-colors">
                                     <div>
                                        <p className="font-bold text-foreground/80 text-xs uppercase">{ing.localidad || 'General'}</p>
                                        <p className="text-[10px] text-muted-foreground/70 font-bold">{ing.mes}</p>
                                     </div>
                                     <div className="text-right">
                                        <p className="font-black text-emerald-600 text-sm">{formatCurrency(ing.total_amount)}</p>
                                        <p className="text-[9px] text-muted-foreground/70 font-bold">{ing.total_transactions} transacciones</p>
                                     </div>
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

          {/* ════════ REPORTE OBSERVACIONES ════════ */}
          <TabsContent value="observaciones" className="space-y-6">
            {loadingObservaciones ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
            ) : observacionesStats ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="rounded-2xl border border-amber-200/50 dark:border-amber-900/30 shadow-sm p-6 bg-amber-50/50 dark:bg-amber-900/10">
                    <p className="text-xs font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">Asociaciones Observadas</p>
                    <p className="text-4xl font-black text-amber-700 dark:text-amber-400 mt-2">{observacionesStats.totalAssociations}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-1">Con al menos 1 observación</p>
                  </Card>
                  <Card className="rounded-2xl border border-border shadow-sm p-6">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Obs. de Personas</p>
                    <p className="text-4xl font-black text-foreground mt-2">{observacionesStats.totalPersonObs}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-1">Documentos o datos faltantes</p>
                  </Card>
                  <Card className="rounded-2xl border border-border shadow-sm p-6">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Obs. de Pagos</p>
                    <p className="text-4xl font-black text-foreground mt-2">{observacionesStats.totalPaymentObs}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-1">Irregularidades financieras</p>
                  </Card>
                </div>

                <Card className="rounded-2xl border border-border shadow-sm overflow-hidden">
                  <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-lg font-black text-foreground flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" /> Detalle por Asociación
                    </CardTitle>
                    <CardDescription>Resumen consolidado de observaciones personales y de pagos.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b text-xs uppercase font-bold text-muted-foreground">
                          <tr>
                            <th className="px-6 py-4">Asociación / Localidad</th>
                            <th className="px-6 py-4 text-center">Obs. Persona</th>
                            <th className="px-6 py-4 text-center">Obs. Pagos</th>
                            <th className="px-6 py-4 text-center">Total Observaciones</th>
                            <th className="px-6 py-4">Nivel de Riesgo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {observacionesStats.byLocalidad.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                ¡Excelente! No hay observaciones registradas.
                              </td>
                            </tr>
                          ) : (
                            observacionesStats.byLocalidad.map((loc: any, idx: number) => {
                              const isHighRisk = loc.total >= 10;
                              return (
                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-foreground">{loc.localidad}</td>
                                  <td className="px-6 py-4 text-center">
                                    {loc.personObs > 0 ? (
                                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50">{loc.personObs}</Badge>
                                    ) : <span className="text-muted-foreground/30">-</span>}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    {loc.paymentObs > 0 ? (
                                      <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50">{loc.paymentObs}</Badge>
                                    ) : <span className="text-muted-foreground/30">-</span>}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <span className="font-black text-lg">{loc.total}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className={cn("w-2 h-2 rounded-full", isHighRisk ? "bg-red-500" : "bg-amber-400")} />
                                      <span className={cn("text-xs font-bold uppercase", isHighRisk ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-500")}>
                                        {isHighRisk ? 'Alto Riesgo' : 'Atención'}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>
        </Tabs>
      )}
    </div>
    </div>
  );
};

export default ReportesPage;
