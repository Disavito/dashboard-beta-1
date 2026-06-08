import { format } from 'date-fns';

/**
 * Shared export utilities for Excel (.xlsx) and CSV exports.
 * Uses dynamic import of 'xlsx' to avoid bundle bloat.
 */

interface ExportOptions {
  /** Filename prefix, e.g. 'ingresos' */
  filePrefix: string;
  /** Column headers for the export */
  headers: string[];
  /** Data rows — each row is an array of values in the same order as headers */
  rows: (string | number | null | undefined)[][];
}

function sanitize(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val);
}

function getDateSuffix(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export async function exportToExcel({ filePrefix, headers, rows }: ExportOptions) {
  const XLSX = await import('xlsx');
  const wsData = [headers, ...rows.map(row => row.map(sanitize))];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-size columns
  ws['!cols'] = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => sanitize(r[i]).length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, filePrefix);
  XLSX.writeFile(wb, `${filePrefix}_${getDateSuffix()}.xlsx`);
}

export async function exportToCSV({ filePrefix, headers, rows }: ExportOptions) {
  const escapeCsv = (val: any): string => {
    const str = sanitize(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(','))
  ];
  const csvContent = csvLines.join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filePrefix}_${getDateSuffix()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
