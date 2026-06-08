import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Menu,
  UserCheck,
  FolderOpen,
  Package,
  Wallet,
  FileText,
  BarChart3,
  Settings,
  HelpCircle,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useNavigationAccess } from '@/hooks/useNavigationAccess';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

const primaryItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Ingresos', path: '/income', icon: TrendingUp },
  { name: 'Gastos', path: '/expenses', icon: TrendingDown },
  { name: 'Aprobaciones', path: '/aprobaciones', icon: CheckCircle },
];

const moreItems: NavItem[] = [
  { name: 'Titulares', path: '/people', icon: UserCheck },
  { name: 'Documentos', path: '/partner-documents', icon: FolderOpen },
  { name: 'Inventario', path: '/inventory', icon: Package },
  { name: 'Presupuestos', path: '/presupuestos', icon: Wallet },
  { name: 'Facturación', path: '/invoicing', icon: FileText },
  { name: 'Reportes', path: '/reportes', icon: BarChart3 },
  { name: 'Configuración', path: '/settings', icon: Settings },
  { name: 'Ayuda', path: '/ayuda', icon: HelpCircle },
];

export default function BottomNav() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { canAccess } = useNavigationAccess();

  if (!isMobile) return null;

  const visiblePrimaryItems = primaryItems.filter(item => canAccess(item.path));
  const visibleMoreItems = moreItems.filter(item => canAccess(item.path));

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== '/' && location.pathname.startsWith(path));

  const isMoreActive = visibleMoreItems.some((item) => isActive(item.path));

  const handleNavigate = (path: string) => {
    navigate(path);
    setSheetOpen(false);
  };

  return (
    <>
      {/* Bottom navigation bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16 px-1">
          {visiblePrimaryItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-all duration-200',
                  'active:scale-95',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {/* Active indicator dot */}
                {active && (
                  <span className="absolute top-1.5 w-1 h-1 rounded-full bg-primary animate-in fade-in zoom-in duration-200" />
                )}
                <item.icon
                  className={cn(
                    'w-5 h-5 transition-all duration-200',
                    active && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]'
                  )}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span
                  className={cn(
                    'text-[10px] leading-tight transition-all duration-200',
                    active ? 'font-bold' : 'font-medium'
                  )}
                >
                  {item.name}
                </span>
              </button>
            );
          })}

          {/* "Más" button */}
          <button
            onClick={() => setSheetOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-all duration-200',
              'active:scale-95',
              isMoreActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {isMoreActive && (
              <span className="absolute top-1.5 w-1 h-1 rounded-full bg-primary animate-in fade-in zoom-in duration-200" />
            )}
            <Menu
              className={cn(
                'w-5 h-5 transition-all duration-200',
                isMoreActive && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]'
              )}
              strokeWidth={isMoreActive ? 2.5 : 1.8}
            />
            <span
              className={cn(
                'text-[10px] leading-tight transition-all duration-200',
                isMoreActive ? 'font-bold' : 'font-medium'
              )}
            >
              Más
            </span>
          </button>
        </div>
      </nav>

      {/* Sheet with remaining nav items */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-2 pb-8">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base font-bold">Navegación</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Accede a todas las secciones
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-4 gap-1 pt-2">
            {visibleMoreItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl transition-all duration-200',
                    'active:scale-95',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                      active
                        ? 'bg-primary/15 shadow-sm'
                        : 'bg-muted/60'
                    )}
                  >
                    <item.icon
                      className="w-5 h-5"
                      strokeWidth={active ? 2.5 : 1.8}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] leading-tight text-center',
                      active ? 'font-bold' : 'font-medium'
                    )}
                  >
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
