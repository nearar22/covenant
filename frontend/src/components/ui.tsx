'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

/**
 * useCountUp animates a number from its previous value to the target with an
 * eased ramp, so on-chain figures "spin up" like a mechanical counter rather
 * than snapping. Respects prefers-reduced-motion.
 */
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = fromRef.current;
    if (reduce || from === target) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const begin = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - begin) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

/**
 * CountUp renders a tabular figure that counts up to its target, optionally
 * zero-padded, for instrument-style numeric readouts.
 */
export function CountUp({
  value,
  pad = 0,
  className = '',
}: {
  value: number;
  pad?: number;
  className?: string;
}) {
  const v = useCountUp(value);
  const text = pad > 0 ? String(v).padStart(pad, '0') : String(v);
  return <span className={`tnum ${className}`}>{text}</span>;
}

/**
 * MiniBars renders a compact column of telemetry bars (0..100) that grow in
 * on mount, used to add live density to dense list rows.
 */
export function MiniBars({
  values,
  accent = '#3ee0e0',
  height = 16,
}: {
  values: number[];
  accent?: string;
  height?: number;
}) {
  return (
    <div className="flex items-end gap-[2px]" style={{ height }} aria-hidden="true">
      {values.map((v, i) => {
        const h = Math.max(2, (Math.max(0, Math.min(100, v)) / 100) * height);
        return (
          <span
            key={i}
            className="w-[3px] origin-bottom animate-barfill"
            style={{
              height: h,
              backgroundColor: accent,
              opacity: 0.45 + (v / 100) * 0.5,
              animationDelay: `${i * 60}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

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
        <span className="tnum font-mono text-xs text-ink-100">
          {String(v).padStart(3, '0')}
        </span>
      </div>
      <div className="relative mt-1 h-1.5 w-full bg-base-600">
        {/* hairline quartile ticks so the gauge reads like a calibrated meter */}
        {[25, 50, 75].map((q) => (
          <span
            key={q}
            className="absolute top-0 h-full w-px bg-base-800"
            style={{ left: `${q}%` }}
          />
        ))}
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${v}%`,
            backgroundColor: accent,
            boxShadow: `0 0 8px -1px ${accent}`,
          }}
        />
      </div>
    </div>
  );
}

const TONE: Record<string, { fg: string; bd: string; bg: string }> = {
  lime: { fg: 'text-lime', bd: 'border-lime/50', bg: 'bg-lime/10' },
  cyan: { fg: 'text-cyan', bd: 'border-cyan/50', bg: 'bg-cyan/10' },
  amber: { fg: 'text-amber', bd: 'border-amber/50', bg: 'bg-amber/10' },
  danger: { fg: 'text-danger', bd: 'border-danger/50', bg: 'bg-danger/10' },
  muted: { fg: 'text-ink-500', bd: 'border-line', bg: 'bg-base-700/40' },
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
      className={`inline-flex items-center gap-1 border ${t.bd} ${t.bg} ${t.fg} label-mono px-1.5 py-0.5`}
    >
      <span className="led" aria-hidden="true" style={{ opacity: 0.9 }} />
      {children}
    </span>
  );
}

const LED_TONE: Record<string, string> = {
  lime: 'text-lime',
  cyan: 'text-cyan',
  amber: 'text-amber',
  danger: 'text-danger',
  muted: 'text-ink-500',
};

/**
 * PanelHeading is the instrument-cluster bezel header: an index numeral,
 * a blinking status LED, the panel title, and an optional right slot.
 */
export function PanelHeading({
  index,
  title,
  right,
  led = 'lime',
  live = true,
}: {
  index: string;
  title: string;
  right?: ReactNode;
  led?: keyof typeof LED_TONE;
  live?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line bg-gradient-to-b from-base-700/60 to-base-800/30 px-3 py-2">
      <div className="flex items-center gap-2.5">
        <span className="tnum flex h-5 items-center border border-line bg-base-900 px-1.5 font-mono text-[10px] text-lime">
          {index}
        </span>
        <span
          className={`led ${LED_TONE[led] ?? LED_TONE.lime} ${
            live ? 'animate-ledblink' : ''
          }`}
          aria-hidden="true"
        />
        <h2 className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-ink-100">
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

/**
 * Sparkline renders a compact trend trace from a series of 0..100 values.
 * It strokes itself in on mount (sparkdraw keyframe) so it reads as live
 * telemetry rather than a static decoration.
 */
export function Sparkline({
  values,
  width = 76,
  height = 20,
  accent = '#3ee0e0',
  animate = true,
}: {
  values: number[];
  width?: number;
  height?: number;
  accent?: string;
  animate?: boolean;
}) {
  const pad = 2;
  if (values.length === 0) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <line
          x1={pad}
          y1={height / 2}
          x2={width - pad}
          y2={height / 2}
          stroke="#1f2937"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      </svg>
    );
  }
  const max = 100;
  const min = 0;
  const span = max - min || 1;
  const n = values.length;
  const points = values.map((v, i) => {
    const x = n === 1 ? width - pad : pad + (i * (width - pad * 2)) / (n - 1);
    const y = height - pad - ((Math.max(min, Math.min(max, v)) - min) / span) * (height - pad * 2);
    return [x, y];
  });
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const [lx, ly] = points[points.length - 1];
  return (
    <svg width={width} height={height} aria-hidden="true" className="overflow-visible">
      <path
        d={d}
        fill="none"
        stroke={accent}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
        className={animate ? 'spark-trace animate-sparkdraw' : ''}
        style={{ filter: `drop-shadow(0 0 3px ${accent}55)` }}
      />
      <circle cx={lx} cy={ly} r={1.8} fill={accent} />
    </svg>
  );
}

/**
 * TrendTick: a small up/down/flat arrow with a delta, in semantic color.
 */
export function TrendTick({ delta }: { delta: number }) {
  const tone = delta > 0 ? 'text-lime' : delta < 0 ? 'text-danger' : 'text-ink-500';
  const glyph = delta > 0 ? '+' : delta < 0 ? '-' : '=';
  return (
    <span className={`tnum label-mono ${tone}`}>
      {glyph}
      {Math.abs(delta)}
    </span>
  );
}

/**
 * MiniStat: a compact labeled readout for filling data-light panel bands.
 */
export function MiniStat({
  label,
  value,
  accent = 'text-ink-100',
}: {
  label: string;
  value: ReactNode;
  accent?: string;
}) {
  return (
    <div className="border border-line bg-base-800 px-2.5 py-1.5">
      <div className="label-mono text-ink-500">{label}</div>
      <div className={`tnum mt-0.5 font-mono text-sm ${accent}`}>{value}</div>
    </div>
  );
}
