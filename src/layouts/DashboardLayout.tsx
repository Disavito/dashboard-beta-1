import { useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Wallet,
  ChevronLeft,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  UserCheck,
  Settings as SettingsIcon,
  Loader2,
  FolderOpen,
  FileText,
  Clock,
  Menu,
  LogOut,
  Package,
  BarChart3,
  ChevronDown,
  Shield,
  FileCheck,
  HelpCircle,
  Search,
  Box,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui-custom/ThemeToggle';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabaseClient';
import NotificationBell from '@/components/ui/NotificationBell';
import SyncStatusIndicator from '@/components/ui-custom/SyncStatusIndicator';
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime';
import CommandPalette from '@/components/ui-custom/CommandPalette';
import BottomNav from '@/components/ui-custom/BottomNav';
import Breadcrumbs from '@/components/ui-custom/Breadcrumbs';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigationAccess } from '@/hooks/useNavigationAccess';

// Helper prefetching functions
const prefetchSocioStatus = async (queryClient: any) => {
  const queryKey = ['supabaseData', 'vw_socio_titulares_estado', '*', '{}', '{"column":"apellidoPaterno","ascending":true}'];
  const state = queryClient.getQueryState(queryKey);
  if (state && state.status === 'success') return;

  await queryClient.prefetchQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase.from('vw_socio_titulares_estado')
        .select('*', { count: 'exact' })
        .order('apellidoPaterno', { ascending: true });
      
      const BATCH_SIZE = 1000;
      const { data: firstBatch, error, count } = await query.range(0, BATCH_SIZE - 1);
      if (error) throw error;
      
      let allData = firstBatch || [];
      if (count && count > BATCH_SIZE) {
        const remainingBatches = Math.ceil((count - BATCH_SIZE) / BATCH_SIZE);
        const promises = [];
        for (let i = 1; i <= remainingBatches; i++) {
          const from = i * BATCH_SIZE;
          const to = from + BATCH_SIZE - 1;
          promises.push(
            supabase.from('vw_socio_titulares_estado')
              .select('*')
              .order('apellidoPaterno', { ascending: true })
              .range(from, to)
          );
        }
        const results = await Promise.all(promises);
        results.forEach(({ data, error }) => {
          if (error) throw error;
          if (data) allData.push(...data);
        });
      }
      return { data: allData, totalCount: count || allData.length };
    },
    staleTime: 1000 * 30, // 30 segundos (suficiente para navegacion SPA sin secuestrar la cache)
  });
};

const prefetchSocioDocuments = async (queryClient: any) => {
  const queryKey = ['supabaseData', 'socio_documentos', 'id, socio_id, tipo_documento, link_documento', '{}', 'null'];
  const state = queryClient.getQueryState(queryKey);
  if (state && state.status === 'success') return;

  await queryClient.prefetchQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase.from('socio_documentos')
        .select('id, socio_id, tipo_documento, link_documento', { count: 'exact' })
        .is('deleted_at', null);
      
      const BATCH_SIZE = 1000;
      const { data: firstBatch, error, count } = await query.range(0, BATCH_SIZE - 1);
      if (error) throw error;
      
      let allData = firstBatch || [];
      if (count && count > BATCH_SIZE) {
        const remainingBatches = Math.ceil((count - BATCH_SIZE) / BATCH_SIZE);
        const promises = [];
        for (let i = 1; i <= remainingBatches; i++) {
          const from = i * BATCH_SIZE;
          const to = from + BATCH_SIZE - 1;
          promises.push(
            supabase.from('socio_documentos')
              .select('id, socio_id, tipo_documento, link_documento')
              .is('deleted_at', null)
              .range(from, to)
          );
        }
        const results = await Promise.all(promises);
        results.forEach(({ data, error }) => {
          if (error) throw error;
          if (data) allData.push(...data);
        });
      }
      return { data: allData, totalCount: count || allData.length };
    },
    staleTime: 1000 * 30, // 30 segundos
  });
};

function DashboardLayout() {
  useGlobalRealtime();
  const queryClient = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Finanzas': true,
    'Gestión Corporativa': true,
    'Operaciones': true,
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, roles, loading } = useUser();
  const { canAccess } = useNavigationAccess();

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );

  const menuGroups = [
    {
      title: 'Principal',
      items: [
        { name: 'Resumen', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Manuales', path: '/ayuda', icon: HelpCircle },
      ]
    },
    {
      title: 'Finanzas',
      items: [
        { name: 'Ingresos', path: '/income', icon: ArrowUpCircle },
        { name: 'Gastos', path: '/expenses', icon: ArrowDownCircle },
        { name: 'Facturación', path: '/invoicing', icon: FileText },
        { name: 'Cuentas', path: '/accounts', icon: Wallet },
        { name: 'Aprobaciones', path: '/aprobaciones', icon: FileCheck },
      ]
    },
    {
      title: 'Gestión Corporativa',
      items: [
        { name: 'Titulares', path: '/people', icon: UserCheck },
        { name: 'Documentos', path: '/partner-documents', icon: FolderOpen },
        { name: 'Archivo Físico', path: '/cajas', icon: Box },
      ]
    },
    {
      title: 'Operaciones',
      items: [
        { name: 'Jornada', path: '/jornada', icon: Clock },
        { name: 'Inventario', path: '/inventory', icon: Package },
        { name: 'Presupuestos', path: '/presupuestos', icon: Wallet },
      ]
    },
    {
      title: 'Analítica',
      items: [
        { name: 'Reportes', path: '/reportes', icon: BarChart3 },
      ]
    },
    {
      title: 'Administración',
      items: [
        { name: 'Configuración', path: '/settings', icon: SettingsIcon },
        { name: 'Auditoría', path: '/audit', icon: Shield },
      ]
    }
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card lg:bg-card/80 lg:backdrop-blur-xl border-r border-border">
      {/* Logo */}
      <div className="p-6 md:p-8">
        <Link to="/" className="flex flex-col items-center justify-center gap-2 group w-full">
          <img src="/logo.png" alt="Fimagadi Logo" className="w-12 h-12 md:w-16 md:h-16 object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-md" />
          {!isCollapsed && (
            <span className="text-lg md:text-xl font-black tracking-widest text-foreground transition-opacity duration-200 uppercase">
              FIMAGADI
            </span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-4">
        <nav className="space-y-4 py-2">
          {menuGroups.map((group) => {
            const visibleItems = group.items.filter(item => canAccess(item.path));

            if (visibleItems.length === 0) return null;
            
            const isGroupOpen = openGroups[group.title] !== false;
            const isNavGroup = !['Principal', 'Analítica', 'Administración'].includes(group.title);

            return (
              <div key={group.title} className="space-y-1">
                {!isCollapsed && isNavGroup ? (
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg mb-1"
                  >
                    <span>{group.title}</span>
                    <ChevronDown className={cn(
                      "w-3.5 h-3.5 transition-transform duration-300",
                      !isGroupOpen && "-rotate-90"
                    )} />
                  </button>
                ) : !isCollapsed && (
                  <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                     {group.title}
                  </div>
                )}

                {(isGroupOpen || isCollapsed || !isNavGroup) && (
                  <div className={cn("space-y-0.5", !isCollapsed && isNavGroup ? "pl-0" : "")}>
                    {visibleItems.map(item => {
                      const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                      return (
                        <Link
                          key={item.name}
                          to={item.path}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                            isActive 
                              ? "bg-primary/[0.08] text-primary font-bold nav-glow" 
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                          onClick={() => setIsMobileOpen(false)}
                          onMouseEnter={() => {
                            if (item.path === '/people') prefetchSocioStatus(queryClient);
                            if (item.path === '/partner-documents') prefetchSocioDocuments(queryClient);
                          }}
                          onFocus={() => {
                            if (item.path === '/people') prefetchSocioStatus(queryClient);
                            if (item.path === '/partner-documents') prefetchSocioDocuments(queryClient);
                          }}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-primary to-corp-teal rounded-r-full" />
                          )}
                          <item.icon className={cn(
                            "w-[20px] h-[20px] shrink-0 transition-colors duration-200",
                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          )} strokeWidth={isActive ? 2.5 : 1.8} />
                          {!isCollapsed && <span className="tracking-tight shrink-0 text-[13px]">{item.name}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Logout */}
      <div className="p-4 pb-24 lg:pb-4 mt-auto border-t border-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-red-400 hover:bg-red-50 dark:bg-red-500/10 dark:text-red-4000/10 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all duration-200 font-medium"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate('/auth');
          }}
        >
          <LogOut className="w-[20px] h-[20px]" strokeWidth={1.8} />
          {!isCollapsed && <span className="text-[13px]">Cerrar Sesión</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:block relative z-40",
        "transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isCollapsed ? "w-20" : "w-[260px]"
      )}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-[64px] glass-effect border-b border-border px-6 md:px-8 flex items-center justify-between z-30 sticky top-0">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden hover:bg-muted rounded-xl" 
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hidden lg:flex text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all duration-200"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 h-8 px-3 text-xs text-muted-foreground/70 bg-muted/80 hover:bg-slate-200/80 border border-border/60 rounded-lg transition-all duration-200 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar…</span>
              <kbd className="ml-1 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-card dark:bg-slate-900 px-1.5 font-mono text-[10px] font-medium text-muted-foreground/70">
                Ctrl K
              </kbd>
            </button>
            <SyncStatusIndicator />
            <NotificationBell />
            <ThemeToggle />
            <div className="h-5 w-[1px] bg-border" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-foreground leading-none tracking-tight">{user?.email?.split('@')[0]}</p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{roles?.[0] || 'Usuario'}</p>
              </div>
              <Avatar className="h-9 w-9 border-2 border-background shadow-md transition-all duration-200 hover:scale-110 hover:shadow-lg cursor-pointer ring-2 ring-border">
                <AvatarImage src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.email?.split('@')[0] || 'User'}&background=1e293b&color=ffffff`} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-corp-teal text-white font-bold text-xs">
                  {(user?.email?.[0] || 'U').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Breadcrumbs />
          <Outlet />
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-background/40 dark:bg-black/60 animate-fade-in" 
            onClick={() => setIsMobileOpen(false)} 
          />
          <div className="absolute inset-y-0 left-0 w-[280px] shadow-premium-lg animate-slide-in-right">
            <SidebarContent />
          </div>
        </div>
      )}

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <BottomNav />
    </div>
  );
}

export default DashboardLayout;
