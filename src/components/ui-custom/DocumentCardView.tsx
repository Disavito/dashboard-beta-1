import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, FileText, CheckSquare, Square, Upload, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import DocumentLinkPill from '@/components/custom/DocumentLinkPill';

// Interfaces (Mantenemos igual)
interface SocioDocumento {
  id: number;
  tipo_documento: string;
  link_documento: string | null;
  transaction_type?: string;
}

interface IngresoInfo {
  status: 'Pagado' | 'No Pagado';
  receipt_number: string | null;
}

interface SocioConDocumentos {
  id: string;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  localidad: string;
  mz: string | null;
  lote: string | null;
  is_lote_medido: boolean | null;
  socio_documentos: SocioDocumento[];
  paymentInfo: IngresoInfo;
}

interface DocumentCardViewProps {
  data: SocioConDocumentos[];
  requiredDocumentTypes: string[];
  canManageLoteMedido: boolean; 
  canDeleteDocuments: boolean;
  canDeleteBlueprints?: boolean;
  onOpenUploadModal: (socio: SocioConDocumentos, documentType: string) => void;
  onDeleteDocument: (documentId: number, documentLink: string, documentType: string, socioName: string) => void;
  onUpdateLoteMedido: (socioId: string, newValue: boolean, socio: SocioConDocumentos) => void;
}

const DocumentCardView: React.FC<DocumentCardViewProps> = ({
  data,
  requiredDocumentTypes,
  canManageLoteMedido,
  canDeleteDocuments,
  canDeleteBlueprints,
  onOpenUploadModal,
  onDeleteDocument,
  onUpdateLoteMedido,
}) => {
  const [visibleCount, setVisibleCount] = useState(10);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reiniciar la cuenta cuando los datos cambien (por ejemplo, al buscar o filtrar)
  useEffect(() => {
    setVisibleCount(10);
  }, [data]);

  // Lógica de Scroll Infinito
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < data.length) {
          // Pintar 10 tarjetas más cuando el usuario llega al fondo
          setVisibleCount((prev) => prev + 10);
        }
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [visibleCount, data.length]);

  const visibleData = useMemo(() => {
    return data.slice(0, visibleCount);
  }, [data, visibleCount]);

  if (data.length === 0) {
    return (
      <div className="text-center py-10 text-textSecondary font-bold border-2 border-dashed border-gray-200 rounded-2xl mx-4">
        No hay expedientes que coincidan con la búsqueda.
      </div>
    );
  }

  return (
    <div className="grid gap-4 w-full max-w-xl mx-auto pb-10">
      {visibleData.map((socio) => {
        const fullName = `${socio.nombres || ''} ${socio.apellidoPaterno || ''} ${socio.apellidoMaterno || ''}`.trim();
        const isMedido = socio.is_lote_medido ?? false;
        const missingDocs = requiredDocumentTypes.filter(docType => {
          const doc = socio.socio_documentos.find(d => d.tipo_documento === docType);
          return !doc || !doc.link_documento;
        });

        return (
          <Card key={socio.id} className="w-full bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-4 border-b border-gray-50 flex flex-row items-start justify-between gap-2 bg-gray-50/50">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-mono font-bold text-gray-400">DNI {socio.dni || 'N/A'}</span>
                <CardTitle className="text-base font-black text-gray-900 uppercase leading-tight mt-0.5 truncate">
                  {fullName}
                </CardTitle>
              </div>
              <Badge 
                className={cn(
                  "font-black border px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider shrink-0",
                  socio.paymentInfo.status === 'Pagado' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"
                )}
              >
                {socio.paymentInfo.status === 'Pagado' ? 'Al Día' : 'Deuda'}
              </Badge>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              
              <div className="grid grid-cols-2 gap-3 py-1">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5"><MapPin className="w-3 h-3 inline mr-1" />Comunidad</p>
                  <p className="text-xs font-bold text-gray-700 uppercase truncate">{socio.localidad || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Ubicación</p>
                  <p className="text-xs font-bold text-gray-700 uppercase">Mz {socio.mz || '-'} Lt {socio.lote || '-'}</p>
                </div>
              </div>
              
              {/* Lote Medido */}
              <div className="flex flex-row justify-between items-center text-sm border-t border-gray-50 pt-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  {isMedido ? <CheckSquare className="h-4 w-4 text-emerald-500" /> : <Square className="h-4 w-4 text-amber-500" />} Ingeniería
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 text-xs font-bold rounded-xl", 
                    isMedido ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-amber-600 border-amber-200 bg-amber-50"
                  )}
                  onClick={() => onUpdateLoteMedido(socio.id, !isMedido, socio)}
                  disabled={!canManageLoteMedido}
                >
                  {isMedido ? 'Medido' : 'Pendiente'}
                </Button>
              </div>

              {/* Document Links */}
              <div className="pt-4 border-t border-gray-50">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><FileText className="h-3 w-3" /> Expediente Digital</p>
                <div className="flex flex-wrap gap-1.5">
                  {socio.socio_documentos.length > 0 ? (
                    socio.socio_documentos.map((doc) => (
                      <DocumentLinkPill
                        key={doc.id}
                        type={doc.tipo_documento}
                        link={doc.link_documento}
                        isAdmin={canDeleteDocuments || !!(canDeleteBlueprints && (doc.tipo_documento === 'Planos de ubicación' || doc.tipo_documento === 'Memoria descriptiva'))}
                        socioId={socio.id}
                        documentId={doc.id}
                        onDelete={() => onDeleteDocument(doc.id, doc.link_documento!, doc.tipo_documento, fullName)}
                      />
                    ))
                  ) : (
                    <span className="text-xs font-bold text-gray-300 italic">No hay archivos.</span>
                  )}
                </div>
              </div>

              {/* Missing Documents Actions */}
              {missingDocs.length > 0 && (
                <div className="pt-4 border-t border-gray-50">
                  <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Trash2 className="h-3 w-3" /> Faltantes obligatorios</p>
                  <div className="flex flex-wrap gap-2">
                    {missingDocs.map(docType => (
                      <Button
                        key={docType}
                        variant="outline"
                        size="sm"
                        className="h-8 text-[10px] font-bold border-red-200 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl"
                        onClick={() => onOpenUploadModal(socio, docType)}
                      >
                        <Upload className="mr-1.5 h-3 w-3" />
                        Subir {docType.split(' ')[0]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Infinite Scroll Loader / Finishing element */}
      {visibleCount < data.length ? (
        <div ref={observerTarget} className="py-10 flex justify-center w-full">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#4892CC]" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pintando más expedientes...</span>
          </div>
        </div>
      ) : (
        <div className="py-8 flex justify-center w-full">
           <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest border border-dashed border-gray-200 px-4 py-2 rounded-full">Has llegado al final de la lista</span>
        </div>
      )}
    </div>
  );
};

export default DocumentCardView;
