'use client';

import { motion } from 'framer-motion';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { type AgentDossier, DIMENSIONS, EXPLORER } from '@/lib/contract';
import { shortAddr, trustTier } from '@/lib/format';
import { TrustRadar } from './TrustRadar';
import { CountUp, Gauge, MiniStat, PanelHeading, Sparkline, Tag } from './ui';

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

  // Composite trajectory derived from the on-chain verdict history, oldest
  // to newest, so the sparkline reflects how trust actually evolved.
  const trajectory = agent
    ? agent.history.map((h) => h.composite)
    : [];

  return (
    <section className="panel panel-ticks panel-elevated animate-edgeglow flex h-full flex-col">
      <PanelHeading
        index="02"
        title="Trust Radar"
        led="cyan"
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
          ) : (
            <span className="label-mono text-ink-500">TELEMETRY / STANDBY</span>
          )
        }
      />
      {!agent ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          {/* Crafted empty state: a dimmed instrument so the band is never blank. */}
          <div className="opacity-40">
            <TrustRadar
              scores={{ reliability: 0, quality: 0, honesty: 0, timeliness: 0 }}
              size={200}
              accent="#5f7088"
            />
          </div>
          <ShieldCheck className="h-7 w-7 text-ink-500" />
          <p className="label-mono text-ink-500">SELECT AN AGENT</p>
          <p className="max-w-[30ch] text-xs text-ink-500">
            Choose a dossier from the rail to plot its multi-axis reputation
            polygon and review its settled commissions.
          </p>
        </div>
      ) : (
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            {/* Centerpiece radar bay with its own bezel and composite readout. */}
            <div className="relative flex flex-col items-center gap-3 border-b border-line p-5 lg:border-b-0 lg:border-r">
              <div className="flex w-full items-center justify-between">
                <span className="label-mono text-cyan">PRIMARY INSTRUMENT</span>
                <span className="flex items-center gap-1.5 label-mono text-ink-500">
                  <span className="beacon animate-tickerpulse" /> PLOTTING
                </span>
              </div>
              <div className="relative animate-glowdrift">
                <TrustRadar scores={scores} size={288} sweep />
              </div>
              <div className="inset-well flex w-full items-stretch justify-between gap-3 border border-line px-3 py-2.5">
                <div className="flex flex-col justify-center">
                  <div className="label-mono text-ink-500">COMPOSITE TRUST</div>
                  <div className="flex items-baseline gap-1">
                    <motion.span
                      key={agent.agent + agent.composite}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="tnum font-display text-5xl font-semibold leading-none text-lime"
                      style={{ textShadow: '0 0 18px rgba(196,240,66,0.35)' }}
                    >
                      <CountUp value={agent.composite} pad={3} />
                    </motion.span>
                    <span className="tnum label-mono text-ink-500">/100</span>
                  </div>
                </div>
                <div className="col-rule flex flex-col items-end justify-center pl-3">
                  <Tag
                    tone={
                      agent.composite >= 60
                        ? 'lime'
                        : agent.composite >= 40
                          ? 'amber'
                          : 'danger'
                    }
                  >
                    {trustTier(agent.composite)}
                  </Tag>
                  <div className="mt-1.5 label-mono text-ink-500">RANK TIER</div>
                </div>
              </div>
              <div className="flex w-full items-center justify-between border-t border-line pt-2.5">
                <span className="label-mono text-ink-500">TRAJECTORY</span>
                <Sparkline values={trajectory} width={140} height={24} accent="#c4f042" />
              </div>
            </div>

            {/* Axis gauges + tallies. */}
            <div className="p-4">
              <div className="label-mono mb-2 text-ink-500">AXIS READOUT</div>
              <div className="space-y-2.5">
                {DIMENSIONS.map((d) => (
                  <Gauge key={d} label={DIM_LABEL[d]} value={scores[d]} />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
                <div className="border border-line bg-base-800 px-2 py-1.5 animate-risein">
                  <div className="tnum font-mono text-lg text-lime">{agent.fulfilled}</div>
                  <div className="label-mono text-ink-500">FULFILLED</div>
                </div>
                <div
                  className="border border-line bg-base-800 px-2 py-1.5 animate-risein"
                  style={{ animationDelay: '60ms' }}
                >
                  <div className="tnum font-mono text-lg text-amber">{agent.partial}</div>
                  <div className="label-mono text-ink-500">PARTIAL</div>
                </div>
                <div
                  className="border border-line bg-base-800 px-2 py-1.5 animate-risein"
                  style={{ animationDelay: '120ms' }}
                >
                  <div className="tnum font-mono text-lg text-danger">{agent.failed}</div>
                  <div className="label-mono text-ink-500">FAILED</div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between border border-line bg-base-800 px-2.5 py-1.5">
                <span className="label-mono text-ink-500">TOTAL JOBS</span>
                <span className="tnum font-mono text-sm text-ink-100">
                  {String(agent.jobs).padStart(3, '0')}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <MiniStat
                  label="SUCCESS RATE"
                  value={`${
                    agent.jobs > 0
                      ? Math.round((agent.fulfilled / agent.jobs) * 100)
                      : 0
                  }%`}
                  accent="text-lime"
                />
                <MiniStat
                  label="TIER"
                  value={trustTier(agent.composite)}
                  accent="text-cyan"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-line p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="label-mono text-ink-500">VERDICT HISTORY</span>
              <span className="label-mono text-ink-500">
                {agent.history.length} ON RECORD
              </span>
            </div>
            {agent.history.length === 0 ? (
              <div className="border border-dashed border-line bg-base-800/40 px-3 py-4 text-center">
                <p className="label-mono text-ink-500">AWAITING FIRST VERDICT</p>
                <p className="mt-1 text-xs text-ink-500">
                  Settled commissions fold into this log as the jury seals them.
                </p>
              </div>
            ) : (
              <ul className="border border-line">
                {[...agent.history].reverse().map((h, i) => (
                  <motion.li
                    key={`${h.commission}-${i}`}
                    initial={{ opacity: 0, x: 8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-20px' }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                    whileHover={{ backgroundColor: 'rgba(20, 27, 37, 0.7)' }}
                    className="data-row flex items-center gap-2 border-b border-line px-2.5 py-1.5 last:border-b-0"
                  >
                    <span className="tnum font-mono text-[10px] text-ink-500">
                      {h.commission}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-300">
                      {h.title}
                    </span>
                    <span className="tnum col-rule pl-2 font-mono text-[11px] text-ink-100">
                      {String(h.composite).padStart(3, '0')}
                    </span>
                    <Tag tone={rulingTone(h.ruling)}>{h.ruling}</Tag>
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
