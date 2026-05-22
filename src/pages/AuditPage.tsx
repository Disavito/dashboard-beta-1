import { useState, useMemo } from 'react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShieldAlert, Search, FileText, Download, Calendar, Eye, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui-custom/DataTable';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { utils, writeFile } from 'xlsx';

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

export default function AuditPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logs, loading } = useSupabaseData<AuditLog>({
    tableName: 'audit_logs',
    selectQuery: '*',
    limit: 500, // Fetching the last 500 for demonstration
  });

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = searchTerm === '' || 
        log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.record_id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [logs, searchTerm]);

  const exportToExcel = () => {
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

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Auditoria");
    writeFile(wb, `Reporte_Auditoria_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
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
      cell: ({ row }: any) => <span className="text-[11px] text-slate-400 font-mono" title={row.original.record_id}>{row.original.record_id.substring(0, 8)}...</span>
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
    <div className="pb-20 bg-[#FAFBFC] min-h-screen page-enter">
      {/* HEADER */}
      <header className="relative h-auto py-8 md:h-64 flex items-center overflow-hidden bg-white border-b border-slate-100/60">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/[0.03] via-transparent to-slate-900/[0.02] z-0"></div>
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <Badge className="mb-3 bg-slate-100 text-slate-600 border-none font-bold px-4 py-1 rounded-full text-[10px] md:text-xs tracking-widest uppercase flex items-center w-fit gap-1.5">
                <ShieldAlert size={12} /> Seguridad y Auditoría
              </Badge>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">
                Historial de <span className="text-slate-500">Cambios</span>
              </h1>
              <p className="text-gray-500 font-medium mt-2 max-w-xl">
                Monitorea cada registro insertado, actualizado o eliminado en el sistema. Los cambios son inmutables y quedan registrados de por vida.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* FILTERS & STATS */}
      <div className="container mx-auto px-4 md:px-8 -mt-6 md:-mt-8 relative z-20">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 p-4 rounded-2xl shadow-premium flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input 
              placeholder="Buscar por tabla, acción o ID de registro..." 
              className="pl-12 h-14 bg-white/50 border-slate-200 focus:bg-white rounded-xl font-medium w-full text-base transition-all focus:ring-4 focus:ring-slate-100"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button variant="outline" className="h-14 rounded-xl px-6 border-slate-200 font-bold text-slate-600 flex-1 md:flex-none">
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

      {/* TABLE */}
      <div className="container mx-auto px-4 md:px-8 mt-8">
        <Card className="rounded-3xl border-none shadow-premium bg-white overflow-hidden animate-fade-in-up">
          <div className="p-1">
            <DataTable 
              columns={columns} 
              data={filteredLogs} 
              isLoading={loading}
            />
          </div>
        </Card>
      </div>

      {/* MODAL DETAIL */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-[#FAFBFC] border-slate-200 rounded-3xl">
          <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
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
                  <p className="font-mono text-sm font-bold text-slate-800 bg-slate-100 w-fit px-2 py-0.5 rounded-md">{selectedLog.table_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Usuario ID</p>
                  <p className="text-xs font-medium text-slate-700 truncate" title={selectedLog.user_id}>{selectedLog.user_id}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registro Afectado (UUID)</p>
                  <p className="text-xs font-mono font-medium text-slate-700">{selectedLog.record_id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* OLD DATA */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <h4 className="font-black text-sm text-slate-800 uppercase tracking-wide">Datos Anteriores</h4>
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
                    <h4 className="font-black text-sm text-slate-800 uppercase tracking-wide">Datos Nuevos</h4>
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
