import { useState, useMemo } from 'react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ShieldAlert, Search, FileText, Download, Calendar, Eye, Filter,
  ChevronDown, ChevronRight, Table2, Clock, Plus, Pencil, Trash2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui-custom/DataTable';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useDebounce } from '@/hooks/useDebounce';
// Librería xlsx importada dinámicamente cuando se requiere

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  created_at: string;
}

// ─── Spanish labels for table_name ───────────────────────────
const TABLE_LABELS: Record<string, string> = {
  ingresos: 'Ingreso',
  gastos: 'Gasto',
  socio_titulares: 'Socio',
  presupuestos_operativos: 'Presupuesto',
  colaboradores: 'Colaborador',
  cuentas_bancarias: 'Cuenta Bancaria',
  categorias: 'Categoría',
  proveedores: 'Proveedor',
  proyectos: 'Proyecto',
  documentos: 'Documento',
  perfiles: 'Perfil',
  notificaciones: 'Notificación',
  audit_logs: 'Auditoría',
};

function getTableLabel(tableName: string): string {
  return TABLE_LABELS[tableName] ?? tableName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Action descriptor in Spanish ────────────────────────────
function getActionLabel(action: string, tableName: string): string {
  const label = getTableLabel(tableName);
  switch (action.toUpperCase()) {
    case 'INSERT': return `Registró nuevo ${label}`;
    case 'UPDATE': return `Actualizó ${label}`;
    case 'DELETE': return `Eliminó ${label}`;
    default: return `${action} en ${label}`;
  }
}

// ─── Formatting helpers ──────────────────────────────────────
function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Sí' : 'No';
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
}

function prettyKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Diff computation ────────────────────────────────────────
interface DiffEntry {
  key: string;
  oldVal: unknown;
  newVal: unknown;
}

function computeDiff(oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null): DiffEntry[] {
  if (!oldData || !newData) return [];
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  const diffs: DiffEntry[] = [];
  keys.forEach(key => {
    const oldVal = oldData[key];
    const newVal = newData[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diffs.push({ key, oldVal, newVal });
    }
  });
  return diffs;
}

// ─── Action color maps ───────────────────────────────────────
const ACTION_DOT_COLORS: Record<string, string> = {
  INSERT: 'bg-emerald-500 shadow-emerald-500/40',
  UPDATE: 'bg-corp-blue shadow-corp-blue/40',
  DELETE: 'bg-red-500 shadow-red-500/40',
};

const ACTION_ICON_BG: Record<string, string> = {
  INSERT: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  UPDATE: 'bg-blue-50 text-corp-blue dark:bg-blue-500/10 dark:text-blue-400',
  DELETE: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
};

const ACTION_ICONS: Record<string, typeof Plus> = {
  INSERT: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
};

// ─── Timeline Entry ──────────────────────────────────────────
function TimelineEntry({ log, index }: { log: AuditLog; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const actionUpper = log.action.toUpperCase();
  const dotColor = ACTION_DOT_COLORS[actionUpper] ?? 'bg-gray-400';
  const iconBg = ACTION_ICON_BG[actionUpper] ?? 'bg-gray-50 text-gray-600';
  const ActionIcon = ACTION_ICONS[actionUpper] ?? FileText;
  const diffs = actionUpper === 'UPDATE' ? computeDiff(log.old_data, log.new_data) : [];
  const dataToShow = actionUpper === 'INSERT' ? log.new_data : actionUpper === 'DELETE' ? log.old_data : null;

  const userInitial = log.user_id ? log.user_id.charAt(0).toUpperCase() : '?';

  return (
    <div
      className="relative flex gap-4 md:gap-6 pb-8 last:pb-0 group animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index * 60, 600)}ms` }}
    >
      {/* Vertical line */}
      <div className="absolute left-[15px] md:left-[17px] top-9 bottom-0 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent dark:from-slate-700 dark:via-slate-700 group-last:hidden" />

      {/* Dot */}
      <div className="relative z-10 flex-shrink-0 mt-1">
        <div className={`w-[10px] h-[10px] md:w-[12px] md:h-[12px] rounded-full ${dotColor} shadow-lg ring-4 ring-white dark:ring-slate-900 transition-transform group-hover:scale-125`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className="bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 md:p-5 shadow-premium hover:shadow-premium-lg transition-all duration-300 cursor-pointer group/card"
          onClick={() => setExpanded(!expanded)}
        >
          {/* Top row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Action icon */}
              <div className={`flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center ${iconBg} transition-transform group-hover/card:scale-110`}>
                <ActionIcon size={16} />
              </div>

              <div className="min-w-0">
                <p className="font-bold text-sm md:text-[15px] text-slate-800 dark:text-slate-100 leading-snug">
                  {getActionLabel(log.action, log.table_name)}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {/* User avatar */}
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 text-[10px] font-black text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0">
                      {userInitial}
                    </span>
                    <span className="truncate max-w-[180px]" title={log.user_id || 'Sistema'}>{(log.user_id || 'Sistema').substring(0, 8)}…</span>
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
                    <Clock size={11} className="flex-shrink-0" />
                    {formatDistanceToNow(parseISO(log.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
              </div>
            </div>

            {/* Expand chevron */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={`text-[10px] font-bold px-2 py-0.5 border-none ${
                actionUpper === 'INSERT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' :
                actionUpper === 'UPDATE' ? 'bg-blue-100 text-corp-blue dark:bg-blue-500/15 dark:text-blue-400' :
                actionUpper === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' :
                'bg-gray-100 text-gray-700'
              }`}>
                {log.table_name}
              </Badge>
              {expanded
                ? <ChevronDown size={16} className="text-slate-400 transition-transform" />
                : <ChevronRight size={16} className="text-slate-400 transition-transform" />
              }
            </div>
          </div>

          {/* Expanded detail */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 animate-slide-up-fade">
              {/* UPDATE: show diff */}
              {actionUpper === 'UPDATE' && diffs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Campos modificados</p>
                  <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700/50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800">
                          <th className="text-left px-3 py-2 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Campo</th>
                          <th className="text-left px-3 py-2 font-bold text-red-400 uppercase tracking-wider text-[10px]">Antes</th>
                          <th className="text-left px-3 py-2 font-bold text-emerald-500 uppercase tracking-wider text-[10px]">Después</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diffs.map(diff => (
                          <tr key={diff.key} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{prettyKey(diff.key)}</td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-red-500 dark:text-red-400 bg-red-50/40 dark:bg-red-500/5 break-all">
                              <span className="line-through opacity-70">{formatValue(diff.oldVal)}</span>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-500/5 break-all">
                              {formatValue(diff.newVal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {diffs.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No se detectaron cambios entre los datos.</p>
                  )}
                </div>
              )}

              {/* INSERT or DELETE: show record fields */}
              {(actionUpper === 'INSERT' || actionUpper === 'DELETE') && dataToShow && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                    {actionUpper === 'INSERT' ? 'Datos del nuevo registro' : 'Datos del registro eliminado'}
                  </p>
                  <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700/50">
                    <table className="w-full text-xs">
                      <tbody>
                        {Object.entries(dataToShow as Record<string, unknown>).map(([key, val]) => (
                          <tr key={key} className="border-t first:border-t-0 border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap w-1/3">{prettyKey(key)}</td>
                            <td className={`px-3 py-2.5 font-mono text-[11px] break-all ${
                              actionUpper === 'INSERT'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-500 dark:text-red-400 line-through opacity-80'
                            }`}>
                              {formatValue(val)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Fallback: no data */}
              {!dataToShow && actionUpper !== 'UPDATE' && (
                <p className="text-xs text-slate-400 italic">Sin datos disponibles para esta acción.</p>
              )}

              {/* Metadata */}
              <div className="mt-4 flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                <span className="font-mono">{log.record_id}</span>
                <span>·</span>
                <span>{format(parseISO(log.created_at), "dd MMM yyyy, HH:mm:ss", { locale: es })}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function AuditPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [viewMode, setViewMode] = useState<'tabla' | 'timeline'>('timeline');

  const { data: logs, loading } = useSupabaseData<AuditLog>({
    tableName: 'audit_logs',
    selectQuery: '*',
    initialSort: { column: 'created_at', ascending: false },
    limit: 500, // Fetching the last 500 for demonstration
  });

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = debouncedSearchTerm === '' ||
        log.table_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        log.record_id.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      return matchSearch;
    });
  }, [logs, debouncedSearchTerm]);

  const exportToExcel = async () => {
    const exportData = filteredLogs.map(log => ({
      ID: log.id,
      Usuario_ID: log.user_id,
      Acción: log.action,
      Tabla: log.table_name,
      Registro_ID: log.record_id,
      Fecha: format(parseISO(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
      Datos_Viejos: JSON.stringify(log.old_data),
      Datos_Nuevos: JSON.stringify(log.new_data)
    }));

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditoria");
    XLSX.writeFile(wb, `Reporte_Auditoria_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  const getActionBadge = (action: string) => {
    switch(action.toUpperCase()) {
      case 'INSERT': return <Badge className="bg-emerald-100 text-emerald-700 border-none px-3 font-black">INSERTAR</Badge>;
      case 'UPDATE': return <Badge className="bg-amber-100 text-amber-700 border-none px-3 font-black">ACTUALIZAR</Badge>;
      case 'DELETE': return <Badge className="bg-red-100 text-red-700 border-none px-3 font-black">ELIMINAR</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-700 border-none px-3 font-black">{action}</Badge>;
    }
  };

  const columns = [
    {
      accessorKey: 'action',
      header: 'Acción',
      cell: ({ row }: any) => getActionBadge(row.original.action)
    },
    {
      accessorKey: 'table_name',
      header: 'Tabla Afectada',
      cell: ({ row }: any) => <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{row.original.table_name}</span>
    },
    {
      accessorKey: 'record_id',
      header: 'ID del Registro',
      cell: ({ row }: any) => <span className="text-[11px] text-slate-400 font-mono" title={row.original.record_id}>{(row.original.record_id || '').substring(0, 8)}...</span>
    },
    {
      accessorKey: 'created_at',
      header: 'Fecha y Hora',
      cell: ({ row }: any) => (
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <Calendar size={12} className="text-slate-400" />
          {format(parseISO(row.original.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
        </span>
      )
    },
    {
      id: 'actions',
      header: 'Detalle',
      cell: ({ row }: any) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg font-bold border-slate-200 text-[#4892CC] hover:bg-[#E8F1F8] hover:text-[#4892CC] hover:border-transparent"
          onClick={() => setSelectedLog(row.original)}
        >
          <Eye size={14} className="mr-1.5" /> Inspeccionar
        </Button>
      )
    }
  ];

  return (
    <div className="pb-20 bg-[#FAFBFC] dark:bg-background min-h-screen page-enter">
      {/* HEADER */}
      <header className="relative h-auto py-8 md:h-64 flex items-center overflow-hidden bg-white dark:bg-card border-b border-slate-100/60 dark:border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/[0.03] via-transparent to-slate-900/[0.02] z-0"></div>
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <Badge className="mb-3 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-none font-bold px-4 py-1 rounded-full text-[10px] md:text-xs tracking-widest uppercase flex items-center w-fit gap-1.5">
                <ShieldAlert size={12} /> Seguridad y Auditoría
              </Badge>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-foreground tracking-tight">
                Historial de <span className="text-slate-500 dark:text-slate-400">Cambios</span>
              </h1>
              <p className="text-gray-500 dark:text-muted-foreground font-medium mt-2 max-w-xl">
                Monitorea cada registro insertado, actualizado o eliminado en el sistema. Los cambios son inmutables y quedan registrados de por vida.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* FILTERS & STATS */}
      <div className="container mx-auto px-4 md:px-8 -mt-6 md:-mt-8 relative z-20">
        <div className="bg-white/80 dark:bg-card/80 backdrop-blur-xl border border-slate-200/60 dark:border-border p-4 rounded-2xl shadow-premium flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Buscar por tabla, acción o ID de registro..."
              className="pl-12 h-14 bg-white/50 dark:bg-background/50 border-slate-200 dark:border-border focus:bg-white dark:focus:bg-background rounded-xl font-medium w-full text-base transition-all focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            {/* View toggle */}
            <div className="flex rounded-xl border border-slate-200 dark:border-border overflow-hidden h-14">
              <button
                onClick={() => setViewMode('tabla')}
                className={`px-4 flex items-center gap-2 text-sm font-bold transition-all ${
                  viewMode === 'tabla'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-card dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <Table2 size={16} />
                <span className="hidden sm:inline">Tabla</span>
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-4 flex items-center gap-2 text-sm font-bold transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-card dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <Clock size={16} />
                <span className="hidden sm:inline">Timeline</span>
              </button>
            </div>

            <Button variant="outline" className="h-14 rounded-xl px-6 border-slate-200 dark:border-border font-bold text-slate-600 dark:text-slate-400 flex-1 md:flex-none">
              <Filter className="w-4 h-4 mr-2" /> Filtros
            </Button>
            <Button
              className="h-14 rounded-xl px-6 bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-emerald-100 shadow-lg flex-1 md:flex-none transition-all active:scale-95"
              onClick={exportToExcel}
            >
              <Download className="w-4 h-4 mr-2" /> Exportar Logs
            </Button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="container mx-auto px-4 md:px-8 mt-8">
        {viewMode === 'tabla' ? (
          /* ─── TABLE VIEW ─── */
          <Card className="rounded-3xl border-none shadow-premium bg-white dark:bg-card overflow-hidden animate-fade-in-up">
            <div className="p-1">
              <DataTable
                columns={columns}
                data={filteredLogs}
                isLoading={loading}
              />
            </div>
          </Card>
        ) : (
          /* ─── TIMELINE VIEW ─── */
          <div className="max-w-3xl mx-auto animate-fade-in">
            {loading ? (
              <div className="space-y-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse mt-1.5" />
                    <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 space-y-3 animate-pulse">
                      <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-700 rounded-lg" />
                      <div className="h-3 w-1/3 bg-slate-100 dark:bg-slate-700 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Clock size={28} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Sin registros</h3>
                <p className="text-sm text-slate-400 mt-1">No se encontraron logs con los filtros actuales.</p>
              </div>
            ) : (
              <div className="pl-2">
                {filteredLogs.map((log, index) => (
                  <TimelineEntry key={log.id} log={log} index={index} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DETAIL */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-[#FAFBFC] dark:bg-card border-slate-200 dark:border-border rounded-3xl">
          <div className="p-6 bg-white dark:bg-card border-b border-slate-100 dark:border-border flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-black text-slate-900 dark:text-foreground flex items-center gap-2">
                <FileText className="text-[#4892CC] w-6 h-6" /> Detalle de la Transacción
              </DialogTitle>
              <DialogDescription className="font-medium mt-1">
                Inspección profunda del cambio en la base de datos
              </DialogDescription>
            </div>
            {selectedLog && getActionBadge(selectedLog.action)}
          </div>

          {selectedLog && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tabla</p>
                  <p className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 w-fit px-2 py-0.5 rounded-md">{selectedLog.table_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Usuario ID</p>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate" title={selectedLog.user_id || 'Sistema'}>{selectedLog.user_id || 'Sistema'}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registro Afectado (UUID)</p>
                  <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">{selectedLog.record_id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* OLD DATA */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <h4 className="font-black text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide">Datos Anteriores</h4>
                  </div>
                  <div className="bg-slate-900 rounded-2xl p-4 overflow-auto max-h-[300px] border border-slate-800 shadow-inner">
                    {selectedLog.old_data ? (
                      <pre className="text-[11px] text-red-300 font-mono leading-relaxed">
                        {JSON.stringify(selectedLog.old_data, null, 2)}
                      </pre>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-600 text-[11px] font-mono italic p-4">
                        (Null) Registro nuevo
                      </div>
                    )}
                  </div>
                </div>

                {/* NEW DATA */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <h4 className="font-black text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide">Datos Nuevos</h4>
                  </div>
                  <div className="bg-slate-900 rounded-2xl p-4 overflow-auto max-h-[300px] border border-slate-800 shadow-inner">
                    {selectedLog.new_data ? (
                      <pre className="text-[11px] text-emerald-300 font-mono leading-relaxed">
                        {JSON.stringify(selectedLog.new_data, null, 2)}
                      </pre>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-600 text-[11px] font-mono italic p-4">
                        (Null) Registro eliminado
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
