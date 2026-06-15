import { useState } from 'react';
import { 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileSpreadsheet, 
  FileText, 
  FileJson, 
  Download, 
  Settings2,
  CheckCircle2,
  Loader2,
  X
} from 'lucide-react';
// Librerías de exportación cargadas de forma diferida (lazy load)
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExportSociosDialogProps {
  onClose: () => void;
  data?: any[];
}

const EXPORT_FIELDS = [
  { id: 'dni', label: 'DNI', category: 'Básico' },
  { id: 'fullName', label: 'Nombre Completo', category: 'Básico' },
  { id: 'localidad', label: 'Comunidad/Localidad', category: 'Básico' },
  { id: 'distritoVivienda', label: 'Distrito Vivienda', category: 'Básico' },
  { id: 'mz', label: 'Manzana', category: 'Básico' },
  { id: 'lote', label: 'Lote', category: 'Básico' },
  { id: 'is_lote_medido', label: 'Lote Medido', category: 'Básico' },
  { id: 'observacion', label: 'Obs. General (Socio)', category: 'Básico' },
  { id: 'receiptNumber', label: 'N° de Recibo', category: 'Financiero' },
  { id: 'status', label: 'Estado de Pago', category: 'Financiero' },
  { id: 'payment_observation_detail', label: 'Obs. Financiera (Pago)', category: 'Financiero' },
  { id: 'has_planos', label: 'Planos', category: 'Documentos' },
  { id: 'has_memoria', label: 'Memoria Descriptiva', category: 'Documentos' },
  { id: 'has_ficha', label: 'Ficha Técnica', category: 'Documentos' },
  { id: 'has_contrato', label: 'Contrato', category: 'Documentos' },
];

export default function ExportSociosDialog({ onClose, data: externalData }: ExportSociosDialogProps) {
  const { data: fetchedData, loading } = useSupabaseData<any>({
    tableName: 'vw_socio_titulares_estado',
    fetchAll: true,
    enabled: !externalData // Only fetch if externalData is not provided
  });

  const data = externalData || fetchedData || [];

  const [selectedFields, setSelectedFields] = useState<string[]>(['dni', 'fullName', 'localidad', 'mz', 'lote', 'receiptNumber', 'observacion', 'payment_observation_detail']);
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'pdf'>('xlsx');
  const [isExporting, setIsExporting] = useState(false);
  const [loteMedidoFilter, setLoteMedidoFilter] = useState<'all' | 'medido' | 'no_medido'>('all');
  const [distritoFilter, setDistritoFilter] = useState<string>('all');
  const [localidadFilter, setLocalidadFilter] = useState<string>('all');

  // Extraer distritos y localidades únicas de los datos
  const uniqueDistritos = Array.from(new Set(data.map((item: any) => item.distritoVivienda).filter(Boolean))).sort() as string[];
  const dataForLocalidades = distritoFilter !== 'all' ? data.filter((item: any) => item.distritoVivienda === distritoFilter) : data;
  const uniqueLocalidades = Array.from(new Set(dataForLocalidades.map((item: any) => item.localidad).filter(Boolean))).sort() as string[];

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId) 
        : [...prev, fieldId]
    );
  };

  const getFilteredData = () => {
    let filtered = [...data];
    if (loteMedidoFilter === 'medido') {
      filtered = filtered.filter(item => item.is_lote_medido === true);
    } else if (loteMedidoFilter === 'no_medido') {
      filtered = filtered.filter(item => !item.is_lote_medido);
    }
    if (distritoFilter !== 'all') {
      filtered = filtered.filter(item => item.distritoVivienda === distritoFilter);
    }
    if (localidadFilter !== 'all') {
      filtered = filtered.filter(item => item.localidad === localidadFilter);
    }
    return filtered;
  };

  const prepareData = () => {
    const filtered = getFilteredData();
    return filtered.map(item => {
      const row: any = {};
      if (selectedFields.includes('dni')) row['DNI'] = item.dni;
      if (selectedFields.includes('fullName')) row['Socio'] = `${item.nombres} ${item.apellidoPaterno} ${item.apellidoMaterno}`;
      if (selectedFields.includes('localidad')) row['Localidad'] = item.localidad;
      if (selectedFields.includes('mz')) row['Manzana'] = item.mz || '-';
      if (selectedFields.includes('lote')) row['Lote'] = item.lote || '-';
      if (selectedFields.includes('is_lote_medido')) row['Lote Medido'] = item.is_lote_medido ? 'SÍ' : 'NO';
      if (selectedFields.includes('receiptNumber')) row['N° Recibo'] = item.receiptNumber;
      if (selectedFields.includes('status')) row['Estado'] = item.status;
      if (selectedFields.includes('observacion')) row['Obs. General'] = item.observacion || '-';
      if (selectedFields.includes('payment_observation_detail')) row['Obs. Financiera'] = item.payment_observation_detail || '-';
      
      if (selectedFields.includes('has_planos')) row['Planos'] = item.has_planos ? 'SÍ' : 'NO';
      if (selectedFields.includes('has_memoria')) row['Memoria'] = item.has_memoria ? 'SÍ' : 'NO';
      if (selectedFields.includes('has_ficha')) row['Ficha'] = item.has_ficha ? 'SÍ' : 'NO';
      if (selectedFields.includes('has_contrato')) row['Contrato'] = item.has_contrato ? 'SÍ' : 'NO';
      if (selectedFields.includes('distritoVivienda')) row['Distrito Vivienda'] = item.distritoVivienda || '-';
      
      return row;
    });
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error('Selecciona al menos un campo para exportar');
      return;
    }

    setIsExporting(true);
    const exportData = prepareData();

    if (exportData.length === 0) {
      toast.error('No hay datos para exportar con los filtros seleccionados');
      setIsExporting(false);
      return;
    }

    const fileName = `reporte_socios_${new Date().toISOString().split('T')[0]}`;

    try {
      if (format === 'xlsx' || format === 'csv') {
        const XLSX = await import('xlsx');
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Socios");
        
        if (format === 'xlsx') {
          XLSX.writeFile(workbook, `${fileName}.xlsx`);
        } else {
          XLSX.writeFile(workbook, `${fileName}.csv`, { bookType: 'csv' });
        }
      } else if (format === 'pdf') {
        const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
          import('jspdf'),
          import('jspdf-autotable')
        ]);
        const doc = new jsPDF({ orientation: 'landscape' });
        
        doc.setFontSize(18);
        doc.text('Reporte Detallado de Socios', 14, 22);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 30);

        const filterLabel = loteMedidoFilter === 'medido' ? ' (Solo Medidos)' 
          : loteMedidoFilter === 'no_medido' ? ' (Solo No Medidos)' : '';
        if (filterLabel) {
          doc.text(`Filtro: ${filterLabel}`, 14, 36);
        }

        autoTable(doc, {
          startY: filterLabel ? 42 : 35,
          head: [Object.keys(exportData[0])],
          body: exportData.map(row => Object.values(row)),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [72, 146, 204], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 249, 252] },
        });

        doc.save(`${fileName}.pdf`);
      }
      
      toast.success('Exportación completada con éxito');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el archivo');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredCount = getFilteredData().length;

  return (
    <div className="flex flex-col max-h-[90vh] md:max-h-[85vh]">
      {/* Header Fijo */}
      <div className="p-6 md:p-8 pb-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-[#4892CC]/10 rounded-2xl flex items-center justify-center">
            <Settings2 className="h-5 w-5 md:h-6 md:w-6 text-[#4892CC]" />
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden rounded-full">
            <X className="h-5 w-5 text-muted-foreground/70" />
          </Button>
        </div>
        <DialogTitle className="text-xl md:text-2xl font-black text-foreground">Configurar Exportación</DialogTitle>
        <DialogDescription className="text-muted-foreground font-medium text-sm">
          Selecciona los campos y el formato para tu reporte.
        </DialogDescription>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#4892CC] mb-4" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Cargando registros...</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 px-6 md:px-8 py-6">
        <div className="space-y-8 pb-6">
          {/* Formatos */}
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {[
              { id: 'xlsx', label: 'Excel', icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' },
              { id: 'csv', label: 'CSV', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400' },
              { id: 'pdf', label: 'PDF', icon: FileJson, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10 dark:text-red-400' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id as any)}
                className={cn(
                  "flex flex-col items-center justify-center p-3 md:p-4 rounded-2xl border-2 transition-all gap-2 relative",
                  format === f.id 
                    ? "border-[#4892CC] bg-[#4892CC]/5 shadow-sm" 
                    : "border-border/50 hover:border-border bg-card dark:bg-slate-900"
                )}
              >
                <div className={cn("p-2 rounded-xl", f.bg)}>
                  <f.icon className={cn("h-5 w-5 md:h-6 md:w-6", f.color)} />
                </div>
                <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-foreground/80">{f.label}</span>
                {format === f.id && <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-[#4892CC] absolute top-2 right-2" />}
              </button>
            ))}
          </div>

          {/* Filtro de Lote Medido */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
              <div className="h-px flex-1 bg-muted"></div>
              Filtro de Medición
              <div className="h-px flex-1 bg-muted"></div>
            </h4>
            <div className="flex items-center gap-3">
              <Select value={loteMedidoFilter} onValueChange={(v) => setLoteMedidoFilter(v as any)}>
                <SelectTrigger className="w-full h-12 bg-muted/50 border-none rounded-xl font-bold text-foreground/80">
                  <SelectValue placeholder="Filtrar por medición" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos los lotes</SelectItem>
                  <SelectItem value="medido">Solo Lotes Medidos</SelectItem>
                  <SelectItem value="no_medido">Solo Lotes No Medidos</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs font-bold text-muted-foreground/70 whitespace-nowrap">
                {filteredCount} registros
              </span>
            </div>
          </div>

          {/* Filtro por Localidad */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
              <div className="h-px flex-1 bg-muted"></div>
              Filtro por Localidad
              <div className="h-px flex-1 bg-muted"></div>
            </h4>
            <div className="flex items-center gap-3">
              <Select value={localidadFilter} onValueChange={setLocalidadFilter}>
                <SelectTrigger className="w-full h-12 bg-muted/50 border-none rounded-xl font-bold text-foreground/80">
                  <SelectValue placeholder="Filtrar por localidad" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-60">
                  <SelectItem value="all">Todas las Localidades</SelectItem>
                  {uniqueLocalidades.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtro por Distrito */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
              <div className="h-px flex-1 bg-muted"></div>
              Filtro por Distrito
              <div className="h-px flex-1 bg-muted"></div>
            </h4>
            <div className="flex items-center gap-3">
              <Select value={distritoFilter} onValueChange={setDistritoFilter}>
                <SelectTrigger className="w-full h-12 bg-muted/50 border-none rounded-xl font-bold text-foreground/80">
                  <SelectValue placeholder="Filtrar por distrito" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-60">
                  <SelectItem value="all">Todos los Distritos</SelectItem>
                  {uniqueDistritos.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Campos por Categoría */}
          <div className="space-y-6">
            {['Básico', 'Financiero', 'Documentos'].map((category) => (
              <div key={category} className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
                  <div className="h-px flex-1 bg-muted"></div>
                  {category}
                  <div className="h-px flex-1 bg-muted"></div>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  {EXPORT_FIELDS.filter(f => f.category === category).map((field) => (
                    <div 
                      key={field.id} 
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-xl border transition-colors cursor-pointer",
                        selectedFields.includes(field.id) ? "border-[#4892CC]/30 bg-[#4892CC]/5" : "border-border/50 hover:bg-muted/50"
                      )}
                      onClick={() => toggleField(field.id)}
                    >
                      <Checkbox 
                        id={field.id} 
                        checked={selectedFields.includes(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                        className="data-[state=checked]:bg-[#4892CC] data-[state=checked]:border-[#4892CC]"
                      />
                      <Label htmlFor={field.id} className="text-xs md:text-sm font-bold text-foreground/80 cursor-pointer flex-1">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
      )}

      {/* Footer Fijo */}
      <DialogFooter className="p-6 md:p-8 pt-4 border-t border-border/50 bg-muted/50/30 flex-col sm:flex-row gap-3">
        <Button 
          variant="ghost" 
          onClick={onClose} 
          className="rounded-xl font-bold text-muted-foreground order-2 sm:order-1"
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleExport} 
          disabled={isExporting || loading}
          className="bg-[#4892CC] hover:bg-[#3C8B93] text-white rounded-xl font-bold px-8 h-12 shadow-lg shadow-[#4892CC]/20 order-1 sm:order-2 w-full sm:w-auto"
        >
          {isExporting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</>
          ) : (
            <><Download className="mr-2 h-4 w-4" /> Descargar ({loading ? '...' : filteredCount})</>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}
