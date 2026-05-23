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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabaseClient';
import NotificationBell from '@/components/ui/NotificationBell';
import SyncStatusIndicator from '@/components/ui-custom/SyncStatusIndicator';
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime';

function DashboardLayout() {
  useGlobalRealtime();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Finanzas': true,
    'Gestión Corporativa': true,
    'Operaciones': true,
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, roles, permissions, loading } = useUser();

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-white">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );

  const menuGroups = [
    {
      title: 'Principal',
      items: [
        { name: 'Resumen', path: '/dashboard', icon: LayoutDashboard },
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
      ]
    },
    {
      title: 'Operaciones',
      items: [
        { name: 'Jornada', path: '/jornada', icon: Clock },
        { name: 'Inventario', path: '/inventory', icon: Package },
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
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl border-r border-slate-100/80">
      {/* Logo */}
      <div className="p-6 md:p-8">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-corp-teal rounded-xl flex items-center justify-center shadow-md shadow-primary/20 transition-transform duration-300 group-hover:scale-105">
            <Wallet className="text-white w-5 h-5" />
          </div>
          {!isCollapsed && (
            <span className="text-lg md:text-xl font-black tracking-tighter text-[#373435] transition-opacity duration-200">
              <span className="text-primary">FIMA</span>GADI
            </span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-4">
        <nav className="space-y-4 py-2">
          {menuGroups.map((group) => {
            const visibleItems = group.items.filter(item => {
              if (item.path === '/dashboard' || item.path === '/reportes') return true;
              
              if (item.path === '/aprobaciones') {
                return roles?.includes('admin') || roles?.includes('finanzas_senior') || (permissions && permissions.has('/settings'));
              }

              let requiredPath = item.path;
              if (item.path === '/audit') {
                requiredPath = '/settings';
              }

              if (permissions && !permissions.has(requiredPath)) {
                return false;
              }
              return true;
            });

            if (visibleItems.length === 0) return null;
            
            const isGroupOpen = openGroups[group.title] !== false;
            const isNavGroup = !['Principal', 'Analítica', 'Administración'].includes(group.title);

            return (
              <div key={group.title} className="space-y-1">
                {!isCollapsed && isNavGroup ? (
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors duration-200 rounded-lg mb-1"
                  >
                    <span>{group.title}</span>
                    <ChevronDown className={cn(
                      "w-3.5 h-3.5 transition-transform duration-300",
                      !isGroupOpen && "-rotate-90"
                    )} />
                  </button>
                ) : !isCollapsed && (
                  <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
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
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                          )}
                          onClick={() => setIsMobileOpen(false)}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-primary to-corp-teal rounded-r-full" />
                          )}
                          <item.icon className={cn(
                            "w-[20px] h-[20px] shrink-0 transition-colors duration-200",
                            isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-500"
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
      <div className="p-4 mt-auto border-t border-slate-100/60">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 font-medium"
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
    <div className="flex h-screen bg-[#FAFBFC] overflow-hidden font-sans">
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
        <header className="h-[64px] glass-effect border-b border-slate-200/40 px-6 md:px-8 flex items-center justify-between z-30 sticky top-0">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden hover:bg-slate-100 rounded-xl" 
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hidden lg:flex text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <SyncStatusIndicator />
            <NotificationBell />
            <div className="h-5 w-[1px] bg-slate-200/60" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-none tracking-tight">{user?.email?.split('@')[0]}</p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{roles?.[0] || 'Usuario'}</p>
              </div>
              <Avatar className="h-9 w-9 border-2 border-white shadow-md transition-all duration-200 hover:scale-110 hover:shadow-lg cursor-pointer ring-2 ring-slate-100">
                <AvatarImage src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.email?.split('@')[0] || 'User'}&background=1e293b&color=ffffff`} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-corp-teal text-white font-bold text-xs">
                  {(user?.email?.[0] || 'U').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-fade-in" 
            onClick={() => setIsMobileOpen(false)} 
          />
          <div className="absolute inset-y-0 left-0 w-[280px] shadow-premium-lg animate-slide-in-right">
            <SidebarContent />
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardLayout;
