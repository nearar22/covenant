'use client';

import { useMemo } from 'react';
import { type Commission, type Settlement } from '@/lib/contract';
import { shortAddr } from '@/lib/format';

interface ActivityTickerProps {
  commissions: Commission[];
  settlements: Settlement[];
}

interface Item {
  tone: string;
  tag: string;
  text: string;
}

function rulingTone(r: string): string {
  if (r === 'FULFILLED') return 'text-lime';
  if (r === 'PARTIAL') return 'text-amber';
  if (r === 'FAILED') return 'text-danger';
  return 'text-ink-300';
}

function statusTone(s: string): string {
  if (s === 'OPEN') return 'text-cyan';
  if (s === 'ACCEPTED') return 'text-amber';
  if (s === 'SETTLED') return 'text-lime';
  return 'text-ink-300';
}

/**
 * ActivityTicker is the thin live tape that marquees recent ledger and
 * settlement activity across the console. The track holds two copies of the
 * sequence so the CSS translateX(-50%) loop is seamless. Paused on hover and
 * frozen under prefers-reduced-motion (handled by the global media query).
 */
export function ActivityTicker({ commissions, settlements }: ActivityTickerProps) {
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const s of settlements.slice(0, 8)) {
      out.push({
        tone: rulingTone(s.ruling),
        tag: `SEAL #${s.seq}`,
        text: `${s.commission} ${s.ruling} cmp ${String(s.composite).padStart(3, '0')} / agent ${shortAddr(s.worker)}`,
      });
    }
    for (const c of [...commissions].reverse().slice(0, 8)) {
      out.push({
        tone: statusTone(c.status),
        tag: c.status,
        text: `${c.id} ${c.title.slice(0, 38)} / ${c.reward} GEN`,
      });
    }
    return out;
  }, [commissions, settlements]);

  if (items.length === 0) {
    return (
      <div className="border-b border-line bg-base-900/80 px-4 py-1">
        <span className="label-mono text-ink-500">
          ACTIVITY TAPE / STANDBY / AWAITING FIRST ON-CHAIN EVENT
        </span>
      </div>
    );
  }

  const Sequence = ({ ariaHidden }: { ariaHidden?: boolean }) => (
    <div className="ticker-track" aria-hidden={ariaHidden}>
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-2 px-5">
          <span className={`label-mono ${it.tone}`}>{it.tag}</span>
          <span className="font-mono text-[11px] text-ink-300">{it.text}</span>
          <span className="text-ink-500">/</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="group relative flex items-center border-b border-line bg-base-900/80">
      <span className="z-10 flex shrink-0 items-center gap-1.5 border-r border-line bg-base-800 px-3 py-1 label-mono text-cyan">
        <span className="beacon animate-tickerpulse" /> LIVE TAPE
      </span>
      <div className="ticker-mask relative flex-1 overflow-hidden py-1">
        <div className="ticker-track animate-tickerscroll group-hover:[animation-play-state:paused]">
          <Sequence />
          <Sequence ariaHidden />
        </div>
      </div>
    </div>
  );
}
