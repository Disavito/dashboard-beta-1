import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { FileText, History, FileX, Receipt } from 'lucide-react';

const tabs = [
  { name: 'Boletas', path: '/invoicing/boletas', icon: FileText },
  { name: 'Resumen Diario', path: '/invoicing/resumen-diario', icon: History },
  { name: 'Notas de Crédito', path: '/invoicing/notas-credito', icon: FileX },
  { name: 'Recibos', path: '/invoicing/recibos', icon: Receipt },
];

export default function InvoicingLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#FAFBFC] page-enter">
      {/* Header de Facturación Optimizado para Móvil */}
      <div className="bg-card dark:bg-slate-900 border-b border-border/50 sticky top-0 z-20">
        <div className="container mx-auto px-4 md:px-8 py-6">
          <h1 className="text-2xl md:text-3xl font-black text-foreground mb-6">Módulo de <span className="text-[#4892CC]">Facturación</span></h1>
          
          {/* Tabs con Scroll Horizontal en Móvil */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap",
                    isActive 
                      ? "bg-[#4892CC] text-white shadow-lg shadow-[#4892CC]/30" 
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-8">
        <Outlet />
      </div>
    </div>
  );
}
