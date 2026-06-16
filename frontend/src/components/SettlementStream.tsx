'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Radio } from 'lucide-react';
import { type Settlement } from '@/lib/contract';
import { shortAddr } from '@/lib/format';
import { PanelHeading, Skeleton, Tag } from './ui';

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

export function SettlementStream({ settlements, loading }: SettlementStreamProps) {
  return (
    <section className="panel flex h-full flex-col">
      <PanelHeading
        index="04"
        title="Settlement Stream"
        right={
          <span className="flex items-center gap-1 label-mono text-cyan">
            <Radio className="h-3 w-3 animate-pulseline" /> LIVE
          </span>
        }
      />
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
              {settlements.map((s) => (
                <motion.li
                  key={`${s.commission}-${s.seq}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-ink-500">
                      #{s.seq} / {s.commission}
                    </span>
                    <Tag tone={rulingTone(s.ruling)}>{s.ruling}</Tag>
                  </div>
                  <h3 className="mt-1 truncate text-xs text-ink-100">{s.title}</h3>
                  <div className="mt-1.5 grid grid-cols-4 gap-1">
                    {(['reliability', 'quality', 'honesty', 'timeliness'] as const).map(
                      (d) => (
                        <div key={d} className="text-center">
                          <div className="font-mono text-[11px] text-ink-100">
                            {s.scores[d]}
                          </div>
                          <div className="label-mono text-[8px] text-ink-500">
                            {d.slice(0, 3).toUpperCase()}
                          </div>
                        </div>
                      ),
                    )}
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
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}
