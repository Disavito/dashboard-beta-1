import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { smartSearch } from '@/lib/utils';

export interface ExpedienteSocio {
  id: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  localidad: string;
  mz: string;
  lote: string;
  is_lote_medido: boolean;
  paymentStatus: 'Pagado' | 'No Pagado';
  nroRecibo: string;
  documentos: Array<{ id: string; tipo_documento: string; link_documento: string }>;
}

interface UseExpedienteDataOptions {
  searchTerm?: string;
  localidadFilter?: string;
}

export function useExpedienteData(options: UseExpedienteDataOptions = {}) {
  const { searchTerm = '', localidadFilter = 'all' } = options;
  const [socios, setSocios] = useState<ExpedienteSocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [localidades, setLocalidades] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sociosRes, ingresosRes] = await Promise.all([
        supabase.from('socio_titulares').select(`
          id, nombres, apellidoPaterno, apellidoMaterno, dni, localidad, mz, lote, is_lote_medido,
          socio_documentos(id, tipo_documento, link_documento, deleted_at)
        `),
        supabase.from('ingresos').select('dni, receipt_number, transaction_type, amount, date, created_at')
          .neq('dni', null)
          .is('deleted_at', null)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
      ]);

      if (sociosRes.error) throw sociosRes.error;

      // Construir mapa de ingresos por DNI
      const ingresosByDni = new Map<string, any[]>();
      (ingresosRes.data || []).forEach(ingreso => {
        if (ingreso.dni) {
          if (!ingresosByDni.has(ingreso.dni)) ingresosByDni.set(ingreso.dni, []);
          ingresosByDni.get(ingreso.dni)?.push(ingreso);
        }
      });

      // Extraer localidades únicas
      const uniqueLocs = Array.from(new Set((sociosRes.data || []).map(s => s.localidad).filter(Boolean)));
      setLocalidades(uniqueLocs);

      // Enriquecer datos
      const enriched = (sociosRes.data || []).map(socio => {
        // Filtrar documentos fantasmas (borrados) y vacíos (sin enlace real)
        const rawDocs = (socio as any).socio_documentos || [];
        const socioDocs = rawDocs.filter((d: any) => {
          return d.deleted_at === null && d.link_documento && typeof d.link_documento === 'string' && d.link_documento.trim() !== '';
        });

        const socioIngresos = ingresosByDni.get(socio.dni) || [];

        // Excluir socios con última transacción de anulación/devolución
        if (socioIngresos.length > 0) {
          const lastTx = socioIngresos[0];
          const type = (lastTx.transaction_type || '').toLowerCase();
          const amount = lastTx.amount;
          if (type.includes('anulacion') || type.includes('devolucion') || amount < 0) {
            return null;
          }
        }

        // Encontrar primer ingreso positivo
        let socioIncome = null;
        for (const ig of socioIngresos) {
          if (ig.amount > 0) {
            socioIncome = { nro_recibo: ig.receipt_number };
            break;
          }
        }

        return {
          id: socio.id,
          nombres: socio.nombres,
          apellidoPaterno: socio.apellidoPaterno,
          apellidoMaterno: socio.apellidoMaterno,
          dni: socio.dni,
          localidad: socio.localidad,
          mz: socio.mz,
          lote: socio.lote,
          paymentStatus: socioIncome ? 'Pagado' : 'No Pagado',
          nroRecibo: socioIncome?.nro_recibo || 'N/A',
          is_lote_medido: !!(socio as any).is_lote_medido,
          documentos: socioDocs,
        } as ExpedienteSocio;
      }).filter(Boolean) as ExpedienteSocio[];

      setSocios(enriched);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar los expedientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtrado memoizado
  const filteredSocios = useMemo(() => {
    return socios.filter(s => {
      const matchesSearch = smartSearch(searchTerm, [s.nombres, s.apellidoPaterno, s.dni, s.mz, s.lote]);
      const matchesLocalidad = localidadFilter === 'all' || s.localidad === localidadFilter;
      return matchesSearch && matchesLocalidad;
    });
  }, [socios, searchTerm, localidadFilter]);

  // Estadísticas
  const stats = useMemo(() => ({
    total: socios.length,
    pagados: socios.filter(s => s.paymentStatus === 'Pagado').length,
    medidos: socios.filter(s => s.is_lote_medido).length,
    sinDocumentos: socios.filter(s => s.documentos.length === 0).length,
  }), [socios]);

  return {
    socios: filteredSocios,
    allSocios: socios,
    loading,
    localidades,
    stats,
    refreshData: fetchData,
  };
}
