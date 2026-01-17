import { describe, it, expect } from 'vitest';
import { parseYMDToDate, toYMD } from './date';

describe('date utils', () => {
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

  it('toYMD returns YYYY-MM-DD for a Date', () => {
    const s = toYMD(new Date(2025, 11, 22));
    expect(s).toBe('2025-12-22');
  });

  it('roundtrips string -> date -> string', () => {
    const orig = '2025-12-22';
    const d = parseYMDToDate(orig);
    expect(d).not.toBeNull();
    expect(toYMD(d)).toBe(orig);
  });
});
