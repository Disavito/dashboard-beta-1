import { useState, useMemo, useEffect } from 'react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, Clock, FileText, Trash2, ArrowRight } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { updateMontoRendido } from '@/lib/api/presupuestosApi';

interface ApprovalRequest {
  id: string;
  requested_by: string;
  request_type: string;
  reference_id: string | null;
  payload: any;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export default function AprobacionesPage() {
  const { user, roles } = useUser();
  const isAdminOrFinanzas = useMemo(() => 
    roles?.some(r => ['admin', 'finanzas_senior', 'finanzas_junior'].includes(r.toLowerCase())) ?? false,
    [roles]
  );

  const { data: requests, loading, refreshData, setFilters } = useSupabaseData<ApprovalRequest>({
    tableName: 'approval_requests',
    initialSort: { column: 'created_at', ascending: false },
    limit: 300
  });
  
  // Para mostrar nombres, necesitamos colaboradores
  const { data: colaboradores } = useSupabaseData<any>({ tableName: 'colaboradores', selectQuery: 'id, name, apellidos, user_id' });
  const { data: budgets } = useSupabaseData<any>({ tableName: 'presupuestos_operativos', limit: 300 });

  // Aplicar filtro si no es administrador o finanzas
  useEffect(() => {
    if (user) {
      const filters: Record<string, any> = {};
      if (!isAdminOrFinanzas && user.id) {
        filters['requested_by'] = user.id;
      }
      setFilters(filters);
    }
  }, [user, isAdminOrFinanzas, setFilters]);

  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const getBudgetMotivo = (budgetId: string) => {
    const budget = budgets.find(b => b.id === budgetId);
    return budget ? budget.motivo : 'Presupuesto Desconocido';
  };

  const canApprove = roles?.includes('admin') || roles?.includes('finanzas_senior');

  const pendingRequests = useMemo(() => requests.filter(r => r.status === 'pending'), [requests]);
  const historyRequests = useMemo(() => requests.filter(r => r.status !== 'pending').slice(0, 50), [requests]);

  const getColaboradorName = (userId: string) => {
    const colab = colaboradores.find(c => c.user_id === userId);
    return colab ? `${colab.name} ${colab.apellidos}` : 'Usuario Desconocido';
  };

  const handleAction = async (request: ApprovalRequest, action: 'approve' | 'reject') => {
    if (!user) return;
    setIsProcessing(request.id);
    
    try {
      if (action === 'approve') {
        // Ejecutar la acción subyacente
        if (request.request_type === 'delete_income') {
          const { error } = await supabase.from('ingresos').update({ deleted_at: new Date().toISOString() }).eq('id', request.reference_id);
          if (error) throw error;
        } else if (request.request_type === 'delete_expense') {
          const { data: oldExpense } = await supabase.from('gastos').select('presupuesto_id').eq('id', request.reference_id).single();
          const { error } = await supabase.from('gastos').update({ deleted_at: new Date().toISOString() }).eq('id', request.reference_id);
          if (error) throw error;
          
          if (oldExpense?.presupuesto_id) {
            await updateMontoRendido(oldExpense.presupuesto_id);
          }
        } else if (request.request_type === 'high_expense' || request.request_type === 'engineer_expense' || request.request_type === 'expense_approval') {
          // Limpiar payload para evitar errores PGRST204 en Supabase
          const dbPayload = { ...request.payload };
          
          if (dbPayload.is_declaracion_jurada) {
            dbPayload.description = `[Declaración Jurada] ${dbPayload.description || ''}`;
            delete dbPayload.is_declaracion_jurada;
          }
          if (dbPayload.receipt_url) {
            dbPayload.description = `${dbPayload.description || ''}\n\nComprobante: ${dbPayload.receipt_url}`;
            delete dbPayload.receipt_url;
          }

          // Regenerar numero_gasto para evitar conflictos 409 (el original puede estar obsoleto)
          const { data: freshNumero } = await supabase.rpc('get_next_numero_gasto');
          if (freshNumero) {
            dbPayload.numero_gasto = freshNumero;
          }

          // Mapear colaborador_id: si viene como user_id de auth, convertir a colaboradores.id
          if (dbPayload.colaborador_id) {
            const { data: colab } = await supabase
              .from('colaboradores')
              .select('id')
              .eq('user_id', dbPayload.colaborador_id)
              .maybeSingle();
            if (colab) {
              dbPayload.colaborador_id = colab.id;
            }
          }

          // Insert the expense since it was held back
          const { error } = await supabase.from('gastos').insert(dbPayload);
          if (error) throw error;
          
          if (request.payload.presupuesto_id) {
            await updateMontoRendido(request.payload.presupuesto_id);
          }
        }
      }

      // Actualizar el estado de la solicitud
      const { error: updateError } = await supabase.from('approval_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (updateError) throw updateError;
      
      toast.success(action === 'approve' ? 'Solicitud aprobada y ejecutada' : 'Solicitud rechazada');
      refreshData();
    } catch (err) {
      toast.error('Error al procesar', { description: err instanceof Error ? err.message : 'Error desconocido' });
    } finally {
      setIsProcessing(null);
    }
  };

  const renderRequestDetails = (request: ApprovalRequest) => {
    if (request.request_type === 'high_expense' || request.request_type === 'engineer_expense' || request.request_type === 'expense_approval') {
      const payload = request.payload;
      const title = request.request_type === 'expense_approval' ? 'Nuevo Gasto a Aprobar' : 
                    request.request_type === 'engineer_expense' ? 'Nuevo Gasto Declarado' : 'Nuevo Gasto Elevado';
                    
      let desc = payload.description || '';
      const isDj = payload.is_declaracion_jurada || desc.startsWith('[Declaración Jurada]');
      if (isDj) desc = desc.replace('[Declaración Jurada]', '').trim();

      let receiptUrl = payload.receipt_url;
      const receiptMatch = desc.match(/\n\nComprobante: (https?:\/\/[^\s]+)/);
      if (receiptMatch) {
        if (!receiptUrl) receiptUrl = receiptMatch[1];
        desc = desc.replace(receiptMatch[0], '').trim();
      }

      return (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-2 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-rose-600 font-bold">
              <ArrowRight className="w-4 h-4" /> {title}
            </div>
            {isDj ? (
               <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] uppercase font-bold">Declaración Jurada</Badge>
            ) : receiptUrl ? (
               <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#4892CC] hover:underline flex items-center gap-1">
                 <FileText className="w-3 h-3" /> Ver Comprobante
               </a>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500 block text-xs uppercase font-bold">Monto</span><span className="font-bold text-lg">{formatCurrency(Math.abs(payload.amount))}</span></div>
            <div><span className="text-gray-500 block text-xs uppercase font-bold">Categoría</span><span className="font-medium">{payload.category} - {payload.sub_category}</span></div>
            <div className="col-span-2"><span className="text-gray-500 block text-xs uppercase font-bold">Descripción</span><span className="text-gray-700">{desc}</span></div>
            {payload.presupuesto_id && (
              <div className="col-span-2 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100 text-xs">
                <span className="font-bold text-[#4892CC] block">Vinculado a Presupuesto Operativo:</span>
                <span className="font-semibold text-slate-700">{getBudgetMotivo(payload.presupuesto_id)}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    if (request.request_type.startsWith('delete_')) {
      return (
        <div className="mt-4 p-4 bg-red-50/50 rounded-xl space-y-2 border border-red-100">
          <div className="flex items-center gap-2 text-red-600 font-bold mb-2">
            <Trash2 className="w-4 h-4" /> Eliminación de Registro
          </div>
          <p className="text-sm text-gray-700">Se solicita eliminar el registro ID: <span className="font-bold">{request.reference_id}</span></p>
          <p className="text-sm text-gray-500"><span className="font-bold">Motivo:</span> {request.payload?.reason || 'No especificado'}</p>
        </div>
      );
    }
    
    return null;
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando solicitudes...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">
            {isAdminOrFinanzas ? 'Aprobaciones Pendientes' : 'Estado de mis Solicitudes'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isAdminOrFinanzas 
              ? 'Gestiona solicitudes de eliminación y gastos elevados del equipo.' 
              : 'Consulta el estado de tus solicitudes de gastos y eliminaciones de archivos.'}
          </p>
        </div>
        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 px-4 py-1 text-sm font-bold">
          {pendingRequests.length} pendientes
        </Badge>
      </div>

      {!canApprove && isAdminOrFinanzas && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm font-medium">
          No tienes permisos para aprobar o rechazar solicitudes. Solo visualización.
        </div>
      )}

      {pendingRequests.length === 0 ? (
        <Card className="rounded-2xl border-dashed bg-gray-50/50 p-12 text-center shadow-none">
          <Check className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700">Todo al día</h3>
          <p className="text-gray-500">No hay solicitudes pendientes de aprobación.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingRequests.map(request => (
            <Card key={request.id} className="rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
              <div className="flex items-start justify-between p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#4892CC]/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-[#4892CC]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {request.request_type === 'high_expense' ? 'Aprobación de Gasto Elevado' : request.request_type === 'engineer_expense' ? 'Aprobación de Gasto (Ingeniero)' : request.request_type === 'expense_approval' ? 'Aprobación de Gasto' : 'Aprobación de Eliminación'}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      <span className="font-medium text-gray-700">Solicitado por: {getColaboradorName(request.requested_by)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(parseISO(request.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                    </div>
                    {renderRequestDetails(request)}
                  </div>
                </div>
                
                {canApprove && (
                  <div className="flex flex-col gap-2 min-w-[120px]">
                    <Button 
                      onClick={() => handleAction(request, 'approve')} 
                      disabled={isProcessing === request.id}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-sm"
                    >
                      Aprobar
                    </Button>
                    <Button 
                      onClick={() => handleAction(request, 'reject')} 
                      disabled={isProcessing === request.id}
                      variant="outline"
                      className="border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
                    >
                      Rechazar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {historyRequests.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Historial Reciente</h2>
          <Card className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Solicitante</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Revisado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {historyRequests.map(h => (
                    <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {h.request_type === 'engineer_expense' ? 'Gasto Ingeniero' : h.request_type === 'expense_approval' ? 'Nuevo Gasto' : h.request_type}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{getColaboradorName(h.requested_by)}</td>
                      <td className="px-6 py-4 text-gray-500">{format(parseISO(h.created_at), 'dd MMM yyyy', { locale: es })}</td>
                      <td className="px-6 py-4">
                        {h.status === 'approved' ? (
                          <Badge className="bg-emerald-50 text-emerald-600 border-none">Aprobado</Badge>
                        ) : (
                          <Badge className="bg-red-50 text-red-600 border-none">Rechazado</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{h.reviewed_by ? getColaboradorName(h.reviewed_by) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
