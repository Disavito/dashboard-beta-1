import { describe, it, expect } from 'vitest';
import {
  safeFormatDate,
  safeFormatDateLong,
  safeFormatTime,
  formatMinutesToHours,
  safeParse,
} from '@/lib/dateUtils';

describe('dateUtils', () => {
  describe('safeFormatDate', () => {
    it('formatea una fecha ISO válida', () => {
      expect(safeFormatDate('2026-04-12')).toBe('12/04/2026');
    });

    it('retorna placeholder para null', () => {
      expect(safeFormatDate(null)).toBe('—');
    });

    it('retorna placeholder para undefined', () => {
      expect(safeFormatDate(undefined)).toBe('—');
    });

    it('retorna placeholder para string vacío', () => {
      expect(safeFormatDate('')).toBe('—');
    });

    it('retorna placeholder personalizado', () => {
      expect(safeFormatDate(null, 'dd/MM/yyyy', 'N/A')).toBe('N/A');
    });

    it('usa formato personalizado', () => {
      const result = safeFormatDate('2026-04-12', 'yyyy-MM-dd');
      expect(result).toBe('2026-04-12');
    });

    it('maneja fecha con timestamp completo', () => {
      const result = safeFormatDate('2026-04-12T14:30:00.000Z');
      expect(result).toBe('12/04/2026');
    });
  });

  describe('safeFormatDateLong', () => {
    it('formatea una fecha en formato largo', () => {
      const result = safeFormatDateLong('2026-04-12');
      expect(result).toContain('12');
      expect(result).toContain('abril');
      expect(result).toContain('2026');
    });

    it('retorna placeholder para null', () => {
      expect(safeFormatDateLong(null)).toBe('—');
    });
  });

  describe('safeFormatTime', () => {
    it('formatea una hora ISO', () => {
      const result = safeFormatTime('2026-04-12T14:30:00.000Z');
      // La hora depende del timezone, pero no debería ser placeholder
      expect(result).not.toBe('--:--');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('retorna placeholder para null', () => {
      expect(safeFormatTime(null)).toBe('--:--');
    });

    it('retorna placeholder para undefined', () => {
      expect(safeFormatTime(undefined)).toBe('--:--');
    });

    it('soporta placeholder personalizado', () => {
      expect(safeFormatTime(null, false, 'N/A')).toBe('N/A');
    });
  });

  describe('formatMinutesToHours', () => {
    it('convierte 0 minutos', () => {
      expect(formatMinutesToHours(0)).toBe('0h 00m');
    });

    it('convierte 60 minutos a 1h', () => {
      expect(formatMinutesToHours(60)).toBe('1h 00m');
    });

    it('convierte 90 minutos a 1h 30m', () => {
      expect(formatMinutesToHours(90)).toBe('1h 30m');
    });

    it('convierte 525 minutos a 8h 45m', () => {
      expect(formatMinutesToHours(525)).toBe('8h 45m');
    });

    it('padea minutos con 0', () => {
      expect(formatMinutesToHours(65)).toBe('1h 05m');
    });
  });

  describe('safeParse', () => {
    it('parsea una fecha ISO válida', () => {
      const result = safeParse('2026-04-12');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2026);
    });

    it('retorna null para null', () => {
      expect(safeParse(null)).toBeNull();
    });

    it('retorna null para undefined', () => {
      expect(safeParse(undefined)).toBeNull();
    });

    it('retorna null para string vacío', () => {
      expect(safeParse('')).toBeNull();
    });
  });
});
