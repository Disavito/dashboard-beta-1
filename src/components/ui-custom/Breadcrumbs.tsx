import { useLocation, Link } from 'react-router-dom';
import { Home, ChevronLeft } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

/**
 * Map of path segments to human-readable Spanish labels.
 * Supports both top-level routes and nested sub-routes.
 */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  income: 'Ingresos',
  expenses: 'Gastos',
  accounts: 'Cuentas',
  people: 'Socios',
  'partner-documents': 'Documentos',
  invoicing: 'Facturación',
  boletas: 'Boletas',
  recibos: 'Recibos',
  'resumen-diario': 'Resumen Diario',
  'notas-credito': 'Notas de Crédito',
  inventory: 'Inventario',
  jornada: 'Jornada',
  presupuestos: 'Presupuestos',
  reportes: 'Reportes',
  settings: 'Configuración',
  audit: 'Auditoría',
  aprobaciones: 'Aprobaciones',
  ayuda: 'Ayuda',
};

/**
 * Context-aware labels for dynamic segments (e.g. `:id`).
 * When a segment is a dynamic value (not in SEGMENT_LABELS),
 * we use the parent segment to determine a fallback label.
 */
const DYNAMIC_LABELS: Record<string, string> = {
  accounts: 'Detalle',
  people: 'Editar',
};

interface BreadcrumbEntry {
  label: string;
  path: string;
}

function buildBreadcrumbs(pathname: string): BreadcrumbEntry[] {
  const segments = pathname.split('/').filter(Boolean);

  // Filter out "dashboard" if it's the first segment — we use Home icon instead
  const filtered = segments[0] === 'dashboard' ? segments.slice(1) : segments;

  const crumbs: BreadcrumbEntry[] = [];

  filtered.forEach((segment, index) => {
    const fullPath = '/' + filtered.slice(0, index + 1).join('/');
    const label = SEGMENT_LABELS[segment];

    if (label) {
      crumbs.push({ label, path: fullPath });
    } else {
      // Dynamic segment — use parent context for label
      const parentSegment = filtered[index - 1];
      const dynamicLabel = parentSegment
        ? DYNAMIC_LABELS[parentSegment] ?? segment
        : segment;
      crumbs.push({ label: dynamicLabel, path: fullPath });
    }
  });

  return crumbs;
}

export default function Breadcrumbs() {
  const { pathname } = useLocation();

  // Don't render on the dashboard root
  if (pathname === '/dashboard' || pathname === '/') {
    return null;
  }

  const crumbs = buildBreadcrumbs(pathname);

  if (crumbs.length === 0) return null;

  // ─── Mobile: show "← Parent" style ───
  const parentCrumb = crumbs.length > 1 ? crumbs[crumbs.length - 2] : null;
  const mobileBackPath = parentCrumb?.path ?? '/dashboard';
  const mobileBackLabel = parentCrumb?.label ?? 'Dashboard';

  return (
    <>
      {/* Mobile breadcrumb (< 640px) */}
      <nav aria-label="breadcrumb" className="sm:hidden px-4 pt-3 pb-1">
        <Link
          to={mobileBackPath}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{mobileBackLabel}</span>
        </Link>
      </nav>

      {/* Desktop breadcrumb (≥ 640px) */}
      <div className="hidden sm:block px-6 md:px-8 pt-4 pb-1">
        <Breadcrumb>
          <BreadcrumbList>
            {/* Home */}
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Home className="w-3.5 h-3.5" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1;

              return (
                <span key={crumb.path} className="contents">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.path}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </>
  );
}
