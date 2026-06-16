export function toAtto(s: string): bigint {
  const m = s.trim().match(/^(\d+)(?:\.(\d{0,18}))?$/);
  if (!m) return 0n;
  return BigInt(m[1]) * 10n ** 18n + BigInt((m[2] ?? '').padEnd(18, '0') || '0');
}

export function fromAtto(v: string | bigint, maxFrac = 4): string {
  const n = typeof v === 'bigint' ? v : BigInt(v || '0');
  const whole = n / 10n ** 18n;
  const frac = (n % 10n ** 18n)
    .toString()
    .padStart(18, '0')
    .slice(0, maxFrac)
    .replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole.toString();
}

export const shortAddr = (a: string) =>
  a && a.length > 12 ? `${a.slice(0, 6)}\u2026${a.slice(-4)}` : a || 'unassigned';

export function rulingTone(ruling: string): 'lime' | 'amber' | 'danger' | 'muted' {
  switch (ruling.toUpperCase()) {
    case 'FULFILLED':
      return 'lime';
    case 'PARTIAL':
      return 'amber';
    case 'FAILED':
      return 'danger';
    default:
      return 'muted';
  }
}

export function statusTone(status: string): 'lime' | 'cyan' | 'muted' {
  switch (status.toUpperCase()) {
    case 'OPEN':
      return 'cyan';
    case 'ACCEPTED':
      return 'amber' as 'cyan';
    case 'SETTLED':
      return 'lime';
    default:
      return 'muted';
  }
}

export function trustTier(composite: number): string {
  if (composite >= 80) return 'PRIME';
  if (composite >= 60) return 'TRUSTED';
  if (composite >= 40) return 'PROVISIONAL';
  if (composite > 0) return 'WATCH';
  return 'UNRATED';
}
