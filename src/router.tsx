import { createBrowserRouter, Navigate } from 'react-router-dom';
import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ProtectedRoute from './components/auth/ProtectedRoute'; 
import ModuleErrorBoundary from './components/ui-custom/ModuleErrorBoundary';

// Componente de carga ultra ligero
const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#FFFFFF]">
    <Loader2 className="h-10 w-10 animate-spin text-[#4892CC]" />
  </div>
);

// Helper para carga diferida con ErrorBoundary
const Load = (Component: React.LazyExoticComponent<any>, moduleName?: string) => (
  <ModuleErrorBoundary moduleName={moduleName}>
    <Suspense fallback={<LoadingFallback />}>
      <Component />
    </Suspense>
  </ModuleErrorBoundary>
);

// Importaciones Dinámicas (Solo se cargan cuando se necesitan)
const AuthPage = React.lazy(() => import('./pages/Auth'));
const DashboardLayout = React.lazy(() => import('./layouts/DashboardLayout'));
const DashboardPage = React.lazy(() => import('./pages/Dashboard'));
const SociosPage = React.lazy(() => import('./pages/People'));
const EditSocioPage = React.lazy(() => import('./pages/EditSocioPage'));
const InvoicingLayout = React.lazy(() => import('./pages/invoicing/InvoicingLayout'));
const BoletasPage = React.lazy(() => import('./pages/invoicing/BoletasPage'));
const ResumenDiarioPage = React.lazy(() => import('./pages/invoicing/ResumenDiarioPage'));
const NotasCreditoPage = React.lazy(() => import('./pages/invoicing/NotasCreditoPage'));
const RecibosPage = React.lazy(() => import('@/pages/invoicing/RecibosPage'));
const IngresosPage = React.lazy(() => import('./pages/Income'));
const EgresosPage = React.lazy(() => import('./pages/Expenses'));
const CuentasPage = React.lazy(() => import('./pages/Accounts'));
const AccountDetails = React.lazy(() => import('./pages/AccountDetails'));
const PartnerDocumentsPage = React.lazy(() => import('@/pages/PartnerDocuments'));
const SettingsPage = React.lazy(() => import('./pages/Settings'));
const JornadaPage = React.lazy(() => import('./pages/JornadaPage'));
const InventoryPage = React.lazy(() => import('./pages/Inventory'));
const ReportesPage = React.lazy(() => import('./pages/Reportes'));

const router = createBrowserRouter([
  {
    path: '/auth',
    element: Load(AuthPage, 'Autenticación'),
  },
  {
    path: '/',
    element: <ProtectedRoute resourcePath="/">{Load(DashboardLayout, 'Layout')}</ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: Load(DashboardPage, 'Panel Principal') },
      { path: 'people', element: Load(SociosPage, 'Socios') },
      { path: 'people/:id', element: Load(EditSocioPage, 'Editar Socio') },
      { path: 'partner-documents', element: Load(PartnerDocumentsPage, 'Expedientes') },
      {
        path: 'invoicing',
        element: Load(InvoicingLayout, 'Facturación'),
        children: [
          { index: true, element: <Navigate to="boletas" replace /> },
          { path: 'boletas', element: Load(BoletasPage, 'Boletas') },
          { path: 'resumen-diario', element: Load(ResumenDiarioPage, 'Resumen Diario') },
          { path: 'notas-credito', element: Load(NotasCreditoPage, 'Notas de Crédito') },
          { path: 'recibos', element: Load(RecibosPage, 'Recibos') },
        ],
      },
      { path: 'income', element: Load(IngresosPage, 'Ingresos') },
      { path: 'expenses', element: Load(EgresosPage, 'Gastos') },
      { path: 'accounts', element: Load(CuentasPage, 'Cuentas') },
      { path: 'accounts/:id', element: Load(AccountDetails, 'Detalle de Cuenta') },
      { path: 'jornada', element: Load(JornadaPage, 'Jornada Laboral') },
      { path: 'inventory', element: Load(InventoryPage, 'Inventario') },
      { path: 'reportes', element: Load(ReportesPage, 'Reportes') },
      { path: 'settings', element: Load(SettingsPage, 'Configuración') },
    ],
  },
]);

export default router;

