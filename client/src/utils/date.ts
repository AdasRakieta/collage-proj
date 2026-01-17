// Utilities to parse YYYY-MM-DD date strings as local dates to avoid timezone shifts
// Parse a date-only value (YYYY-MM-DD) into a local Date with time 00:00 local.
export const parseYMDToDate = (date: Date | string | undefined | null): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = String(date);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    return new Date(y, mo - 1, d);
  }
  const dd = new Date(s);
  if (!isNaN(dd.getTime())) return new Date(dd.getFullYear(), dd.getMonth(), dd.getDate());
  return null;
};

export const toYMD = (date: Date | string | undefined | null): string => {
  const d = parseYMDToDate(date);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatYMDForDisplay = (date: Date | string | undefined | null, locale = 'en-US', options?: Intl.DateTimeFormatOptions) => {
  const d = parseYMDToDate(date);
  if (!d) return '';
  return d.toLocaleDateString(locale, options);
};
