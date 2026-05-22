import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea una fecha ISO string de manera segura.
 * Si la fecha es inválida o nula, retorna un placeholder.
 */
export const safeFormatDate = (
  dateStr: string | null | undefined,
  fmt: string = 'dd/MM/yyyy',
  placeholder: string = '—'
): string => {
  if (!dateStr) return placeholder;
  try {
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? format(parsed, fmt, { locale: es }) : placeholder;
  } catch {
    return placeholder;
  }
};

/**
 * Formatea una fecha ISO string a formato legible largo.
 * Ej: "12 de abril de 2026"
 */
export const safeFormatDateLong = (
  dateStr: string | null | undefined,
  placeholder: string = '—'
): string => {
  return safeFormatDate(dateStr, "d 'de' MMMM 'de' yyyy", placeholder);
};

/**
 * Formatea una fecha ISO string a hora.
 * Ej: "09:30" o "14:25:30"
 */
export const safeFormatTime = (
  isoString: string | null | undefined,
  includeSeconds: boolean = false,
  placeholder: string = '--:--'
): string => {
  if (!isoString) return placeholder;
  try {
    const parsed = parseISO(isoString);
    if (!isValid(parsed)) return placeholder;
    return format(parsed, includeSeconds ? 'HH:mm:ss' : 'HH:mm');
  } catch {
    return placeholder;
  }
};

/**
 * Formatea minutos en formato "Xh XXm"
 */
export const formatMinutesToHours = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
};

/**
 * Parsea una fecha ISO de manera segura, retornando null si es inválida.
 */
export const safeParse = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
