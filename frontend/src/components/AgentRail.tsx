'use client';

import { motion } from 'framer-motion';
import { Cpu, Inbox } from 'lucide-react';
import { type AgentDossier } from '@/lib/contract';
import { shortAddr, trustTier } from '@/lib/format';
import { PanelHeading, Skeleton } from './ui';

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

export function AgentRail({ agents, loading, selected, onSelect }: AgentRailProps) {
  return (
    <section className="panel flex h-full flex-col">
      <PanelHeading
        index="01"
        title="Agent Dossiers"
        right={
          <span className="label-mono text-ink-500">{agents.length} RANKED</span>
        }
      />
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
              return (
                <motion.li
                  key={a.agent}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <button
                    onClick={() => onSelect(a.agent)}
                    className={`focusable flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left transition-colors ${
                      active
                        ? 'border-lime bg-base-700'
                        : 'border-transparent hover:bg-base-700/50'
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-line bg-base-800">
                      <Cpu className="h-3.5 w-3.5 text-ink-300" />
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
                            className="h-full bg-lime"
                            style={{ width: `${a.composite}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-ink-300">
                          {a.composite}
                        </span>
                      </div>
                      <div className="mt-1 label-mono text-ink-500">
                        {a.jobs} JOBS / {a.fulfilled}F {a.partial}P {a.failed}X
                      </div>
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
