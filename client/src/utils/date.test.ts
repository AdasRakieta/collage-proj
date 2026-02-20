/**
 * Rozszerzone testy dla client/src/utils/date.ts
 * Testuje: parseYMDToDate, toYMD, formatYMDForDisplay
 */
import { describe, it, expect } from 'vitest';
import { parseYMDToDate, toYMD, formatYMDForDisplay } from './date';

// ─────────────────────────────────────────────────────────────────────────────
// parseYMDToDate
// ─────────────────────────────────────────────────────────────────────────────
describe('parseYMDToDate', () => {
  it('parses YYYY-MM-DD as local date', () => {
    const d = parseYMDToDate('2025-12-22');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2025);
    expect(d!.getMonth()).toBe(11);
    expect(d!.getDate()).toBe(22);
  });

  it('parses ISO string with midnight Z as local date', () => {
    const d = parseYMDToDate('2025-12-22T00:00:00.000Z');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2025);
    expect(d!.getMonth()).toBe(11);
    expect(d!.getDate()).toBe(22);
  });

  it('returns null for null input', () => {
    expect(parseYMDToDate(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseYMDToDate(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseYMDToDate('')).toBeNull();
  });

  it('handles Date object input by normalizing to local midnight', () => {
    const input = new Date(2024, 5, 15); // June 15 2024 local
    const d = parseYMDToDate(input);
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2024);
    expect(d!.getMonth()).toBe(5);
    expect(d!.getDate()).toBe(15);
  });

  it('parses 1 stycznia prawidłowo (padding miesięcy)', () => {
    const d = parseYMDToDate('2024-01-01');
    expect(d!.getMonth()).toBe(0);
    expect(d!.getDate()).toBe(1);
  });

  it('parses 31 grudnia prawidłowo', () => {
    const d = parseYMDToDate('2023-12-31');
    expect(d!.getFullYear()).toBe(2023);
    expect(d!.getMonth()).toBe(11);
    expect(d!.getDate()).toBe(31);
  });

  it('czas wynosi 00:00:00.000 (brak przesunięcia)', () => {
    const d = parseYMDToDate('2025-06-10');
    expect(d!.getHours()).toBe(0);
    expect(d!.getMinutes()).toBe(0);
    expect(d!.getSeconds()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// toYMD
// ─────────────────────────────────────────────────────────────────────────────
describe('toYMD', () => {
  it('returns YYYY-MM-DD for a Date object', () => {
    const s = toYMD(new Date(2025, 11, 22));
    expect(s).toBe('2025-12-22');
  });

  it('roundtrips string -> date -> string', () => {
    const orig = '2025-12-22';
    const d = parseYMDToDate(orig);
    expect(d).not.toBeNull();
    expect(toYMD(d)).toBe(orig);
  });

  it('zwraca pusty string dla null', () => {
    expect(toYMD(null)).toBe('');
  });

  it('zwraca pusty string dla undefined', () => {
    expect(toYMD(undefined)).toBe('');
  });

  it('zwraca pusty string dla pustego stringa', () => {
    expect(toYMD('')).toBe('');
  });

  it('poprawnie dopełnia miesiące i dni zerem', () => {
    expect(toYMD(new Date(2024, 0, 5))).toBe('2024-01-05'); // styczeń = 0
  });

  it('obsługuje rok przestępny 29 lutego', () => {
    expect(toYMD('2024-02-29')).toBe('2024-02-29');
  });

  it('akceptuje iso string bezpośrednio', () => {
    const result = toYMD('2024-07-04');
    expect(result).toBe('2024-07-04');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatYMDForDisplay
// ─────────────────────────────────────────────────────────────────────────────
describe('formatYMDForDisplay', () => {
  it('formatuje datę z domyślnym locale (en-US)', () => {
    const result = formatYMDForDisplay('2025-06-15');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('zwraca pusty string dla null', () => {
    expect(formatYMDForDisplay(null)).toBe('');
  });

  it('zwraca pusty string dla undefined', () => {
    expect(formatYMDForDisplay(undefined)).toBe('');
  });

  it('zwraca pusty string dla pustego stringa', () => {
    expect(formatYMDForDisplay('')).toBe('');
  });

  it('formatuje z opcjami long month', () => {
    const result = formatYMDForDisplay('2025-01-15', 'en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    // Oczekujemy np. "January 15, 2025"
    expect(result).toContain('2025');
    expect(result.toLowerCase()).toContain('january');
  });

  it('formatuje z locale pl-PL', () => {
    const result = formatYMDForDisplay('2025-12-25', 'pl-PL');
    expect(result).toBeTruthy();
    // Polskie locale powinno zawierać rok 2025
    expect(result).toContain('2025');
  });
});
