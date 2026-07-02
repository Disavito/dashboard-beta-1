import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount)
}

/**
 * Calcula el estado del socio basado en su última transacción
 */
export function getSocioStatus(lastTransactionType: string | null, amount: number) {
  if (!lastTransactionType) return { label: 'Activo', color: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' };
  
  const type = lastTransactionType.toLowerCase();
  
  if (type.includes('devolución') || type.includes('retirado')) {
    return { label: 'Retirado', color: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' };
  }
  
  if (type.includes('anulación') || type.includes('anulado')) {
    return { label: 'Inactivo', color: 'bg-muted text-muted-foreground border-border' };
  }

  if (amount > 0) {
    return { label: 'Activo', color: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' };
  }

  return { label: 'Activo', color: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' };
}

/**
 * Ordenamiento alfanumérico para números de recibo (ej: B001-0001)
 */
export const sortReceipts = (rowA: any, rowB: any, columnId: string) => {
  const a = String(rowA.getValue(columnId) || "");
  const b = String(rowB.getValue(columnId) || "");
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
};

/**
 * Ordenamiento por nombre completo
 * Se usa _columnId para evitar el error TS6133 ya que la lógica es personalizada
 */
export const sortNames = (rowA: any, rowB: any, _columnId: string) => {
  const a = `${rowA.original.nombres} ${rowA.original.apellidoPaterno}`.toLowerCase();
  const b = `${rowB.original.nombres} ${rowB.original.apellidoPaterno}`.toLowerCase();
  return a.localeCompare(b);
};

let lastSearchQuery = '';
let cachedSearchTokens: string[] = [];

/**
 * Búsqueda inteligente (Token-Based Search)
 * Separa el término de búsqueda en palabras y requiere que todas estén presentes.
 * Normaliza los textos para ignorar acentos y mayúsculas.
 */
export function smartSearch(query: string, fields: (string | undefined | null | number)[]): boolean {
  if (!query || !query.trim()) return true;
  
  const normalize = (text: string) => 
    String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // Optimización: Solo normalizamos y separamos el query si cambió
  if (query !== lastSearchQuery) {
    lastSearchQuery = query;
    cachedSearchTokens = normalize(query).trim().split(/\s+/).filter(Boolean);
  }
  
  // Concatenamos todos los campos en un solo string para buscar
  const textToSearch = normalize(fields
    .filter(val => val !== undefined && val !== null)
    .join(' '));

  // Cada token debe encontrarse en algún lugar del texto concatenado
  return cachedSearchTokens.every(token => textToSearch.includes(token));
}
