'use client';

import { motion } from 'framer-motion';
import { Cpu, Inbox } from 'lucide-react';
import { type AgentDossier } from '@/lib/contract';
import { shortAddr, trustTier } from '@/lib/format';
import { MiniBars, PanelHeading, Skeleton } from './ui';

interface AgentRailProps {
  agents: AgentDossier[];
  loading: boolean;
  selected: string | null;
  onSelect: (agent: string) => void;
}

function tierTone(composite: number): string {
  if (composite >= 80) return 'text-lime';
  if (composite >= 60) return 'text-cyan';
  if (composite >= 40) return 'text-amber';
  if (composite > 0) return 'text-danger';
  return 'text-ink-500';
}

function barColor(composite: number): string {
  if (composite >= 80) return '#c4f042';
  if (composite >= 60) return '#3ee0e0';
  if (composite >= 40) return '#f0a830';
  if (composite > 0) return '#ff5b6e';
  return '#5f7088';
}

export function AgentRail({ agents, loading, selected, onSelect }: AgentRailProps) {
  return (
    <section className="panel panel-ticks flex h-full flex-col">
      <PanelHeading
        index="01"
        title="Agent Dossiers"
        right={
          <span className="label-mono text-ink-500">{agents.length} RANKED</span>
        }
      />
      {/* Column header band so the rail reads as a calibrated table. */}
      {agents.length > 0 && (
        <div className="flex items-center gap-3 border-b border-line bg-base-800/40 px-3 py-1">
          <span className="label-mono w-5 text-ink-500">#</span>
          <span className="label-mono flex-1 text-ink-500">AGENT</span>
          <span className="label-mono text-ink-500">TREND</span>
          <span className="label-mono w-8 text-right text-ink-500">CMP</span>
        </div>
      )}
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {loading && agents.length === 0 ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
            <Inbox className="h-7 w-7 text-ink-500" />
            <p className="label-mono text-ink-500">NO AGENTS ON RECORD</p>
            <p className="max-w-[18ch] text-xs text-ink-500">
              The first worker to deliver a commission opens a dossier here.
            </p>
          </div>
        ) : (
          <ul>
            {agents.map((a, i) => {
              const active = selected === a.agent;
              const trajectory = a.history.map((h) => h.composite).slice(-9);
              const bars =
                trajectory.length > 0 ? trajectory : [a.composite];
              return (
                <motion.li
                  key={a.agent}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  whileHover={{ x: 3 }}
                  className="data-row"
                >
                  <button
                    onClick={() => onSelect(a.agent)}
                    className={`focusable flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left transition-colors ${
                      active
                        ? 'border-lime bg-base-700'
                        : 'border-transparent hover:bg-base-700/50'
                    }`}
                  >
                    <span className="tnum w-5 font-mono text-[10px] text-ink-500">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-line bg-base-800">
                      <Cpu
                        className={`h-3.5 w-3.5 ${active ? 'text-lime' : 'text-ink-300'}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-ink-100">
                          {shortAddr(a.agent)}
                        </span>
                        <span className={`label-mono ${tierTone(a.composite)}`}>
                          {trustTier(a.composite)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 flex-1 bg-base-600">
                          <div
                            className="h-full origin-left animate-barfill"
                            style={{
                              width: `${a.composite}%`,
                              backgroundColor: barColor(a.composite),
                            }}
                          />
                        </div>
                        <span className="tnum font-mono text-[10px] text-ink-300">
                          {String(a.composite).padStart(3, '0')}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="label-mono text-ink-500">
                          {a.jobs} JOBS / {a.fulfilled}F {a.partial}P {a.failed}X
                        </span>
                        <MiniBars
                          values={bars}
                          accent={barColor(a.composite)}
                          height={14}
                        />
                      </div>
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
      {/* Footer telemetry band keeps the rail from ending in dead space. */}
      <div className="flex items-center justify-between border-t border-line bg-base-800/40 px-3 py-1.5">
        <span className="label-mono text-ink-500">RANKED BY COMPOSITE</span>
        <span className="flex items-center gap-1.5 label-mono text-cyan">
          <span className="beacon animate-tickerpulse" /> LIVE FEED
        </span>
      </div>
    </section>
  );
}
