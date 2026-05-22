import { describe, it, expect } from 'vitest';
import { formatCurrency, cn } from '@/lib/utils';

describe('utils', () => {
  describe('formatCurrency', () => {
    it('formatea un monto positivo', () => {
      const result = formatCurrency(1500.50);
      expect(result).toContain('1');
      expect(result).toContain('500');
    });

    it('formatea cero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0');
    });

    it('formatea un monto negativo', () => {
      const result = formatCurrency(-250.75);
      expect(result).toContain('250');
    });
  });

  describe('cn (className merge)', () => {
    it('combina clases simples', () => {
      const result = cn('class-a', 'class-b');
      expect(result).toContain('class-a');
      expect(result).toContain('class-b');
    });

    it('maneja valores falsy', () => {
      const result = cn('class-a', false && 'class-b', 'class-c');
      expect(result).toContain('class-a');
      expect(result).toContain('class-c');
      expect(result).not.toContain('class-b');
    });

    it('resuelve conflictos de Tailwind', () => {
      const result = cn('px-2', 'px-4');
      expect(result).toBe('px-4');
    });

    it('maneja undefined', () => {
      const result = cn('class-a', undefined);
      expect(result).toContain('class-a');
    });
  });
});
