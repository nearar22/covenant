'use client';

import { type ReactNode } from 'react';

export function Gauge({
  value,
  label,
  accent = '#c4f042',
}: {
  value: number;
  label: string;
  accent?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label-mono text-ink-500">{label}</span>
        <span className="font-mono text-xs text-ink-100">{v}</span>
      </div>
      <div className="mt-1 h-1.5 w-full bg-base-600">
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${v}%`, backgroundColor: accent }}
        />
      </div>
    </div>
  );
}

const TONE: Record<string, { fg: string; bd: string }> = {
  lime: { fg: 'text-lime', bd: 'border-lime/40' },
  cyan: { fg: 'text-cyan', bd: 'border-cyan/40' },
  amber: { fg: 'text-amber', bd: 'border-amber/40' },
  danger: { fg: 'text-danger', bd: 'border-danger/40' },
  muted: { fg: 'text-ink-500', bd: 'border-line' },
};

export function Tag({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: keyof typeof TONE;
}) {
  const t = TONE[tone] ?? TONE.muted;
  return (
    <span
      className={`inline-flex items-center border ${t.bd} ${t.fg} label-mono px-1.5 py-0.5`}
    >
      {children}
    </span>
  );
}

export function PanelHeading({
  index,
  title,
  right,
}: {
  index: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-lime">{index}</span>
        <h2 className="font-display text-xs font-medium uppercase tracking-[0.16em] text-ink-100">
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-base-600 ${className}`} />;
}
