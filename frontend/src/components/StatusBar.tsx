'use client';

import { CONTRACT_ADDRESS, DEPLOY_TX, EXPLORER, type Stats } from '@/lib/contract';
import { shortAddr } from '@/lib/format';
import { CountUp } from './ui';

interface StatusBarProps {
  stats: Stats | null;
  lastUpdated: number | null;
}

function Metric({
  label,
  value,
  tone = '#c4f042',
}: {
  label: string;
  value: number | null;
  tone?: string;
}) {
  return (
    <div className="group flex items-baseline gap-2">
      <span className="label-mono text-ink-500 transition-colors group-hover:text-ink-300">
        {label}
      </span>
      {value === null ? (
        <span className="font-mono text-sm text-ink-500">--</span>
      ) : (
        <CountUp value={value} className="font-mono text-sm" />
      )}
      <span
        className="hidden h-3 w-px sm:inline-block"
        style={{ backgroundColor: tone, opacity: 0.4 }}
      />
    </div>
  );
}

export function StatusBar({ stats, lastUpdated }: StatusBarProps) {
  const ago = lastUpdated
    ? `${Math.max(0, Math.round((Date.now() - lastUpdated) / 1000))}s`
    : '--';
  return (
    <div className="relative overflow-hidden border-b border-line bg-base-900/90 backdrop-blur">
      {/* A faint highlight wipes across the strip so it reads as a live bus. */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-scanwipe"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(62,224,224,0.05), transparent)',
        }}
        aria-hidden="true"
      />
      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
        <span className="label-mono hidden text-lime sm:inline">LEDGER</span>
        <Metric label="COMMISSIONS" value={stats?.commissions ?? null} />
        <Metric label="SETTLED" value={stats?.settlements ?? null} tone="#3ee0e0" />
        <Metric label="FULFILLED" value={stats?.fulfilled ?? null} />
        <Metric label="AGENTS" value={stats?.agents ?? null} tone="#3ee0e0" />
        <div className="ml-auto flex items-center gap-4">
          <span className="flex items-center gap-1.5 label-mono text-ink-500">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-cyan animate-heartbeat"
              aria-hidden="true"
            />
            SYNC {ago}
          </span>
          <a
            href={`${EXPLORER}/tx/${DEPLOY_TX}`}
            target="_blank"
            rel="noreferrer"
            className="focusable label-mono text-ink-500 hover:text-cyan"
          >
            DEPLOY {shortAddr(DEPLOY_TX)}
          </a>
          <span className="hidden font-mono text-[10px] text-ink-500 sm:inline">
            {shortAddr(CONTRACT_ADDRESS)}
          </span>
        </div>
      </div>
    </div>
  );
}
