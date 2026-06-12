import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Ticket, AlertCircle, FileText, Upload, Download, Loader2, CheckSquare, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

// Importamos o duplicamos la interfaz básica que necesitamos
interface KanbanBoardProps {
  data: any[];
  onOpenUploadModal: (socioId: string, socioName: string, documentType: string) => void;
  canManageEngineering: boolean;
}

export const openDocumentDirectly = async (socioId: string, tipoDocumento: string, receiptNumber?: string) => {
  // Abrir ventana sincronamente para engañar al popup blocker
  const newWindow = window.open('about:blank', '_blank');
  if (newWindow) {
    newWindow.document.write('<div style="font-family:sans-serif;padding:20px;text-align:center;">Buscando su documento en la nube, por favor espere...</div>');
  }

  try {
    toast.loading(`Buscando o regenerando ${tipoDocumento}...`, { id: 'open-doc' });
    const { data } = await supabase
      .from('socio_documentos')
      .select('link_documento')
      .eq('socio_id', socioId)
      .eq('tipo_documento', tipoDocumento)
      .maybeSingle();
    
    if (data?.link_documento) {
      toast.dismiss('open-doc');
      if (newWindow) newWindow.location.href = data.link_documento;
      else window.open(data.link_documento, '_blank');
      return;
    }

    // FALLBACK MAGICO PARA COMPROBANTES DE PAGO NO INDEXADOS EN LA BD (Recibos y Boletas antiguos)
    if (tipoDocumento === 'Comprobante de Pago') {
       // NUEVO: Buscar en la RAÍZ del socio (Donde se guardaban las boletas SUNAT reales de facturación anterior)
       const { data: raizSocio } = await supabase.storage.from('comprobante-de-pago').list(`${socioId}`);
       if (raizSocio && raizSocio.length > 0) {
         if (receiptNumber) {
           const specificFile = raizSocio.find(f => f.name.includes(receiptNumber) && f.name.endsWith('.pdf'));
           if (specificFile) {
             const { data: pubUrl } = supabase.storage.from('comprobante-de-pago').getPublicUrl(`${socioId}/${specificFile.name}`);
             toast.dismiss('open-doc');
             if (newWindow) newWindow.location.href = pubUrl.publicUrl;
             else window.open(pubUrl.publicUrl, '_blank');
             return;
           }
         }
         // Si no se pasó receiptNumber pero hay un PDF que parece boleta en la raíz
         const genericBoleta = raizSocio.find(f => f.name.endsWith('.pdf') && (f.name.startsWith('B') || f.name.startsWith('R')));
         if (genericBoleta) {
             const { data: pubUrl } = supabase.storage.from('comprobante-de-pago').getPublicUrl(`${socioId}/${genericBoleta.name}`);
             toast.dismiss('open-doc');
             if (newWindow) newWindow.location.href = pubUrl.publicUrl;
             else window.open(pubUrl.publicUrl, '_blank');
             return;
         }
       }

       // Buscar en el bucket de recibos (Singular - Nuevos)
       const { data: recibos } = await supabase.storage.from('comprobante-de-pago').list(`${socioId}/recibo`);
       if (recibos && recibos.length > 0) {
         const files = recibos.filter(f => f.name.endsWith('.pdf')).sort((a, b) => b.name.localeCompare(a.name));
         if (files.length > 0) {
           const { data: pubUrl } = supabase.storage.from('comprobante-de-pago').getPublicUrl(`${socioId}/recibo/${files[0].name}`);
           toast.dismiss('open-doc');
           if (newWindow) newWindow.location.href = pubUrl.publicUrl;
           else window.open(pubUrl.publicUrl, '_blank');
           return;
         }
       }
       
       // NUEVO: Buscar en el bucket de recibos antiguos (Plural)
       const { data: recibosViejos } = await supabase.storage.from('comprobante-de-pago').list(`${socioId}/recibos`);
       if (recibosViejos && recibosViejos.length > 0) {
         const files = recibosViejos.filter(f => f.name.endsWith('.pdf')).sort((a, b) => b.name.localeCompare(a.name));
         if (files.length > 0) {
           const { data: pubUrl } = supabase.storage.from('comprobante-de-pago').getPublicUrl(`${socioId}/recibos/${files[0].name}`);
           toast.dismiss('open-doc');
           if (newWindow) newWindow.location.href = pubUrl.publicUrl;
           else window.open(pubUrl.publicUrl, '_blank');
           return;
         }
       }
       
       // Buscar en el bucket de boletas
       const { data: boletas } = await supabase.storage.from('comprobante-de-pago').list(`${socioId}/boleta`);
       if (boletas && boletas.length > 0) {
         const files = boletas.filter(f => f.name.endsWith('.pdf')).sort((a, b) => b.name.localeCompare(a.name));
         if (files.length > 0) {
           const { data: pubUrl } = supabase.storage.from('comprobante-de-pago').getPublicUrl(`${socioId}/boleta/${files[0].name}`);
           toast.dismiss('open-doc');
           if (newWindow) newWindow.location.href = pubUrl.publicUrl;
           else window.open(pubUrl.publicUrl, '_blank');
           return;
         }
       }
       
       // AUTO-REGENERACIÓN SILENCIOSA DE PDFs PERDIDOS O ANTIGUOS
       if (receiptNumber && (receiptNumber.startsWith('R') || receiptNumber.startsWith('B'))) {
          toast.loading(`Generando PDF perdido para ${receiptNumber}...`, { id: 'open-doc' });
          const { data: income } = await supabase.from('ingresos').select('*').eq('receipt_number', receiptNumber).single();
          
          if (income) {
             if (receiptNumber.startsWith('R')) {
               const { generateReceiptPdf } = await import('@/lib/receiptPdfGenerator');
               const receiptData = {
                 correlative: income.receipt_number,
                 client_full_name: income.full_name,
                 client_dni: income.dni || '',
                 fecha_emision: income.date,
                 monto: income.amount,
                 concepto: income.transaction_type || 'Pago Automático',
                 metodo_pago: income.account || 'Desconocido',
                 numero_operacion: income.numeroOperacion?.toString()
               };
               const pdfBlob = await generateReceiptPdf(receiptData);
               const url = window.URL.createObjectURL(pdfBlob);
               toast.dismiss('open-doc');
               if (newWindow) newWindow.location.href = url;
               else window.open(url, '_blank');
               
               // Guardarlo en Supabase en background para curar la base de datos
               import('@/lib/api/invoicingApi').then(api => {
                 api.saveReceiptPdfToSupabase(pdfBlob, receiptNumber, socioId).catch(console.error);
               });
               return;
             } else if (receiptNumber.startsWith('B')) {
               const { generateReceiptPdf } = await import('@/lib/receiptPdfGenerator');
               const receiptData = {
                 correlative: income.receipt_number,
                 client_full_name: income.full_name,
                 client_dni: income.dni || '',
                 fecha_emision: income.date,
                 monto: income.amount,
                 concepto: income.transaction_type || 'Venta',
                 metodo_pago: income.account || 'Desconocido',
                 numero_operacion: income.numeroOperacion?.toString(),
                 isBoleta: true
               };
               const pdfBlob = await generateReceiptPdf(receiptData);
               const url = window.URL.createObjectURL(pdfBlob);
               toast.dismiss('open-doc');
               if (newWindow) newWindow.location.href = url;
               else window.open(url, '_blank');
               
               // Guardarlo en Supabase en background
               import('@/lib/api/invoicingApi').then(api => {
                 api.saveBoletaPdfToSupabase(pdfBlob, receiptNumber, socioId).catch(console.error);
               });
               return;
             }
          } else {
             toast.dismiss('open-doc');
             toast.error(`No se encontró el registro de ingresos para ${receiptNumber}. No se puede abrir ni regenerar el documento digital.`);
             if (newWindow) newWindow.close();
             return;
          }
       }
    }

    toast.error(`El documento PDF no se encontró y no se pudo regenerar.`, { id: 'open-doc' });
    if (newWindow) newWindow.close();
  } catch (e) {
    toast.error('Error al abrir o regenerar el PDF.', { id: 'open-doc' });
    if (newWindow) newWindow.close();
  }
};

const KanbanCard = ({ item, onOpenUploadModal }: { item: any; onOpenUploadModal: any }) => {
  const isPaid = item.paymentInfo?.status === 'Pagado';
  const fullName = `${item.nombres} ${item.apellidoPaterno} ${item.apellidoMaterno}`.trim();
  
  const missing = [];
  if (!item.has_planos) missing.push('Planos de ubicación');
  if (!item.has_memoria) missing.push('Memoria descriptiva');
  // Fichas, Contratos y Comprobantes son 100% automáticos, prohibido subirlos a mano.

  const renderKanbanBadge = (status: boolean | null, label: string, onClick?: () => void) => {
    if (!status) {
      return (
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold bg-muted text-muted-foreground/70 border-dashed border-border">
          <XCircle className="w-3 h-3 mr-1" />
          {label}
        </Badge>
      );
    }

    return (
      <Badge 
        variant="outline" 
        onClick={onClick}
        className={`text-[10px] uppercase tracking-wider font-bold bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm shadow-emerald-500/10 ${onClick ? 'cursor-pointer hover:bg-emerald-100 transition-colors' : ''}`}
      >
        <CheckCircle2 className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const receiptNumber = item.paymentInfo?.receipt_number || '';
  const isDigitalReceipt = item.has_comprobante || receiptNumber.startsWith('R-') || receiptNumber.startsWith('B');

  return (
    <Card className="mb-3 bg-card dark:bg-slate-900 hover:border-border hover:shadow-md transition-all cursor-pointer group rounded-lg overflow-hidden border border-border/60 shadow-sm">
      <div className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-[9px] font-mono font-bold text-muted-foreground/70">DNI {item.dni}</span>
            <h4 className="text-sm font-black text-foreground leading-tight uppercase">{fullName}</h4>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-3 mt-2">
          <div className="bg-muted/50 rounded-lg p-1.5 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-muted-foreground/70" />
            <span className="text-[10px] font-bold text-muted-foreground truncate">{item.localidad || 'S/L'}</span>
          </div>
          <div className="bg-muted/50 rounded-lg p-1.5">
            <span className="text-[10px] font-bold text-muted-foreground truncate">Mz {item.mz || '-'} Lt {item.lote || '-'}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          <Badge className={cn("text-[9px] px-1.5 py-0 border", isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200")}>
            {isPaid ? 'PAGADO' : 'DEUDA'}
          </Badge>
          {item.paymentInfo?.receipt_number && (
             <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] px-1.5 py-0 font-mono">
               REC:{item.paymentInfo.receipt_number}
             </Badge>
          )}
        </div>

          <div className="flex flex-wrap gap-1 mt-3">
            {renderKanbanBadge(item.has_planos, 'Planos', () => openDocumentDirectly(item.id, 'Planos de ubicación'))}
            {renderKanbanBadge(item.has_memoria, 'Memoria', () => openDocumentDirectly(item.id, 'Memoria descriptiva'))}
            {renderKanbanBadge(item.has_ficha, 'Ficha', () => openDocumentDirectly(item.id, 'Ficha de Ingreso'))}
            {renderKanbanBadge(item.has_contrato, 'Contrato', () => openDocumentDirectly(item.id, 'Contrato'))}
            {renderKanbanBadge(isPaid, isDigitalReceipt ? 'Pago' : 'Físico', isDigitalReceipt ? () => openDocumentDirectly(item.id, 'Comprobante de Pago', receiptNumber) : undefined)}
          </div>

        {missing.length > 0 && (
          <div className="flex gap-1.5 mt-2.5">
            {missing.map(t => (
              <Button 
                key={t} 
                variant="outline" 
                size="sm" 
                className="h-7 px-2 text-[10px] font-medium text-muted-foreground bg-card dark:bg-slate-900 hover:bg-muted/50 border-border hover:border-border hover:text-foreground rounded-md w-full justify-center shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenUploadModal(item.id, fullName, t);
                }}
              >
                <Upload className="w-3 h-3 mr-1.5 text-muted-foreground/70" />
                {t.split(' ')[0]}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export function KanbanBoard({ data, onOpenUploadModal }: KanbanBoardProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  // Clasificar los datos en 4 columnas
  const col1 = data.filter(s => s.is_lote_medido === false && s.paymentInfo?.status === 'Pagado');
  const col2 = data.filter(s => s.is_lote_medido === true && s.paymentInfo?.status === 'No Pagado');
  const col3 = data.filter(s => s.is_lote_medido === true && s.paymentInfo?.status === 'Pagado' && (!s.has_planos || !s.has_memoria));
  const col4 = data.filter(s => s.is_lote_medido === true && s.paymentInfo?.status === 'Pagado' && s.has_planos && s.has_memoria);

  const handleExportZip = async () => {
    if (col4.length === 0) return;
    setIsExporting(true);
    toast.loading('Generando ZIP de expedientes...', { id: 'zip-export' });

    try {
      const zip = new JSZip();
      const socioIds = col4.map(s => s.id);

      // Traer los documentos de la BD
      const { data: docs, error } = await supabase
        .from('socio_documentos')
        .select('socio_id, tipo_documento, link_documento')
        .in('socio_id', socioIds)
        .in('tipo_documento', ['Planos de ubicación', 'Memoria descriptiva']);

      if (error) throw error;

      if (!docs || docs.length === 0) {
        toast.error('No se encontraron archivos en la base de datos.', { id: 'zip-export' });
        setIsExporting(false);
        return;
      }

      // Procesar cada socio
      for (const socio of col4) {
        const socioDocs = docs.filter(d => d.socio_id === socio.id);
        if (socioDocs.length > 0) {
          const folderName = `${socio.dni} - ${socio.nombres} ${socio.apellidoPaterno}`.trim();
          const folder = zip.folder(folderName);
          
          for (const doc of socioDocs) {
             if (!doc.link_documento) continue;
             try {
                // Forzar CORS agregando un parámetro extra a la URL si es necesario
                const response = await fetch(doc.link_documento);
                if (!response.ok) continue;
                const blob = await response.blob();
                
                const fileName = `${doc.tipo_documento}.pdf`;
                folder?.file(fileName, blob);
             } catch (err) {
                console.error(`Error bajando ${doc.link_documento}`, err);
             }
          }
        }
      }

      // Generar ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      const dateStr = new Date().toISOString().split('T')[0];
      saveAs(content, `Expedientes_Listos_Para_Impresion_${dateStr}.zip`);
      
      toast.success('ZIP descargado correctamente.', { id: 'zip-export' });
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el ZIP.', { id: 'zip-export' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex overflow-x-auto gap-4 pb-6 min-h-[70vh] snap-x snap-mandatory pt-2">
      {/* Columna 1 */}
      <div className="min-w-[280px] w-[280px] flex-shrink-0 flex flex-col snap-start">
        <div className="bg-sky-100 border border-sky-200 text-sky-800 rounded-t-2xl p-3 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-sky-600" />
            <h3 className="font-black text-xs uppercase tracking-wider">⚡ Por Medir</h3>
          </div>
          <Badge className="bg-card dark:bg-slate-900 text-sky-700 font-bold border-none">{col1.length}</Badge>
        </div>
        <ScrollArea className="bg-sky-50/50 border border-sky-100 border-t-0 rounded-b-2xl flex-1 p-3">
          {col1.map(item => <KanbanCard key={item.id} item={item} onOpenUploadModal={onOpenUploadModal} />)}
          {col1.length === 0 && <div className="text-center py-8 text-sky-300 font-bold text-xs uppercase tracking-widest border-2 border-dashed border-sky-200/50 rounded-xl">Vacío</div>}
        </ScrollArea>
      </div>

      {/* Columna 2 */}
      <div className="min-w-[280px] w-[280px] flex-shrink-0 flex flex-col snap-start">
        <div className="bg-rose-100 border border-rose-200 text-rose-800 rounded-t-2xl p-3 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <h3 className="font-black text-xs uppercase tracking-wider">⚠️ Medidos sin Pago</h3>
          </div>
          <Badge className="bg-card dark:bg-slate-900 text-rose-700 font-bold border-none">{col2.length}</Badge>
        </div>
        <ScrollArea className="bg-rose-50/50 border border-rose-100 border-t-0 rounded-b-2xl flex-1 p-3">
          {col2.map(item => <KanbanCard key={item.id} item={item} onOpenUploadModal={onOpenUploadModal} />)}
          {col2.length === 0 && <div className="text-center py-8 text-rose-300 font-bold text-xs uppercase tracking-widest border-2 border-dashed border-rose-200/50 rounded-xl">Vacío</div>}
        </ScrollArea>
      </div>

      {/* Columna 3 */}
      <div className="min-w-[280px] w-[280px] flex-shrink-0 flex flex-col snap-start">
        <div className="bg-amber-100 border border-amber-200 text-amber-800 rounded-t-2xl p-3 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600" />
            <h3 className="font-black text-xs uppercase tracking-wider">📐 En Gabinete</h3>
          </div>
          <Badge className="bg-card dark:bg-slate-900 text-amber-700 font-bold border-none">{col3.length}</Badge>
        </div>
        <ScrollArea className="bg-amber-50/50 border border-amber-100 border-t-0 rounded-b-2xl flex-1 p-3">
          {col3.map(item => <KanbanCard key={item.id} item={item} onOpenUploadModal={onOpenUploadModal} />)}
          {col3.length === 0 && <div className="text-center py-8 text-amber-300 font-bold text-xs uppercase tracking-widest border-2 border-dashed border-amber-200/50 rounded-xl">Vacío</div>}
        </ScrollArea>
      </div>

      {/* Columna 4 */}
      <div className="min-w-[280px] w-[280px] flex-shrink-0 flex flex-col snap-start">
        <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-t-2xl p-3 shadow-sm z-10">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <h3 className="font-black text-xs uppercase tracking-wider">✅ Para Impresión</h3>
            </div>
            <Badge className="bg-card dark:bg-slate-900 text-emerald-700 font-bold border-none">{col4.length}</Badge>
          </div>
          {col4.length > 0 && (
            <Button 
              onClick={handleExportZip} 
              disabled={isExporting}
              size="sm" 
              className="w-full h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all"
            >
              {isExporting ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Download className="w-3 h-3 mr-1.5" />}
              {isExporting ? 'EMPAQUETANDO ZIP...' : 'EXPORTAR A ZIP'}
            </Button>
          )}
        </div>
        <ScrollArea className="bg-emerald-50/50 border border-emerald-100 border-t-0 rounded-b-2xl flex-1 p-3">
          {col4.map(item => <KanbanCard key={item.id} item={item} onOpenUploadModal={onOpenUploadModal} />)}
          {col4.length === 0 && <div className="text-center py-8 text-emerald-300 font-bold text-xs uppercase tracking-widest border-2 border-dashed border-emerald-200/50 rounded-xl">Vacío</div>}
        </ScrollArea>
      </div>

    </div>
  );
}
