import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';

export interface WidgetLayoutItem {
  id: string;
  visible: boolean;
  name: string;
  description: string;
}

const DEFAULT_TITULARES_LAYOUT: WidgetLayoutItem[] = [
  { id: 'kpis_titulares', visible: true, name: 'KPIs de Socios', description: 'Muestra el total de socios titulares, pagos del mes y socios pendientes.' },
  { id: 'equipo_trabajo', visible: true, name: 'Equipo de Trabajo', description: 'Lista de los colaboradores y personal registrado.' },
  { id: 'distribucion_socios', visible: true, name: 'Distribución Geográfica', description: 'Porcentaje de socios activos y gráfico de distribución.' }
];

const DEFAULT_FINANZAS_LAYOUT: WidgetLayoutItem[] = [
  { id: 'kpis_financieros', visible: true, name: 'KPIs Financieros', description: 'Monto de ingresos, egresos y balance con minigráficos (sparklines).' },
  { id: 'grafico_flujo', visible: true, name: 'Gráfico de Flujo', description: 'Gráfico interactivo detallado de ingresos vs gastos (Área).' },
  { id: 'ingresos_localidad', visible: true, name: 'Recaudación por Localidad', description: 'Gráfico de barras de ingresos segmentados por comunidad.' },
  { id: 'auditoria_caja', visible: true, name: 'Auditoría y Caja Especial', description: 'Resumen de devoluciones y anulaciones de boletas.' }
];

const DEFAULT_ENGINEER_LAYOUT: WidgetLayoutItem[] = [
  { id: 'kpis_ingeniero', visible: true, name: 'Estado de Predios', description: 'KPIs de lotes medidos, predios sin manzana y predios sin lote.' },
  { id: 'gabinete_documentos', visible: true, name: 'Gabinete de Documentos', description: 'Tareas pendientes de planos, memorias descriptivas y prioridades.' },
  { id: 'acceso_rapido', visible: true, name: 'Acceso Rápido', description: 'Enlaces directos a expedientes técnicos, inventario y control de jornada.' }
];

export function useDashboardLayout() {
  const { user } = useUser();
  const userId = user?.id || 'guest';

  const [titularesLayout, setTitularesLayout] = useState<WidgetLayoutItem[]>(DEFAULT_TITULARES_LAYOUT);
  const [finanzasLayout, setFinanzasLayout] = useState<WidgetLayoutItem[]>(DEFAULT_FINANZAS_LAYOUT);
  const [engineerLayout, setEngineerLayout] = useState<WidgetLayoutItem[]>(DEFAULT_ENGINEER_LAYOUT);

  // Load layouts from localStorage on mount or when user changes
  useEffect(() => {
    if (!userId) return;

    const savedTitulares = localStorage.getItem(`db_layout_titulares_${userId}`);
    const savedFinanzas = localStorage.getItem(`db_layout_finanzas_${userId}`);
    const savedEngineer = localStorage.getItem(`db_layout_engineer_${userId}`);

    if (savedTitulares) {
      try {
        const parsed = JSON.parse(savedTitulares);
        // Merge with defaults to handle new widgets if any are added in the future
        const merged = DEFAULT_TITULARES_LAYOUT.map(defItem => {
          const savedItem = parsed.find((p: any) => p.id === defItem.id);
          return savedItem ? { ...defItem, visible: savedItem.visible } : defItem;
        });
        // Respect saved order
        const ordered = parsed
          .map((p: any) => merged.find(m => m.id === p.id))
          .filter(Boolean) as WidgetLayoutItem[];
        // Add any default items not in saved
        const missing = merged.filter(m => !ordered.some(o => o.id === m.id));
        setTitularesLayout([...ordered, ...missing]);
      } catch (e) {
        setTitularesLayout(DEFAULT_TITULARES_LAYOUT);
      }
    } else {
      setTitularesLayout(DEFAULT_TITULARES_LAYOUT);
    }

    if (savedFinanzas) {
      try {
        const parsed = JSON.parse(savedFinanzas);
        const merged = DEFAULT_FINANZAS_LAYOUT.map(defItem => {
          const savedItem = parsed.find((p: any) => p.id === defItem.id);
          return savedItem ? { ...defItem, visible: savedItem.visible } : defItem;
        });
        const ordered = parsed
          .map((p: any) => merged.find(m => m.id === p.id))
          .filter(Boolean) as WidgetLayoutItem[];
        const missing = merged.filter(m => !ordered.some(o => o.id === m.id));
        setFinanzasLayout([...ordered, ...missing]);
      } catch (e) {
        setFinanzasLayout(DEFAULT_FINANZAS_LAYOUT);
      }
    } else {
      setFinanzasLayout(DEFAULT_FINANZAS_LAYOUT);
    }

    if (savedEngineer) {
      try {
        const parsed = JSON.parse(savedEngineer);
        const merged = DEFAULT_ENGINEER_LAYOUT.map(defItem => {
          const savedItem = parsed.find((p: any) => p.id === defItem.id);
          return savedItem ? { ...defItem, visible: savedItem.visible } : defItem;
        });
        const ordered = parsed
          .map((p: any) => merged.find(m => m.id === p.id))
          .filter(Boolean) as WidgetLayoutItem[];
        const missing = merged.filter(m => !ordered.some(o => o.id === m.id));
        setEngineerLayout([...ordered, ...missing]);
      } catch (e) {
        setEngineerLayout(DEFAULT_ENGINEER_LAYOUT);
      }
    } else {
      setEngineerLayout(DEFAULT_ENGINEER_LAYOUT);
    }
  }, [userId]);

  const saveLayout = (type: 'titulares' | 'finanzas' | 'engineer', items: WidgetLayoutItem[]) => {
    localStorage.setItem(`db_layout_${type}_${userId}`, JSON.stringify(items));
    if (type === 'titulares') setTitularesLayout(items);
    if (type === 'finanzas') setFinanzasLayout(items);
    if (type === 'engineer') setEngineerLayout(items);
  };

  const toggleWidgetVisibility = (type: 'titulares' | 'finanzas' | 'engineer', widgetId: string) => {
    let currentLayout: WidgetLayoutItem[] = [];
    if (type === 'titulares') currentLayout = [...titularesLayout];
    if (type === 'finanzas') currentLayout = [...finanzasLayout];
    if (type === 'engineer') currentLayout = [...engineerLayout];

    const updated = currentLayout.map(item => 
      item.id === widgetId ? { ...item, visible: !item.visible } : item
    );

    saveLayout(type, updated);
  };

  const reorderWidgets = (type: 'titulares' | 'finanzas' | 'engineer', reorderedItems: WidgetLayoutItem[]) => {
    saveLayout(type, reorderedItems);
  };

  const resetToDefault = (type: 'titulares' | 'finanzas' | 'engineer') => {
    localStorage.removeItem(`db_layout_${type}_${userId}`);
    if (type === 'titulares') setTitularesLayout(DEFAULT_TITULARES_LAYOUT);
    if (type === 'finanzas') setFinanzasLayout(DEFAULT_FINANZAS_LAYOUT);
    if (type === 'engineer') setEngineerLayout(DEFAULT_ENGINEER_LAYOUT);
  };

  return {
    titularesLayout,
    finanzasLayout,
    engineerLayout,
    toggleWidgetVisibility,
    reorderWidgets,
    resetToDefault
  };
}
