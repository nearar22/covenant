'use client';

import { motion } from 'framer-motion';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { type AgentDossier, DIMENSIONS, EXPLORER } from '@/lib/contract';
import { shortAddr, trustTier } from '@/lib/format';
import { TrustRadar } from './TrustRadar';
import { Gauge, PanelHeading, Tag } from './ui';

const DIM_LABEL: Record<string, string> = {
  reliability: 'RELIABILITY',
  quality: 'QUALITY',
  honesty: 'HONESTY',
  timeliness: 'TIMELINESS',
};

function rulingTone(r: string): 'lime' | 'amber' | 'danger' | 'muted' {
  if (r === 'FULFILLED') return 'lime';
  if (r === 'PARTIAL') return 'amber';
  if (r === 'FAILED') return 'danger';
  return 'muted';
}

export function DossierPanel({ agent }: { agent: AgentDossier | null }) {
  const scores = agent
    ? {
        reliability: agent.reliability,
        quality: agent.quality,
        honesty: agent.honesty,
        timeliness: agent.timeliness,
      }
    : { reliability: 0, quality: 0, honesty: 0, timeliness: 0 };

  return (
    <section className="panel animate-edgeglow flex h-full flex-col">
      <PanelHeading
        index="02"
        title="Trust Radar"
        right={
          agent ? (
            <a
              href={`${EXPLORER}/address/${agent.agent}`}
              target="_blank"
              rel="noreferrer"
              className="focusable flex items-center gap-1 label-mono text-ink-500 hover:text-cyan"
            >
              {shortAddr(agent.agent)} <ExternalLink className="h-3 w-3" />
            </a>
          ) : null
        }
      />
      {!agent ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <ShieldCheck className="h-8 w-8 text-ink-500" />
          <p className="label-mono text-ink-500">SELECT AN AGENT</p>
          <p className="max-w-[28ch] text-xs text-ink-500">
            Choose a dossier from the rail to plot its multi-axis reputation
            polygon and review its settled commissions.
          </p>
        </div>
      ) : (
        <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
          <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start">
            <div className="shrink-0">
              <TrustRadar scores={scores} size={236} sweep />
            </div>
            <div className="w-full flex-1">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="label-mono text-ink-500">COMPOSITE TRUST</div>
                  <div className="font-display text-3xl font-semibold text-lime">
                    {agent.composite}
                    <span className="ml-1 text-sm text-ink-500">/100</span>
                  </div>
                </div>
                <Tag tone={agent.composite >= 60 ? 'lime' : agent.composite >= 40 ? 'amber' : 'danger'}>
                  {trustTier(agent.composite)}
                </Tag>
              </div>
              <div className="space-y-2.5">
                {DIMENSIONS.map((d) => (
                  <Gauge key={d} label={DIM_LABEL[d]} value={scores[d]} />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
                <div>
                  <div className="font-mono text-lg text-lime">{agent.fulfilled}</div>
                  <div className="label-mono text-ink-500">FULFILLED</div>
                </div>
                <div>
                  <div className="font-mono text-lg text-amber">{agent.partial}</div>
                  <div className="label-mono text-ink-500">PARTIAL</div>
                </div>
                <div>
                  <div className="font-mono text-lg text-danger">{agent.failed}</div>
                  <div className="label-mono text-ink-500">FAILED</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="label-mono mb-2 text-ink-500">VERDICT HISTORY</div>
            {agent.history.length === 0 ? (
              <p className="text-xs text-ink-500">No settled commissions yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {[...agent.history].reverse().map((h, i) => (
                  <motion.li
                    key={`${h.commission}-${i}`}
                    initial={{ opacity: 0, x: 8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-20px' }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                    whileHover={{ x: 3, borderColor: '#2c3a4d' }}
                    className="flex items-center justify-between border border-line bg-base-800 px-2.5 py-1.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-300">
                      {h.title}
                    </span>
                    <div className="flex items-center gap-2 pl-2">
                      <span className="font-mono text-[11px] text-ink-100">
                        {h.composite}
                      </span>
                      <Tag tone={rulingTone(h.ruling)}>{h.ruling}</Tag>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
