'use client';

import { CONTRACT_ADDRESS, DEPLOY_TX, EXPLORER, type Stats } from '@/lib/contract';
import { shortAddr } from '@/lib/format';

interface StatusBarProps {
  stats: Stats | null;
  lastUpdated: number | null;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="label-mono text-ink-500">{label}</span>
      <span className="font-mono text-sm text-lime">{value}</span>
    </div>
  );
}

export function StatusBar({ stats, lastUpdated }: StatusBarProps) {
  const ago = lastUpdated
    ? `${Math.max(0, Math.round((Date.now() - lastUpdated) / 1000))}s`
    : '--';
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-base-900 px-4 py-2">
      <Metric label="COMMISSIONS" value={stats?.commissions ?? '--'} />
      <Metric label="SETTLED" value={stats?.settlements ?? '--'} />
      <Metric label="FULFILLED" value={stats?.fulfilled ?? '--'} />
      <Metric label="AGENTS" value={stats?.agents ?? '--'} />
      <div className="ml-auto flex items-center gap-4">
        <span className="label-mono text-ink-500">SYNC {ago}</span>
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
  );
}
