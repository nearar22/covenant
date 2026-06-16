'use client';

import { motion } from 'framer-motion';
import { FileText, Plus } from 'lucide-react';
import { type Commission } from '@/lib/contract';
import { shortAddr } from '@/lib/format';
import { PanelHeading, Skeleton, Tag } from './ui';

interface CommissionLedgerProps {
  commissions: Commission[];
  loading: boolean;
  onPost: () => void;
  onAct: (commission: Commission) => void;
  activeAgent: string | null;
}

function statusTag(status: string) {
  if (status === 'OPEN') return <Tag tone="cyan">OPEN</Tag>;
  if (status === 'ACCEPTED') return <Tag tone="amber">IN PROGRESS</Tag>;
  if (status === 'SETTLED') return <Tag tone="lime">SETTLED</Tag>;
  return <Tag>{status}</Tag>;
}

function statusLed(status: string): string {
  if (status === 'OPEN') return 'text-cyan';
  if (status === 'ACCEPTED') return 'text-amber';
  if (status === 'SETTLED') return 'text-lime';
  return 'text-ink-500';
}

function rulingTag(ruling: string) {
  if (!ruling) return null;
  const tone = ruling === 'FULFILLED' ? 'lime' : ruling === 'PARTIAL' ? 'amber' : 'danger';
  return <Tag tone={tone}>{ruling}</Tag>;
}

export function CommissionLedger({
  commissions,
  loading,
  onPost,
  onAct,
}: CommissionLedgerProps) {
  const open = commissions.filter((c) => c.status === 'OPEN').length;
  const inProgress = commissions.filter((c) => c.status === 'ACCEPTED').length;
  const settled = commissions.filter((c) => c.status === 'SETTLED').length;

  return (
    <section className="panel panel-ticks flex h-full flex-col">
      <PanelHeading
        index="03"
        title="Commission Ledger"
        right={
          <button
            onClick={onPost}
            className="focusable flex items-center gap-1 border border-lime/50 bg-lime/10 px-2 py-1 label-mono text-lime hover:bg-lime/20"
          >
            <Plus className="h-3 w-3" /> POST
          </button>
        }
      />
      {/* Status summary band: a quick read on the book before scanning rows. */}
      {commissions.length > 0 && (
        <div className="flex items-center gap-4 border-b border-line bg-base-800/40 px-3 py-1.5">
          <span className="flex items-center gap-1.5 label-mono text-cyan">
            <span className="led text-cyan" /> {String(open).padStart(2, '0')} OPEN
          </span>
          <span className="flex items-center gap-1.5 label-mono text-amber">
            <span className="led text-amber" /> {String(inProgress).padStart(2, '0')} ACTIVE
          </span>
          <span className="flex items-center gap-1.5 label-mono text-lime">
            <span className="led text-lime" /> {String(settled).padStart(2, '0')} SETTLED
          </span>
        </div>
      )}
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {loading && commissions.length === 0 ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : commissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <FileText className="h-7 w-7 text-ink-500" />
            <p className="label-mono text-ink-500">LEDGER EMPTY</p>
            <p className="max-w-[26ch] text-xs text-ink-500">
              Post the first commission with a brief, acceptance criteria, and a
              non-custodial reward intent.
            </p>
            <button
              onClick={onPost}
              className="focusable mt-1 border border-lime/50 bg-lime/10 px-3 py-1.5 label-mono text-lime hover:bg-lime/20"
            >
              POST COMMISSION
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {[...commissions].reverse().map((c, i) => {
              const accentBar =
                c.status === 'OPEN'
                  ? 'border-l-cyan'
                  : c.status === 'ACCEPTED'
                    ? 'border-l-amber'
                    : c.status === 'SETTLED'
                      ? 'border-l-lime'
                      : 'border-l-line';
              return (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                whileHover={{ backgroundColor: 'rgba(20, 27, 37, 0.6)' }}
                className={`data-row border-l-2 ${accentBar} px-3 py-2.5`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`led ${statusLed(c.status)}`}
                        aria-hidden="true"
                      />
                      <span className="tnum font-mono text-[10px] text-ink-500">
                        {c.id}
                      </span>
                      {statusTag(c.status)}
                      {rulingTag(c.ruling)}
                    </div>
                    <h3 className="mt-1 truncate text-sm text-ink-100">{c.title}</h3>
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">
                      {c.brief}
                    </p>
                  </div>
                  <div className="shrink-0 border-l border-line pl-3 text-right">
                    <div className="tnum font-mono text-sm text-lime">{c.reward}</div>
                    <div className="label-mono text-ink-500">GEN INTENT</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="label-mono text-ink-500">
                    CLIENT {shortAddr(c.client)}
                    {c.worker ? ` / AGENT ${shortAddr(c.worker)}` : ''}
                  </div>
                  {c.status !== 'SETTLED' && (
                    <button
                      onClick={() => onAct(c)}
                      className="focusable border border-line px-2 py-0.5 label-mono text-ink-300 hover:border-cyan/50 hover:text-cyan"
                    >
                      {c.status === 'OPEN' ? 'ACCEPT' : 'DELIVER'}
                    </button>
                  )}
                </div>
              </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
