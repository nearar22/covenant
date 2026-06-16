'use client';

import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { type TxState } from '@/hooks/useTransaction';
import { EXPLORER, DIMENSIONS } from '@/lib/contract';
import { shortAddr } from '@/lib/format';
import { TrustRadar } from './TrustRadar';
import { Tag } from './ui';

const STAGES = [
  { key: 'SUBMITTED', label: 'Dispatch sealed', match: ['PENDING'] },
  { key: 'PROPOSING', label: 'Leader drafting verdict', match: ['PROPOSING'] },
  {
    key: 'COMMITTING',
    label: 'Validators re-running judgment',
    match: ['COMMITTING', 'REVEALING'],
  },
  { key: 'SEALED', label: 'Consensus sealing settlement', match: ['ACCEPTED', 'FINALIZED'] },
];

function activeStage(live: string): number {
  if (['ACCEPTED', 'FINALIZED'].includes(live)) return 3;
  if (['COMMITTING', 'REVEALING'].includes(live)) return 2;
  if (live === 'PROPOSING') return 1;
  return 0;
}

export function ConsensusStage({ tx }: { tx: TxState }) {
  const live = tx.liveStatus || 'PENDING';
  const stageIdx = activeStage(live);
  const rotating = live === 'LEADER_TIMEOUT' || live === 'VALIDATORS_TIMEOUT';
  const draftScores = tx.draft?.scores;
  const radar = {
    reliability: draftScores?.reliability ?? 0,
    quality: draftScores?.quality ?? 0,
    honesty: draftScores?.honesty ?? 0,
    timeliness: draftScores?.timeliness ?? 0,
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <div className="label-mono mb-3 text-ink-500">
          {rotating ? 'ROTATING LEADER, RETRYING' : `LIVE STATUS / ${live}`}
        </div>
        {/* Stage progress track: a four-segment bar that fills as consensus advances. */}
        <div className="mb-4 flex gap-1">
          {STAGES.map((s, i) => (
            <div key={s.key} className="h-1 flex-1 bg-base-600">
              <div
                className={`h-full origin-left transition-all duration-500 ${
                  i < stageIdx
                    ? 'bg-lime'
                    : i === stageIdx
                      ? 'bg-cyan animate-pulseline'
                      : 'bg-transparent'
                }`}
                style={{ width: i <= stageIdx ? '100%' : '0%' }}
              />
            </div>
          ))}
        </div>
        <ol className="space-y-3">
          {STAGES.map((s, i) => {
            const done = i < stageIdx;
            const current = i === stageIdx;
            return (
              <li key={s.key} className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 items-center justify-center border font-mono text-[10px] ${
                    done
                      ? 'border-lime/50 bg-lime/15 text-lime'
                      : current
                        ? 'border-cyan/60 bg-cyan/10 text-cyan animate-stagepulse'
                        : 'border-line text-ink-500'
                  }`}
                >
                  {done ? '+' : i + 1}
                </span>
                <span
                  className={`text-sm ${
                    done ? 'text-ink-300' : current ? 'text-ink-100' : 'text-ink-500'
                  }`}
                >
                  {s.label}
                </span>
                {current && (
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="label-mono text-cyan">ACTIVE</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulseline" />
                  </span>
                )}
                {done && (
                  <span className="ml-auto label-mono text-lime">SEALED</span>
                )}
              </li>
            );
          })}
        </ol>
        {tx.hash && (
          <a
            href={`${EXPLORER}/tx/${tx.hash}`}
            target="_blank"
            rel="noreferrer"
            className="focusable mt-4 inline-flex items-center gap-1 label-mono text-ink-500 hover:text-cyan"
          >
            TX {shortAddr(tx.hash)} <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <p className="mt-3 max-w-[40ch] text-xs text-ink-500">
          An AI jury write settles under validator consensus. This takes one to
          five minutes. Timeouts are normal: the network rotates the leader and
          retries automatically.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center border border-line bg-base-900 p-4">
        {tx.draft ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <div className="label-mono mb-2 text-amber">
              LEADER DRAFT / SEALING UNDER CONSENSUS
            </div>
            <Tag
              tone={
                tx.draft.ruling === 'FULFILLED'
                  ? 'lime'
                  : tx.draft.ruling === 'PARTIAL'
                    ? 'amber'
                    : 'danger'
              }
            >
              {tx.draft.ruling}
            </Tag>
            <div className="mt-3">
              <TrustRadar scores={radar} size={210} accent="#3ee0e0" />
            </div>
            {tx.draft.note && (
              <p className="mt-2 max-w-[32ch] text-center text-[11px] italic text-ink-300">
                {tx.draft.note}
              </p>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="relative h-28 w-28">
              <div className="absolute inset-0 rounded-full border border-line" />
              <div
                className="absolute inset-0 origin-center animate-sweep"
                style={{
                  background:
                    'conic-gradient(from 0deg, rgba(62,224,224,0.35), transparent 90deg)',
                  borderRadius: '9999px',
                }}
              />
              <div className="absolute inset-[42%] rounded-full bg-cyan animate-pulseline" />
            </div>
            <p className="label-mono text-ink-500">AWAITING LEADER DRAFT</p>
            <p className="max-w-[26ch] text-center text-[11px] text-ink-500">
              The jury verdict and its four-axis score will preview here as soon
              as the leader proposes it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export { DIMENSIONS };
