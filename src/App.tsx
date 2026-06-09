import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PageSkeleton from './components/ui-custom/PageSkeleton';
import { offlineSync } from './lib/offlineSync';
import { PWAPrompt } from './components/custom/PWAPrompt';

// Page Imports
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const AuthPage = lazy(() => import('./pages/Auth'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const SociosPage = lazy(() => import('./pages/People'));
const EditSocioPage = lazy(() => import('./pages/EditSocioPage'));
const InvoicingLayout = lazy(() => import('./pages/invoicing/InvoicingLayout'));
const BoletasPage = lazy(() => import('./pages/invoicing/BoletasPage'));
const ResumenDiarioPage = lazy(() => import('./pages/invoicing/ResumenDiarioPage'));
const NotasCreditoPage = lazy(() => import('./pages/invoicing/NotasCreditoPage'));
const RecibosPage = lazy(() => import('@/pages/invoicing/RecibosPage'));
const IngresosPage = lazy(() => import('./pages/Income'));
const EgresosPage = lazy(() => import('./pages/Expenses'));
const CuentasPage = lazy(() => import('./pages/Accounts'));
const AccountDetails = lazy(() => import('./pages/AccountDetails'));
const PartnerDocuments = lazy(() => import('./pages/PartnerDocuments'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const JornadaPage = lazy(() => import('./pages/JornadaPage'));
const InventoryPage = lazy(() => import('./pages/Inventory'));
const ReportesPage = lazy(() => import('./pages/Reportes'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const AprobacionesPage = lazy(() => import('./pages/AprobacionesPage'));
const PresupuestosPage = lazy(() => import('./pages/PresupuestosPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));

function App() {
  useEffect(() => {
    const handleOnline = () => {
      offlineSync.processQueue();
    };
    window.addEventListener('online', handleOnline);
    // Process on initial load in case there are pending jobs
    offlineSync.processQueue();
    
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <PWAPrompt />
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />

          <Route element={<ProtectedRoute resourcePath="/" />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              <Route element={<ProtectedRoute resourcePath="/people" />}>
                <Route path="people" element={<SociosPage />} />
                <Route path="people/:id" element={<EditSocioPage />} />
              </Route>
              
              <Route element={<ProtectedRoute resourcePath="/partner-documents" />}>
                <Route path="partner-documents" element={<PartnerDocuments />} />
              </Route>

              <Route element={<ProtectedRoute resourcePath="/invoicing" />}>
                <Route path="invoicing" element={<InvoicingLayout />}>
                  <Route index element={<Navigate to="boletas" replace />} />
                  <Route path="boletas" element={<BoletasPage />} />
                  <Route path="resumen-diario" element={<ResumenDiarioPage />} />
                  <Route path="notas-credito" element={<NotasCreditoPage />} />
                  <Route path="recibos" element={<RecibosPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute resourcePath="/jornada" />}>
                <Route path="jornada" element={<JornadaPage />} />
              </Route>

              <Route element={<ProtectedRoute resourcePath="/inventory" />}>
                <Route path="inventory" element={<InventoryPage />} />
              </Route>

              <Route element={<ProtectedRoute resourcePath="/income" />}>
                <Route path="income" element={<IngresosPage />} />
              </Route>

              <Route element={<ProtectedRoute resourcePath="/expenses" />}>
                <Route path="expenses" element={<EgresosPage />} />
              </Route>

              <Route element={<ProtectedRoute resourcePath="/presupuestos" />}>
                <Route path="presupuestos" element={<PresupuestosPage />} />
              </Route>

              <Route element={<ProtectedRoute resourcePath="/accounts" />}>
                <Route path="accounts" element={<CuentasPage />} />
                <Route path="accounts/:id" element={<AccountDetails />} />
              </Route>
              
              <Route element={<ProtectedRoute resourcePath="/settings" />}>
                <Route path="settings" element={<SettingsPage />} />
                <Route path="audit" element={<AuditPage />} />
              </Route>

              <Route element={<ProtectedRoute resourcePath="/aprobaciones" />}>
                <Route path="aprobaciones" element={<AprobacionesPage />} />
              </Route>

              <Route path="reportes" element={<ReportesPage />} />
              <Route path="ayuda" element={<HelpPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
