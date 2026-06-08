import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Wallet, FileText, CheckCircle, Clock, XCircle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';

interface Presupuesto {
  id: string;
  created_at: string;
  colaborador_id: string;
  motivo: string;
  monto_solicitado: number;
  monto_aprobado: number;
  monto_rendido: number;
  estado: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Cerrado';
  notas: string | null;
  fecha_aprobacion: string | null;
}

export default function PresupuestosPage() {
  const { user, roles } = useUser();
  const queryClient = useQueryClient();
  
  // Modals
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  
  // Selected Budget for Admin Actions
  const [selectedPresupuesto, setSelectedPresupuesto] = useState<Presupuesto | null>(null);

  // Form states - Request
  const [motivo, setMotivo] = useState('');
  const [monto, setMonto] = useState('');
  
  // Form states - Approval
  const [montoAprobado, setMontoAprobado] = useState('');
  const [notasAprobacion, setNotasAprobacion] = useState('');

  // Form states - Rejection
  const [notasRechazo, setNotasRechazo] = useState('');

  // Close presupuesto dialog state
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [presupuestoToClose, setPresupuestoToClose] = useState<Presupuesto | null>(null);

  const isAdminOrFinanzas = roles?.some(r => ['admin', 'finanzas_senior', 'finanzas_junior'].includes(r.toLowerCase()));

  // --- React Query: Fetch colaboradores ---
  const { data: colaboradores = {} } = useQuery({
    queryKey: ['supabaseData', 'colaboradores', 'presupuestos-map'],
    queryFn: async () => {
      const { data, error } = await supabase.from('colaboradores').select('user_id, name, apellidos');
      if (error) throw error;
      
      const map: Record<string, string> = {};
      data?.forEach(c => {
        if (c.user_id) {
          map[c.user_id] = `${c.name} ${c.apellidos}`.trim();
        }
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  // --- React Query: Fetch presupuestos ---
  const { data: presupuestos = [], isLoading: loading } = useQuery({
    queryKey: ['supabaseData', 'presupuestos_operativos', user?.id, isAdminOrFinanzas],
    queryFn: async () => {
      let query = supabase.from('presupuestos_operativos').select('*').order('created_at', { ascending: false });
      
      // Si no es admin/finanzas, solo ve sus propios presupuestos
      if (!isAdminOrFinanzas) {
        query = query.eq('colaborador_id', user!.id);
      }
      
      const { data, error } = await query;
      if (error) {
        if (error.code !== '42P01') { 
          throw error;
        }
        return [];
      }
      return (data as Presupuesto[]) || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  const presupuestosQueryKey = ['supabaseData', 'presupuestos_operativos'];

  // --- Mutation: Request (Create) ---
  const requestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('presupuestos_operativos').insert({
        colaborador_id: user?.id,
        motivo,
        monto_solicitado: Number(monto),
        estado: 'Pendiente'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Solicitud enviada correctamente');
      setIsRequestModalOpen(false);
      setMotivo(''); 
      setMonto('');
      queryClient.invalidateQueries({ queryKey: presupuestosQueryKey });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Error al enviar solicitud.');
    },
  });

  // --- Mutation: Approve ---
  const approveMutation = useMutation({
    mutationFn: async (presupuesto: Presupuesto) => {
      const { error } = await supabase
        .from('presupuestos_operativos')
        .update({
          estado: 'Aprobado',
          monto_aprobado: Number(montoAprobado),
          aprobado_por: user?.id,
          fecha_aprobacion: new Date().toISOString(),
          notas: notasAprobacion || null
        })
        .eq('id', presupuesto.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Presupuesto Aprobado correctamente');
      setIsApproveModalOpen(false);
      queryClient.invalidateQueries({ queryKey: presupuestosQueryKey });
    },
    onError: (err) => {
      console.error(err);
      toast.error('Error al aprobar presupuesto');
    },
  });

  // --- Mutation: Reject ---
  const rejectMutation = useMutation({
    mutationFn: async (presupuesto: Presupuesto) => {
      const { error } = await supabase
        .from('presupuestos_operativos')
        .update({
          estado: 'Rechazado',
          notas: notasRechazo || null
        })
        .eq('id', presupuesto.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Presupuesto Rechazado');
      setIsRejectModalOpen(false);
      queryClient.invalidateQueries({ queryKey: presupuestosQueryKey });
    },
    onError: (err) => {
      console.error(err);
      toast.error('Error al rechazar presupuesto');
    },
  });

  // --- Mutation: Close ---
  const closeMutation = useMutation({
    mutationFn: async (presupuesto: Presupuesto) => {
      const { error } = await supabase
        .from('presupuestos_operativos')
        .update({
          estado: 'Cerrado'
        })
        .eq('id', presupuesto.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Presupuesto Cerrado correctamente');
      setPresupuestoToClose(null);
      queryClient.invalidateQueries({ queryKey: presupuestosQueryKey });
    },
    onError: (err) => {
      console.error(err);
      toast.error('Error al cerrar presupuesto');
    },
  });

  // Crear Solicitud (Ingeniero)
  const handleRequest = async () => {
    if (!motivo || !monto || isNaN(Number(monto)) || Number(monto) <= 0) {
      return toast.error('Ingresa un motivo y monto válido');
    }
    requestMutation.mutate();
  };

  // Abrir Modal de Aprobación
  const openApproveModal = (presupuesto: Presupuesto) => {
    setSelectedPresupuesto(presupuesto);
    setMontoAprobado(presupuesto.monto_solicitado.toString());
    setNotasAprobacion('');
    setIsApproveModalOpen(true);
  };

  // Ejecutar Aprobación (Admin)
  const handleApprove = async () => {
    if (!selectedPresupuesto || !montoAprobado || isNaN(Number(montoAprobado)) || Number(montoAprobado) <= 0) {
      return toast.error('Ingresa un monto aprobado válido');
    }
    approveMutation.mutate(selectedPresupuesto);
  };

  // Abrir Modal de Rechazo
  const openRejectModal = (presupuesto: Presupuesto) => {
    setSelectedPresupuesto(presupuesto);
    setNotasRechazo('');
    setIsRejectModalOpen(true);
  };

  // Ejecutar Rechazo (Admin)
  const handleReject = async () => {
    if (!selectedPresupuesto) return;
    rejectMutation.mutate(selectedPresupuesto);
  };

  // Abrir diálogo de cierre
  const openCloseDialog = (presupuesto: Presupuesto) => {
    setPresupuestoToClose(presupuesto);
    setIsCloseDialogOpen(true);
  };

  // Cerrar Presupuesto (Admin)
  const handleClosePresupuesto = async () => {
    if (!presupuestoToClose) return;
    setIsCloseDialogOpen(false);
    closeMutation.mutate(presupuestoToClose);
  };

  const saving = requestMutation.isPending || approveMutation.isPending || rejectMutation.isPending || closeMutation.isPending;

  if (loading && presupuestos.length === 0) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-[#4892CC]" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Wallet className="w-8 h-8 text-[#4892CC]" />
            Presupuestos Operativos
          </h1>
          <p className="text-slate-500 font-medium">
            {isAdminOrFinanzas 
              ? 'Administra, aprueba y haz seguimiento a los presupuestos de campo del equipo.' 
              : 'Solicita y gestiona fondos a rendir para tus salidas a campo.'}
          </p>
        </div>
        {!isAdminOrFinanzas && (
          <Button onClick={() => setIsRequestModalOpen(true)} className="bg-[#4892CC] hover:bg-[#3b7cb0] text-white rounded-xl font-bold shadow-md">
            <Plus className="w-4 h-4 mr-2" /> Solicitar Fondos
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {presupuestos.map(p => {
          const porRendir = p.monto_aprobado - p.monto_rendido;
          const colaboradorName = colaboradores[p.colaborador_id] || 'Cargando...';
          
          return (
            <Card key={p.id} className="rounded-2xl border-slate-100 shadow-glass overflow-hidden flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 border-b border-slate-50">
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold text-slate-800 line-clamp-1">{p.motivo}</CardTitle>
                      <span className="text-xs font-semibold text-[#4892CC] block">
                        Por: {colaboradorName}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Solicitado: {format(parseISO(p.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </span>
                    </div>
                    <div>
                      {p.estado === 'Pendiente' && (
                        <span className="bg-amber-100 text-amber-800 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center whitespace-nowrap">
                          <Clock className="w-3 h-3 mr-1"/> Pendiente
                        </span>
                      )}
                      {p.estado === 'Aprobado' && (
                        <span className="bg-green-100 text-green-800 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center whitespace-nowrap">
                          <CheckCircle className="w-3 h-3 mr-1"/> Aprobado
                        </span>
                      )}
                      {p.estado === 'Rechazado' && (
                        <span className="bg-rose-100 text-rose-800 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center whitespace-nowrap">
                          <XCircle className="w-3 h-3 mr-1"/> Rechazado
                        </span>
                      )}
                      {p.estado === 'Cerrado' && (
                        <span className="bg-slate-100 text-slate-600 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center whitespace-nowrap">
                          <Check className="w-3 h-3 mr-1"/> Cerrado
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Monto Solicitado:</span>
                    <span className="font-bold">S/ {p.monto_solicitado.toFixed(2)}</span>
                  </div>
                  {p.estado !== 'Pendiente' && p.estado !== 'Rechazado' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Monto Aprobado:</span>
                        <span className="font-bold text-[#4892CC]">S/ {p.monto_aprobado.toFixed(2)}</span>
                      </div>
                      <div className="w-full h-px bg-slate-100 my-2" />
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Gastos Rendidos:</span>
                        <span className="font-bold text-emerald-600">S/ {p.monto_rendido.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-slate-700 font-bold">Saldo por Rendir:</span>
                        <span className={`font-black ${porRendir > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                          S/ {Math.max(0, porRendir).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                  
                  {p.notas && (
                    <div className="bg-slate-50 p-2.5 rounded-xl text-xs text-slate-500 border border-slate-100 mt-2">
                      <span className="font-bold block text-slate-600">Notas/Detalle:</span>
                      {p.notas}
                    </div>
                  )}
                </CardContent>
              </div>

              {/* Acciones de Administrador */}
              {isAdminOrFinanzas && (
                <div className="p-4 border-t border-slate-50 bg-slate-50/50 flex gap-2">
                  {p.estado === 'Pendiente' && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => openApproveModal(p)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-sm"
                      >
                        <Check className="w-4 h-4 mr-1"/> Aprobar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openRejectModal(p)}
                        className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-lg"
                      >
                        <X className="w-4 h-4 mr-1"/> Rechazar
                      </Button>
                    </>
                  )}
                  {p.estado === 'Aprobado' && (
                    <Button 
                      size="sm" 
                      onClick={() => openCloseDialog(p)}
                      className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm"
                    >
                      Cerrar Presupuesto
                    </Button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        {presupuestos.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700">Sin Presupuestos</h3>
            <p className="text-slate-500">No hay solicitudes de presupuestos operativos registradas.</p>
          </div>
        )}
      </div>

      {/* Modal: Solicitar Presupuesto (Ingeniero) */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-6 border-none shadow-premium">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Solicitar Presupuesto</DialogTitle>
            <DialogDescription>Pide fondos operativos para tu próxima salida a campo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Motivo de la salida / Compra</label>
              <Input placeholder="Ej. Viaje a Obra Sur - Viáticos y Gasolina" value={motivo} onChange={e => setMotivo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Monto Estimado (S/)</label>
              <Input type="number" placeholder="1500.00" value={monto} onChange={e => setMonto(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRequestModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleRequest} disabled={saving} className="bg-[#4892CC] text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Solicitud'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Aprobar Presupuesto (Admin) */}
      <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-6 border-none shadow-premium">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-emerald-600">Aprobar Presupuesto</DialogTitle>
            <DialogDescription>Valida y asigna el monto definitivo para este presupuesto.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm">
              <span className="text-slate-500 font-bold block">Motivo:</span>
              <span className="text-slate-800 font-medium">{selectedPresupuesto?.motivo}</span>
              <span className="text-slate-500 font-bold block mt-2">Monto Solicitado:</span>
              <span className="text-slate-800 font-bold">S/ {selectedPresupuesto?.monto_solicitado.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Monto Aprobado (S/)</label>
              <Input type="number" placeholder="Monto aprobado" value={montoAprobado} onChange={e => setMontoAprobado(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Notas de Aprobación</label>
              <Input placeholder="Ej. Aprobado para viáticos y transporte. Transferido." value={notasAprobacion} onChange={e => setNotasAprobacion(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsApproveModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleApprove} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Aprobación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Rechazar Presupuesto (Admin) */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-6 border-none shadow-premium">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-rose-600">Rechazar Presupuesto</DialogTitle>
            <DialogDescription>Especifica la razón del rechazo de esta solicitud.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm">
              <span className="text-slate-500 font-bold block">Motivo:</span>
              <span className="text-slate-800 font-medium">{selectedPresupuesto?.motivo}</span>
              <span className="text-slate-500 font-bold block mt-2">Monto Solicitado:</span>
              <span className="text-slate-800 font-bold">S/ {selectedPresupuesto?.monto_solicitado.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Notas / Razón de Rechazo</label>
              <Input placeholder="Ej. Fuera de presupuesto o falta documentación" value={notasRechazo} onChange={e => setNotasRechazo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleReject} disabled={saving} className="bg-rose-500 hover:bg-rose-600 text-white font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rechazar Solicitud'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cerrar Presupuesto */}
      <ConfirmationDialog
        isOpen={isCloseDialogOpen}
        onClose={() => { setIsCloseDialogOpen(false); setPresupuestoToClose(null); }}
        onConfirm={handleClosePresupuesto}
        title="Cerrar Presupuesto"
        description={`¿Estás seguro de cerrar el presupuesto de "${presupuestoToClose?.motivo ?? ''}"? Esto significa que la rendición en campo ha finalizado y no se podrán registrar más gastos.`}
        confirmText="Cerrar Presupuesto"
        variant="destructive"
      />
    </div>
  );
}
