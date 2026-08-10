import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  Briefcase, 
  ShieldCheck, 
  Loader2, 
  Eye, 
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface CreateUserModalProps {
  onUserCreated?: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ onUserCreated }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState('engineer');
  const [cargo, setCargo] = useState('');

  // Custom Permissions State
  const [perms, setPerms] = useState({
    can_view_income: false,
    can_view_expenses: false,
    can_view_accounts: false,
    can_invoice_only: false,
    can_manage_inventory: false,
    can_manage_jornada: false,
    can_delete_documents: false,
    can_delete_blueprints: false
  });

  const resetForm = () => {
    setName('');
    setApellidos('');
    setEmail('');
    setPassword('');
    setRoleName('engineer');
    setCargo('');
    setShowPassword(false);
    setPerms({
      can_view_income: false,
      can_view_expenses: false,
      can_view_accounts: false,
      can_invoice_only: false,
      can_manage_inventory: false,
      can_manage_jornada: false,
      can_delete_documents: false,
      can_delete_blueprints: false
    });
  };

  const handleTogglePerm = (key: keyof typeof perms) => {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error('Por favor completa los campos obligatorios (Nombre, Email y Contraseña)');
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sesión no encontrada. Por favor vuelve a iniciar sesión.');
        return;
      }

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          apellidos: apellidos.trim(),
          email: email.trim().toLowerCase(),
          password: password,
          role_name: roleName,
          cargo: cargo.trim() || (roleName === 'admin' ? 'Administrador' : roleName === 'finanzas_senior' ? 'Finanzas Senior' : 'Ingeniero / Colaborador'),
          custom_permissions: perms
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear usuario');
      }

      toast.success(`🎉 Usuario ${name} (${email}) creado exitosamente`);
      resetForm();
      setOpen(false);

      if (onUserCreated) {
        onUserCreated();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'No se pudo crear el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#00468c] hover:bg-[#003366] text-white font-bold rounded-xl shadow-md flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          <span>+ Crear Nuevo Usuario</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-[#00468c]">
            <UserPlus className="w-5 h-5" /> Registrar Nuevo Usuario en el Sistema
          </DialogTitle>
          <DialogDescription>
            Crea una cuenta en Supabase Authentication y asigna credenciales y permisos inmediatamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Nombre y Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#00468c]" /> Nombre *
              </Label>
              <Input
                placeholder="Ej. Carlos"
                value={name}
                onChange={e => setName(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#00468c]" /> Apellidos
              </Label>
              <Input
                placeholder="Ej. Mendoza Torres"
                value={apellidos}
                onChange={e => setApellidos(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Email y Contraseña */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-[#00468c]" /> Correo Electrónico *
              </Label>
              <Input
                type="email"
                placeholder="ejemplo@fimagadi.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-[#00468c]" /> Contraseña Inicial *
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="rounded-xl pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Rol y Cargo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00468c]" /> Rol Principal
              </Label>
              <Select value={roleName} onValueChange={setRoleName}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">🛡️ Administrador</SelectItem>
                  <SelectItem value="finanzas_senior">💎 Finanzas Senior</SelectItem>
                  <SelectItem value="finanzas_junior">📊 Finanzas Junior</SelectItem>
                  <SelectItem value="engineer">👷 Ingeniero / Colaborador</SelectItem>
                  <SelectItem value="operativo">🛠️ Operativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-[#00468c]" /> Cargo / Título
              </Label>
              <Input
                placeholder="Ej. Residente de Obra"
                value={cargo}
                onChange={e => setCargo(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Permisos Especiales Opcionales */}
          <div className="border border-border/50 rounded-2xl p-4 bg-muted/30 space-y-3">
            <h4 className="text-xs font-black uppercase text-[#00468c] tracking-wider">
              Permisos Especiales Inmediatos (Opcional)
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ModalSwitch label="Ingresos" checked={perms.can_view_income} onChange={() => handleTogglePerm('can_view_income')} />
              <ModalSwitch label="Gastos" checked={perms.can_view_expenses} onChange={() => handleTogglePerm('can_view_expenses')} />
              <ModalSwitch label="Cuentas" checked={perms.can_view_accounts} onChange={() => handleTogglePerm('can_view_accounts')} />
              <ModalSwitch label="Facturación" checked={perms.can_invoice_only} onChange={() => handleTogglePerm('can_invoice_only')} />
              <ModalSwitch label="Inventarios" checked={perms.can_manage_inventory} onChange={() => handleTogglePerm('can_manage_inventory')} />
              <ModalSwitch label="Control Jornadas" checked={perms.can_manage_jornada} onChange={() => handleTogglePerm('can_manage_jornada')} />
              <ModalSwitch label="Borrar Docs Varios" checked={perms.can_delete_documents} onChange={() => handleTogglePerm('can_delete_documents')} />
              <ModalSwitch label="Borrar Planos/Memo" checked={perms.can_delete_blueprints} onChange={() => handleTogglePerm('can_delete_blueprints')} />
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#00468c] hover:bg-[#003366] text-white font-bold rounded-xl shadow-md min-w-[140px]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Crear Usuario
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ModalSwitch: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between bg-card dark:bg-slate-900 border border-border/50 px-3 py-1.5 rounded-xl gap-2 shadow-xs">
    <span className="text-[11px] font-bold uppercase text-muted-foreground">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} className="scale-75" />
  </div>
);
