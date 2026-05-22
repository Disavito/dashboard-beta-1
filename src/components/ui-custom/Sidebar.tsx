import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Settings as SettingsIcon, 
  Wallet, 
  FolderOpen, 
  ReceiptText,
  Calendar,
  PieChart,
  ShieldAlert,
  FileCheck2
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useAppStore } from '@/store/useAppStore';

const allNavLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, isFinancial: false }, 
  { name: 'Socios Titulares', path: '/people', icon: Users, isFinancial: false },
  { name: 'Documentos', path: '/partner-documents', icon: FolderOpen, isFinancial: false },
  { name: 'Jornada', path: '/jornada', icon: Calendar, isFinancial: false },
  // Secciones Financieras (Solo Admin/Finanzas)
  { name: 'Facturación', path: '/invoicing', icon: ReceiptText, isFinancial: true },
  { name: 'Ingresos', path: '/income', icon: ArrowUpCircle, isFinancial: true },
  { name: 'Gastos', path: '/expenses', icon: ArrowDownCircle, isFinancial: true },
  { name: 'Cuentas', path: '/accounts', icon: Wallet, isFinancial: true },
  { name: 'Reportes', path: '/reportes', icon: PieChart, isFinancial: true },
  { name: 'Inventario', path: '/inventory', icon: FolderOpen, isFinancial: false },
  { name: 'Configuración', path: '/settings', icon: SettingsIcon, isFinancial: true },
  { name: 'Aprobaciones', path: '/aprobaciones', icon: FileCheck2, isFinancial: true },
  { name: 'Auditoría', path: '/audit', icon: ShieldAlert, isFinancial: true },
];

// Helper para prefetch de chunks de código
// Cuando el mouse pasa sobre el enlace, Vite comenzará a descargar el archivo JS
// de la ruta correspondiente, haciendo que al hacer click abra instantáneamente.
const prefetchRoute = (path: string) => {
  switch (path) {
    case '/dashboard': import('@/pages/Dashboard'); break;
    case '/people': import('@/pages/People'); break;
    case '/partner-documents': import('@/pages/PartnerDocuments'); break;
    case '/jornada': import('@/pages/JornadaPage'); break;
    case '/inventory': import('@/pages/Inventory'); break;
    case '/invoicing': import('@/pages/invoicing/InvoicingLayout'); break;
    case '/income': import('@/pages/Income'); break;
    case '/expenses': import('@/pages/Expenses'); break;
    case '/accounts': import('@/pages/Accounts'); break;
    case '/reportes': import('@/pages/Reportes'); break;
    case '/settings': import('@/pages/Settings'); break;
    case '/aprobaciones': import('@/pages/AprobacionesPage'); break;
    case '/audit': import('@/pages/AuditPage'); break;
    default: break;
  }
};

const Sidebar: React.FC = () => {
  const { roles, loading } = useUser();
  // Ejemplo de consumo del Store Global de Zustand
  const { isSidebarCollapsed } = useAppStore();

  const isAdminOrFinanzas = useMemo(() => {
    if (!roles) return false;
    return roles.some(role => ['admin', 'finanzas'].includes(role.toLowerCase()));
  }, [roles]);

  const visibleNavLinks = useMemo(() => {
    if (loading || !roles) return [];

    return allNavLinks.filter(link => {
      // Si es una ruta financiera, solo mostrar si es Admin o Finanzas
      if (link.isFinancial) {
        if (link.path === '/expenses' && roles.some(r => {
          const lower = r.toLowerCase();
          return lower.includes('ingenier') || lower.includes('engin') || lower.includes('engen');
        })) {
          return true;
        }
        return isAdminOrFinanzas;
      }
      return true;
    });
  }, [roles, loading, isAdminOrFinanzas]);

  return (
    <aside className={`bg-surface border-r border-border p-6 flex flex-col shadow-lg transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="mb-8 text-center">
        <h2 className={`font-extrabold text-primary tracking-tight transition-all duration-300 ${isSidebarCollapsed ? 'text-xl' : 'text-3xl'}`}>
          {!isSidebarCollapsed ? <><span className="text-primary">FIMA</span>GADI</> : 'F'}
        </h2>
        {!isSidebarCollapsed && <p className="text-textSecondary text-sm mt-1">Gestión Integral</p>}
      </div>
      <nav className="flex-1">
        <ul className="space-y-3">
          {visibleNavLinks.map((link) => (
            <li key={link.name}>
              <NavLink
                to={link.path}
                onMouseEnter={() => prefetchRoute(link.path)}
                className={({ isActive }) =>
                  `flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ease-in-out
                  ${isActive
                    ? 'bg-primary/20 text-primary font-semibold shadow-md transform scale-105'
                    : 'text-textSecondary hover:bg-muted/30 hover:text-foreground'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`
                }
                title={isSidebarCollapsed ? link.name : undefined}
              >
                <link.icon className={`h-5 w-5 ${isSidebarCollapsed ? 'shrink-0' : ''}`} />
                {!isSidebarCollapsed && <span className="text-lg">{link.name}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto pt-6 border-t border-border/50 text-center text-textSecondary text-sm">
        {!isSidebarCollapsed ? <p>&copy; 2025 FIMAGADI.</p> : <p>&copy;</p>}
      </div>
    </aside>
  );
};

export default Sidebar;
