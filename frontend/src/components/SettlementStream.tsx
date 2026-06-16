'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio } from 'lucide-react';
import { type Settlement } from '@/lib/contract';
import { shortAddr } from '@/lib/format';
import { MiniBars, PanelHeading, Skeleton, Tag } from './ui';

interface SettlementStreamProps {
  settlements: Settlement[];
  loading: boolean;
}

function rulingTone(r: string): 'lime' | 'amber' | 'danger' | 'muted' {
  if (r === 'FULFILLED') return 'lime';
  if (r === 'PARTIAL') return 'amber';
  if (r === 'FAILED') return 'danger';
  return 'muted';
}

const keyOf = (s: Settlement) => `${s.commission}-${s.seq}`;

export function SettlementStream({ settlements, loading }: SettlementStreamProps) {
  // Track which rows have already been seen so freshly streamed verdicts
  // flash once as they land, like a live ticker.
  const seen = useRef<Set<string>>(new Set());
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    const incoming = new Set<string>();
    for (const s of settlements) {
      const k = keyOf(s);
      if (!seen.current.has(k)) incoming.add(k);
    }
    if (incoming.size > 0) {
      // On the very first load, register without flashing the whole backlog.
      const firstLoad = seen.current.size === 0;
      for (const s of settlements) seen.current.add(keyOf(s));
      if (!firstLoad) {
        setFresh(incoming);
        const id = setTimeout(() => setFresh(new Set()), 1300);
        return () => clearTimeout(id);
      }
    }
  }, [settlements]);

  return (
    <section className="panel panel-ticks flex h-full flex-col">
      <PanelHeading
        index="04"
        title="Settlement Stream"
        led="cyan"
        right={
          <span className="flex items-center gap-1.5 label-mono text-cyan">
            <span className="beacon animate-tickerpulse" /> LIVE
          </span>
        }
      />
      {settlements.length > 0 && (
        <div className="flex items-center justify-between border-b border-line bg-base-800/40 px-3 py-1">
          <span className="label-mono text-ink-500">VERDICT TAPE</span>
          <span className="tnum label-mono text-ink-500">
            {String(settlements.length).padStart(3, '0')} SEALED
          </span>
        </div>
      )}
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {loading && settlements.length === 0 ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : settlements.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
            <Radio className="h-7 w-7 text-ink-500" />
            <p className="label-mono text-ink-500">NO SETTLEMENTS YET</p>
            <p className="max-w-[20ch] text-xs text-ink-500">
              Every jury verdict streams here the moment consensus seals it.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {settlements.map((s) => {
                const k = keyOf(s);
                const tone = rulingTone(s.ruling);
                const accentBar =
                  tone === 'lime'
                    ? 'border-l-lime'
                    : tone === 'amber'
                      ? 'border-l-amber'
                      : tone === 'danger'
                        ? 'border-l-danger'
                        : 'border-l-line';
                return (
                  <motion.li
                    key={k}
                    layout
                    initial={{ opacity: 0, height: 0, x: 12 }}
                    animate={{ opacity: 1, height: 'auto', x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ backgroundColor: 'rgba(20, 27, 37, 0.6)' }}
                    className={`border-l-2 ${accentBar} px-3 py-2.5 ${
                      fresh.has(k) ? 'animate-rowflash' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-ink-500">
                        #{s.seq} / {s.commission}
                      </span>
                      <Tag tone={rulingTone(s.ruling)}>{s.ruling}</Tag>
                    </div>
                    <h3 className="mt-1 truncate text-xs text-ink-100">{s.title}</h3>
                    <div className="mt-1.5 grid grid-cols-4 gap-1 inset-well border border-line p-1.5">
                      {(['reliability', 'quality', 'honesty', 'timeliness'] as const).map(
                        (d) => (
                          <div key={d} className="text-center">
                            <div className="tnum font-mono text-[11px] text-ink-100">
                              {String(s.scores[d]).padStart(2, '0')}
                            </div>
                            <div className="mt-0.5 h-0.5 w-full bg-base-600">
                              <div
                                className="h-full origin-left animate-barfill bg-cyan"
                                style={{ width: `${s.scores[d]}%` }}
                              />
                            </div>
                            <div className="label-mono mt-0.5 text-[8px] text-ink-500">
                              {d.slice(0, 3).toUpperCase()}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="label-mono text-ink-500">COMPOSITE</span>
                      <div className="flex items-center gap-2">
                        <MiniBars
                          values={[
                            s.scores.reliability,
                            s.scores.quality,
                            s.scores.honesty,
                            s.scores.timeliness,
                          ]}
                          height={12}
                        />
                        <span className="tnum font-mono text-[11px] text-lime">
                          {String(s.composite).padStart(3, '0')}
                        </span>
                      </div>
                    </div>
                    {s.note && (
                      <p className="mt-1.5 border-l-2 border-line pl-2 text-[11px] italic text-ink-300">
                        {s.note}
                      </p>
                    )}
                    <div className="mt-1 label-mono text-ink-500">
                      AGENT {shortAddr(s.worker)}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}
