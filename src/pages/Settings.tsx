import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/context/UserContext';
import { 
  Settings as SettingsIcon, 
  Clock, 
  Users, 
  Tag, 
  Save, 
  Loader2,
  Shield,
  MapPin,
  FileText,
  Upload,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

// ─────── Tipos ────────
interface Localidad {
  name: string;
  count: number;
}

// ─────── Componente Principal ────────
const SettingsPage: React.FC = () => {
  const { user, roles } = useUser();
  const isAdmin = roles?.includes('admin');
  const isAdminOrFinanzas = roles?.some(r => ['admin', 'finanzas_senior', 'finanzas_junior'].includes(r.toLowerCase()));
  const defaultTab = isAdminOrFinanzas ? 'horarios' : 'perfil';

  return (
    <div className="min-h-screen bg-background page-enter pb-10">
      <div className="w-full bg-card dark:bg-slate-900 border-b border-border/50 py-12 px-8 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <SettingsIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-foreground uppercase">
                Configuración
              </h1>
              <p className="text-muted-foreground font-medium mt-1">
                Gestiona los parámetros del sistema
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6 px-4 md:px-8">

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-2xl border border-border/50 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 h-auto">
          {isAdminOrFinanzas && (
            <TabsTrigger value="horarios" className="rounded-xl font-bold text-xs uppercase data-[state=active]:bg-card dark:bg-slate-900 data-[state=active]:shadow-sm py-2">
              <Clock className="w-3.5 h-3.5 mr-1.5" /> Horarios
            </TabsTrigger>
          )}
          {isAdminOrFinanzas && (
            <TabsTrigger value="categorias" className="rounded-xl font-bold text-xs uppercase data-[state=active]:bg-card dark:bg-slate-900 data-[state=active]:shadow-sm py-2">
              <Tag className="w-3.5 h-3.5 mr-1.5" /> Categorías
            </TabsTrigger>
          )}
          <TabsTrigger value="localidades" className="rounded-xl font-bold text-xs uppercase data-[state=active]:bg-card dark:bg-slate-900 data-[state=active]:shadow-sm py-2">
            <MapPin className="w-3.5 h-3.5 mr-1.5" /> Localidades
          </TabsTrigger>
          <TabsTrigger value="perfil" className="rounded-xl font-bold text-xs uppercase data-[state=active]:bg-card dark:bg-slate-900 data-[state=active]:shadow-sm py-2">
            <Shield className="w-3.5 h-3.5 mr-1.5" /> Perfil
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="equipo" className="rounded-xl font-bold text-xs uppercase data-[state=active]:bg-card dark:bg-slate-900 data-[state=active]:shadow-sm py-2">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Equipo
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="plantillas" className="rounded-xl font-bold text-xs uppercase data-[state=active]:bg-card dark:bg-slate-900 data-[state=active]:shadow-sm py-2">
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Plantillas
            </TabsTrigger>
          )}
        </TabsList>

        {/* ──── Horarios de Jornada ──── */}
        {isAdminOrFinanzas && (
          <TabsContent value="horarios">
            <HorariosSection isAdmin={isAdmin} />
          </TabsContent>
        )}

        {/* ──── Categorías de Gasto ──── */}
        {isAdminOrFinanzas && (
          <TabsContent value="categorias">
            <CategoriasSection />
          </TabsContent>
        )}

        {/* ──── Localidades ──── */}
        <TabsContent value="localidades">
          <LocalidadesSection />
        </TabsContent>

        {/* ──── Perfil ──── */}
        <TabsContent value="perfil">
          <PerfilSection user={user} roles={roles} />
        </TabsContent>

        {/* ──── Equipo ──── */}
        {isAdmin && (
          <TabsContent value="equipo">
            <EquipoSection />
          </TabsContent>
        )}

        {/* ──── Plantillas Carbone ──── */}
        {isAdmin && (
          <TabsContent value="plantillas">
            <PlantillasSection />
          </TabsContent>
        )}
      </Tabs>
      </div>
    </div>
  );
};

// ─────── Sección: Horarios ────────
const HorariosSection: React.FC<{ isAdmin?: boolean }> = ({ isAdmin }) => {
  const [entryStart, setEntryStart] = useState('09:20');
  const [entryEnd, setEntryEnd] = useState('09:45');
  const [exitStart, setExitStart] = useState('18:20');
  const [exitEnd, setExitEnd] = useState('18:40');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadHorarios = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('configuracion')
          .select('valor')
          .eq('clave', 'horarios_jornada')
          .single();

        if (error && error.code !== 'PGRST116') throw error; // Ignorar si no existe

        if (data?.valor) {
          const horarios = data.valor as any;
          if (horarios.entryStart) setEntryStart(horarios.entryStart);
          if (horarios.entryEnd) setEntryEnd(horarios.entryEnd);
          if (horarios.exitStart) setExitStart(horarios.exitStart);
          if (horarios.exitEnd) setExitEnd(horarios.exitEnd);
        }
      } catch (err) {
        console.error('Error al cargar horarios:', err);
      } finally {
        setLoading(false);
      }
    };
    loadHorarios();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Usamos el id 1 por convención o buscamos si existe.
      // Upsert requiere el ID o conflicto. Usaremos un select primero o un update si existe.
      const payload = {
        entryStart,
        entryEnd,
        exitStart,
        exitEnd
      };

      const { data: existing } = await supabase
        .from('configuracion')
        .select('id')
        .eq('clave', 'horarios_jornada')
        .single();

      let error;
      if (existing) {
        const res = await supabase
          .from('configuracion')
          .update({ valor: payload })
          .eq('id', existing.id);
        error = res.error;
      } else {
        const res = await supabase
          .from('configuracion')
          .insert([{ clave: 'horarios_jornada', valor: payload, descripcion: 'Horarios de entrada y salida permitidos' }]);
        error = res.error;
      }

      if (error) throw error;
      toast.success('Horarios guardados correctamente');
    } catch (err) {
      console.error('Error al guardar horarios:', err);
      toast.error('Error al guardar horarios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border border-border/50 shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#4892CC]" /> Ventanas Horarias de Jornada
        </CardTitle>
        <CardDescription>
          Define las ventanas de tiempo permitidas para registrar entrada y salida sin justificación.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#4892CC]" />
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4 p-6 bg-emerald-50/50 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-2xl border border-emerald-100">
                <h3 className="font-black text-emerald-800 uppercase text-sm tracking-tight">Ventana de Entrada</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-emerald-600/60 tracking-widest">Desde</Label>
                    <Input type="time" value={entryStart} onChange={e => setEntryStart(e.target.value)} className="bg-card dark:bg-slate-900 border-emerald-200 rounded-xl h-12 font-mono font-bold text-lg" disabled={!isAdmin} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-emerald-600/60 tracking-widest">Hasta</Label>
                    <Input type="time" value={entryEnd} onChange={e => setEntryEnd(e.target.value)} className="bg-card dark:bg-slate-900 border-emerald-200 rounded-xl h-12 font-mono font-bold text-lg" disabled={!isAdmin} />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6 bg-red-50/50 dark:bg-red-500/10 dark:text-red-400 rounded-2xl border border-red-100">
                <h3 className="font-black text-red-800 uppercase text-sm tracking-tight">Ventana de Salida</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-red-600/60 tracking-widest">Desde</Label>
                    <Input type="time" value={exitStart} onChange={e => setExitStart(e.target.value)} className="bg-card dark:bg-slate-900 border-red-200 rounded-xl h-12 font-mono font-bold text-lg" disabled={!isAdmin} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-red-600/60 tracking-widest">Hasta</Label>
                    <Input type="time" value={exitEnd} onChange={e => setExitEnd(e.target.value)} className="bg-card dark:bg-slate-900 border-red-200 rounded-xl h-12 font-mono font-bold text-lg" disabled={!isAdmin} />
                  </div>
                </div>
              </div>
            </div>

            {isAdmin && (
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-[#4892CC] hover:bg-[#3C8B93] text-white font-bold rounded-xl h-12 px-6 shadow-lg shadow-[#4892CC]/20"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 
                Guardar Horarios
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ─────── Sección: Categorías de Gasto ────────
const CategoriasSection: React.FC = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gastos')
        .select('category')
        .not('category', 'is', null);
      
      if (error) throw error;
      
      const uniqueCategories = [...new Set((data || []).map(g => g.category).filter(Boolean))] as string[];
      setCategories(uniqueCategories.sort());
    } catch (err) {
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <Card className="border border-border/50 shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
          <Tag className="w-5 h-5 text-[#4892CC]" /> Categorías de Gasto
        </CardTitle>
        <CardDescription>
          Categorías detectadas en los gastos registrados. Las nuevas categorías se crean al registrar un gasto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#4892CC]" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <Badge key={cat} className="bg-muted text-foreground/80 border-none rounded-xl px-4 py-2 font-bold text-sm hover:bg-slate-200 transition-colors">
                  {cat}
                </Badge>
              ))}
              {categories.length === 0 && (
                <p className="text-muted-foreground/70 italic text-sm">No hay categorías registradas aún.</p>
              )}
            </div>

            <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
              <p className="text-xs text-muted-foreground font-medium">
                <strong>{categories.length}</strong> categorías únicas detectadas en la base de datos.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─────── Sección: Localidades ────────
const LocalidadesSection: React.FC = () => {
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocalidades = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('socio_titulares')
          .select('localidad');
        
        if (error) throw error;

        const countMap = new Map<string, number>();
        (data || []).forEach(s => {
          if (s.localidad) {
            countMap.set(s.localidad, (countMap.get(s.localidad) || 0) + 1);
          }
        });

        const sorted = Array.from(countMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        setLocalidades(sorted);
      } catch {
        toast.error('Error al cargar localidades');
      } finally {
        setLoading(false);
      }
    };
    fetchLocalidades();
  }, []);

  return (
    <Card className="border border-border/50 shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#4892CC]" /> Localidades Registradas
        </CardTitle>
        <CardDescription>
          Localidades extraídas del padrón de socios, con conteo de socios por localidad.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#4892CC]" />
          </div>
        ) : (
          <div className="space-y-4">
            {localidades.map(loc => (
              <div key={loc.name} className="flex items-center justify-between p-4 bg-muted/50/50 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#4892CC]/10 rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#4892CC]" />
                  </div>
                  <span className="font-bold text-foreground/80">{loc.name}</span>
                </div>
                <Badge className="bg-[#4892CC]/10 text-[#4892CC] border-none font-black text-sm px-3 py-1">
                  {loc.count} socios
                </Badge>
              </div>
            ))}
            {localidades.length === 0 && (
              <p className="text-muted-foreground/70 italic text-sm text-center py-8">No hay localidades registradas.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─────── Sección: Perfil ────────
const PerfilSection: React.FC<{ user: any; roles: string[] | null }> = ({ user, roles }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Contraseña actualizada correctamente');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error('Error al cambiar contraseña', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border border-border/50 shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#4892CC]" /> Mi Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-widest">Email</Label>
              <Input value={user?.email || ''} disabled className="bg-muted/50 border-border/50 rounded-xl h-12 font-medium" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-widest">Roles</Label>
              <div className="flex flex-wrap gap-2 pt-2">
                {roles?.map(role => (
                  <Badge key={role} className="bg-[#4892CC]/10 text-[#4892CC] border-none font-bold px-3 py-1 rounded-lg uppercase text-xs">
                    <Shield className="w-3 h-3 mr-1" /> {role}
                  </Badge>
                )) || (
                  <span className="text-muted-foreground/70 text-sm italic">Sin roles asignados</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/50 shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-black uppercase tracking-tight">Cambiar Contraseña</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-widest">Nueva Contraseña</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="bg-card dark:bg-slate-900 border-border rounded-xl h-12" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-widest">Confirmar Contraseña</Label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repetir contraseña" className="bg-card dark:bg-slate-900 border-border rounded-xl h-12" />
          </div>
          <Button 
            onClick={handleChangePassword}
            disabled={!newPassword || !confirmPassword || isSaving}
            className="bg-[#4892CC] hover:bg-[#3C8B93] text-white font-bold rounded-xl h-12 px-6 shadow-lg shadow-[#4892CC]/20"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Actualizar Contraseña
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;

// ─────── Sección: Equipo & Permisos ────────
const EquipoSection: React.FC = () => {
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEquipo = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, name, apellidos, cargo, custom_permissions, user_id')
        .not('user_id', 'is', null) // Only actual users that can log in
        .order('name');
      
      if (error) throw error;
      setColaboradores(data || []);
    } catch (error) {
      console.error('Error fetching equipo:', error);
      toast.error('Error al cargar al equipo de colaboradores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipo();
  }, [fetchEquipo]);

  const handleTogglePermission = async (colabId: string, permissionKey: string, currentValue: boolean, currentPermissions: Record<string, boolean>) => {
    const updatedPermissions = { ...currentPermissions, [permissionKey]: !currentValue };
    
    // Optimistic update
    setColaboradores(prev => prev.map(c => c.id === colabId ? { ...c, custom_permissions: updatedPermissions } : c));

    try {
      const { error } = await supabase
        .from('colaboradores')
        .update({ custom_permissions: updatedPermissions })
        .eq('id', colabId);
      
      if (error) {
        throw error;
      }
      toast.success('Permisos actualizados');
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('No se pudo guardar el cambio de permiso');
      // Revert on error
      fetchEquipo();
    }
  };

  return (
    <Card className="border border-border/50 shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
          <Users className="w-5 h-5 text-[#4892CC]" /> Equipo y Permisos Especiales
        </CardTitle>
        <CardDescription>
          Otorga permisos especiales a los colaboradores para realizar acciones restringidas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#4892CC]" />
          </div>
        ) : (
          <div className="space-y-4">
            {colaboradores.map(colab => {
              const perms = colab.custom_permissions || {};
              const canViewIncome = !!perms.can_view_income;
              const canViewExpenses = !!perms.can_view_expenses;
              const canViewAccounts = !!perms.can_view_accounts;
              const canDeleteDocuments = !!perms.can_delete_documents;
              const canInvoiceOnly = !!perms.can_invoice_only;
              const canDeleteBlueprints = !!perms.can_delete_blueprints;
              const canManageInventory = !!perms.can_manage_inventory;
              const canManageJornada = !!perms.can_manage_jornada;

              return (
                <div key={colab.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-muted/50/50 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors gap-4">
                  <div>
                    <h3 className="font-bold text-foreground/90 uppercase text-sm">
                      {colab.name} {colab.apellidos}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">{colab.cargo || 'Ingeniero / Colaborador'}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full lg:w-auto mt-3 md:mt-0">
                    <SwitchItem id="income" colabId={colab.id} checked={canViewIncome} onChange={() => handleTogglePermission(colab.id, 'can_view_income', canViewIncome, perms)} label="Ingresos" />
                    <SwitchItem id="expenses" colabId={colab.id} checked={canViewExpenses} onChange={() => handleTogglePermission(colab.id, 'can_view_expenses', canViewExpenses, perms)} label="Gastos" />
                    <SwitchItem id="accounts" colabId={colab.id} checked={canViewAccounts} onChange={() => handleTogglePermission(colab.id, 'can_view_accounts', canViewAccounts, perms)} label="Cuentas" />
                    <SwitchItem id="docs" colabId={colab.id} checked={canDeleteDocuments} onChange={() => handleTogglePermission(colab.id, 'can_delete_documents', canDeleteDocuments, perms)} label="Votar Docs Varios" />
                    <SwitchItem id="docs-planos" colabId={colab.id} checked={canDeleteBlueprints} onChange={() => handleTogglePermission(colab.id, 'can_delete_blueprints', canDeleteBlueprints, perms)} label="Borrar Planos/Memo" />
                    <SwitchItem id="invoicing" colabId={colab.id} checked={canInvoiceOnly} onChange={() => handleTogglePermission(colab.id, 'can_invoice_only', canInvoiceOnly, perms)} label="Facturación" />
                    <SwitchItem id="inventory" colabId={colab.id} checked={canManageInventory} onChange={() => handleTogglePermission(colab.id, 'can_manage_inventory', canManageInventory, perms)} label="Inventarios" />
                    <SwitchItem id="jornada" colabId={colab.id} checked={canManageJornada} onChange={() => handleTogglePermission(colab.id, 'can_manage_jornada', canManageJornada, perms)} label="Control Jornadas" />
                  </div>
                </div>
              );
            })}
            
            {colaboradores.length === 0 && (
              <p className="text-muted-foreground/70 italic text-sm text-center py-8">No hay colaboradores vinculados a usuarios del sistema.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const SwitchItem: React.FC<{ id: string, colabId: string, checked: boolean, onChange: () => void, label: string }> = ({ id, colabId, checked, onChange, label }) => (
  <div className="flex items-center justify-between bg-card dark:bg-slate-900 border border-border/50 p-2 rounded-xl gap-3 min-w-[170px] shadow-sm">
    <Label htmlFor={`${id}-${colabId}`} className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight cursor-pointer">
      {label}
    </Label>
    <Switch 
      id={`${id}-${colabId}`}
      checked={checked}
      onCheckedChange={onChange}
      className="scale-90"
    />
  </div>
);

const PlantillasSection: React.FC = () => {
  const [fichaTemplateId, setFichaTemplateId] = useState<string>('');
  const [contratoTemplateId, setContratoTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploadingFicha, setUploadingFicha] = useState(false);
  const [uploadingContrato, setUploadingContrato] = useState(false);

  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('configuracion')
          .select('valor')
          .eq('clave', 'carbone_templates')
          .maybeSingle();

        if (error) throw error;

        if (data?.valor) {
          const templates = data.valor as any;
          if (templates.ficha) setFichaTemplateId(templates.ficha);
          if (templates.contrato) setContratoTemplateId(templates.contrato);
        }
      } catch (err) {
        console.error('Error al cargar plantillas:', err);
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'ficha' | 'contrato') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      toast.error('El archivo debe tener formato Word (.docx)');
      return;
    }

    if (type === 'ficha') setUploadingFicha(true);
    else setUploadingContrato(true);

    try {
      const formData = new FormData();
      formData.append('template', file);
      formData.append('type', type);

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/templates/upload', {
        method: 'POST',
        body: formData,
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
      });

      if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(errorMsg || `Error del servidor: ${response.status}`);
      }

      const resData = await response.json();
      if (resData.success && resData.templateId) {
        toast.success(`Plantilla de ${type === 'ficha' ? 'Ficha' : 'Contrato'} cargada exitosamente`);
        if (type === 'ficha') setFichaTemplateId(resData.templateId);
        else setContratoTemplateId(resData.templateId);
      } else {
        throw new Error(resData.error || 'No se recibió ID de plantilla');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`No se pudo subir la plantilla: ${err.message || err}`);
    } finally {
      if (type === 'ficha') setUploadingFicha(false);
      else setUploadingContrato(false);
    }
  };

  return (
    <Card className="border border-border/50 shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#4892CC]" /> Plantillas para Carbone.io
        </CardTitle>
        <CardDescription>
          Sube tus archivos de Word (.docx) que contienen las variables de fusión. Los archivos se almacenarán directamente en tu instancia de Carbone.io.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#4892CC]" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Plantilla Ficha */}
            <div className="border border-border/50 rounded-2xl p-6 bg-muted/50/50 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-foreground/90 uppercase text-sm tracking-tight flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#4892CC]" /> Ficha Técnica
                  </h3>
                  <Badge variant={fichaTemplateId ? 'default' : 'outline'} className={fichaTemplateId ? 'bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-4000 text-white' : 'text-muted-foreground/70 border-border'}>
                    {fichaTemplateId ? 'ACTIVO' : 'PENDIENTE'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  Se genera automáticamente al registrar un nuevo socio en el padrón.
                </p>
                {fichaTemplateId && (
                  <div className="p-3 bg-card dark:bg-slate-900 border border-border/50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">Template ID</span>
                    <p className="font-mono text-xs text-muted-foreground break-all select-all font-bold">{fichaTemplateId}</p>
                  </div>
                )}
              </div>
              <div className="pt-2 space-y-2">
                {fichaTemplateId && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const resp = await fetch('/api/admin/templates/download/ficha', {
                          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
                        });
                        if (!resp.ok) throw new Error('Error al descargar');
                        const blob = await resp.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'plantilla_ficha.docx';
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (err: any) {
                        toast.error('Error al descargar plantilla: ' + err.message);
                      }
                    }}
                    className="w-full text-foreground/80 hover:text-foreground border border-border hover:bg-muted/50 rounded-xl h-11 font-bold flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4 text-[#4892CC]" />
                    Descargar Plantilla Actual
                  </Button>
                )}
                <input
                  type="file"
                  id="upload-ficha-input"
                  accept=".docx"
                  className="hidden"
                  onChange={(e) => handleUpload(e, 'ficha')}
                  disabled={uploadingFicha}
                />
                <Button
                  onClick={() => document.getElementById('upload-ficha-input')?.click()}
                  disabled={uploadingFicha}
                  className="w-full bg-card dark:bg-slate-900 hover:bg-muted/50 text-foreground/80 border border-border rounded-xl h-11 font-bold flex items-center justify-center gap-2"
                >
                  {uploadingFicha ? <Loader2 className="w-4 h-4 animate-spin text-[#4892CC]" /> : <Upload className="w-4 h-4 text-muted-foreground/70" />}
                  {fichaTemplateId ? 'Reemplazar Plantilla' : 'Cargar Ficha (.docx)'}
                </Button>
              </div>
            </div>

            {/* Plantilla Contrato */}
            <div className="border border-border/50 rounded-2xl p-6 bg-muted/50/50 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-foreground/90 uppercase text-sm tracking-tight flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#4892CC]" /> Contrato de Socio
                  </h3>
                  <Badge variant={contratoTemplateId ? 'default' : 'outline'} className={contratoTemplateId ? 'bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-4000 text-white' : 'text-muted-foreground/70 border-border'}>
                    {contratoTemplateId ? 'ACTIVO' : 'PENDIENTE'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  Se genera automáticamente cuando se registra un pago asociado al DNI de un socio.
                </p>
                {contratoTemplateId && (
                  <div className="p-3 bg-card dark:bg-slate-900 border border-border/50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">Template ID</span>
                    <p className="font-mono text-xs text-muted-foreground break-all select-all font-bold">{contratoTemplateId}</p>
                  </div>
                )}
              </div>
              <div className="pt-2 space-y-2">
                {contratoTemplateId && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const resp = await fetch('/api/admin/templates/download/contrato', {
                          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
                        });
                        if (!resp.ok) throw new Error('Error al descargar');
                        const blob = await resp.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'plantilla_contrato.docx';
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (err: any) {
                        toast.error('Error al descargar plantilla: ' + err.message);
                      }
                    }}
                    className="w-full text-foreground/80 hover:text-foreground border border-border hover:bg-muted/50 rounded-xl h-11 font-bold flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4 text-[#4892CC]" />
                    Descargar Plantilla Actual
                  </Button>
                )}
                <input
                  type="file"
                  id="upload-contrato-input"
                  accept=".docx"
                  className="hidden"
                  onChange={(e) => handleUpload(e, 'contrato')}
                  disabled={uploadingContrato}
                />
                <Button
                  onClick={() => document.getElementById('upload-contrato-input')?.click()}
                  disabled={uploadingContrato}
                  className="w-full bg-card dark:bg-slate-900 hover:bg-muted/50 text-foreground/80 border border-border rounded-xl h-11 font-bold flex items-center justify-center gap-2"
                >
                  {uploadingContrato ? <Loader2 className="w-4 h-4 animate-spin text-[#4892CC]" /> : <Upload className="w-4 h-4 text-muted-foreground/70" />}
                  {contratoTemplateId ? 'Reemplazar Plantilla' : 'Cargar Contrato (.docx)'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

