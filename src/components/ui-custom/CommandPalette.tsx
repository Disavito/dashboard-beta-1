import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  UserCheck,
  FolderOpen,
  Package,
  BarChart3,
  FileCheck,
  FileText,
  Settings,
  PlusCircle,
  ClipboardList,
  Eye,
} from 'lucide-react';

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const navigationItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Ingresos', path: '/income', icon: ArrowUpCircle },
  { label: 'Gastos', path: '/expenses', icon: ArrowDownCircle },
  { label: 'Cuentas', path: '/accounts', icon: Wallet },
  { label: 'Socios', path: '/people', icon: UserCheck },
  { label: 'Documentos', path: '/partner-documents', icon: FolderOpen },
  { label: 'Inventario', path: '/inventory', icon: Package },
  { label: 'Presupuestos', path: '/presupuestos', icon: Wallet },
  { label: 'Reportes', path: '/reportes', icon: BarChart3 },
  { label: 'Aprobaciones', path: '/aprobaciones', icon: FileCheck },
  { label: 'Facturación', path: '/invoicing', icon: FileText },
  { label: 'Configuración', path: '/settings', icon: Settings },
];

const actionItems = [
  { label: 'Registrar Ingreso', path: '/income', icon: PlusCircle },
  { label: 'Registrar Gasto', path: '/expenses', icon: PlusCircle },
  { label: 'Solicitar Presupuesto', path: '/presupuestos', icon: ClipboardList },
  { label: 'Ver Aprobaciones', path: '/aprobaciones', icon: Eye },
];

export default function CommandPalette({ open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const navigate = useNavigate();

  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  // Global Ctrl+K / ⌘+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  const handleSelect = useCallback(
    (path: string) => {
      setOpen(false);
      navigate(path);
    },
    [navigate, setOpen]
  );

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar página o acción…" className="h-12 text-sm" />
      <CommandList className="max-h-[400px]">
        <CommandEmpty className="py-10 text-center text-sm text-muted-foreground">
          No se encontraron resultados.
        </CommandEmpty>

        {/* Navigation group */}
        <CommandGroup heading="Navegación Rápida">
          {navigationItems.map((item) => (
            <CommandItem
              key={`nav-${item.path}`}
              value={item.label}
              onSelect={() => handleSelect(item.path)}
              className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-150"
            >
              <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
              <span className="text-[13px] font-medium">{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Actions group */}
        <CommandGroup heading="Acciones">
          {actionItems.map((item) => (
            <CommandItem
              key={`action-${item.label}`}
              value={item.label}
              onSelect={() => handleSelect(item.path)}
              className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-150"
            >
              <item.icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
              <span className="text-[13px] font-bold">{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
