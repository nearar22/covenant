import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

export const CONTRACT_ADDRESS =
  '0x36D62C794E8A9Bbe19Daa62A663DD341ff47CE6D' as const;
export const DEPLOY_TX =
  '0x61f1b00eafaecdb75c6ab0db42b5c1f89cb0dcb4339f9945486cf6778ebedb4c' as const;
export const EXPLORER = 'https://explorer-bradbury.genlayer.com';
export const FAUCET = 'https://testnet-faucet.genlayer.foundation/';
export const NETWORK_NAME = 'Bradbury';
export const CHAIN_ID = 4221;

export type ReadClient = ReturnType<typeof createClient>;

export const readClient: ReadClient = createClient({ chain: testnetBradbury });

export const makeWalletClient = (account: `0x${string}`) =>
  createClient({ chain: testnetBradbury, account });

export async function withRpcRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!/rate limit|429|timeout|network|fetch/i.test(String(e))) throw e;
      await new Promise((r) => setTimeout(r, 2500 * 2 ** i));
    }
  }
  throw last;
}

export const DIMENSIONS = ['reliability', 'quality', 'honesty', 'timeliness'] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export interface Commission {
  id: string;
  title: string;
  brief: string;
  criteria: string;
  reward: string;
  client: string;
  worker: string;
  status: 'OPEN' | 'ACCEPTED' | 'SETTLED' | string;
  ruling: string;
  seq: number;
}

export interface HistoryEntry {
  commission: string;
  title: string;
  ruling: string;
  scores: Record<Dimension, number>;
  composite: number;
  seq: number;
}

export interface AgentDossier {
  agent: string;
  jobs: number;
  fulfilled: number;
  partial: number;
  failed: number;
  reliability: number;
  quality: number;
  honesty: number;
  timeliness: number;
  composite: number;
  history: HistoryEntry[];
}

export interface Settlement {
  commission: string;
  title: string;
  worker: string;
  client: string;
  ruling: string;
  scores: Record<Dimension, number>;
  composite: number;
  note: string;
  seq: number;
}

export interface Stats {
  commissions: number;
  settlements: number;
  fulfilled: number;
  agents: number;
}

function asNumber(v: unknown): number {
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asString(v: unknown): string {
  return v === undefined || v === null ? '' : String(v);
}

function pick(obj: unknown, key: string): unknown {
  if (obj instanceof Map) return obj.get(key);
  if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
  return undefined;
}

function normScores(raw: unknown): Record<Dimension, number> {
  const out = {} as Record<Dimension, number>;
  for (const d of DIMENSIONS) out[d] = asNumber(pick(raw, d));
  return out;
}

function normHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((h) => ({
    commission: asString(pick(h, 'commission')),
    title: asString(pick(h, 'title')),
    ruling: asString(pick(h, 'ruling')),
    scores: normScores(pick(h, 'scores')),
    composite: asNumber(pick(h, 'composite')),
    seq: asNumber(pick(h, 'seq')),
  }));
}

export function normCommission(raw: unknown): Commission {
  return {
    id: asString(pick(raw, 'id')),
    title: asString(pick(raw, 'title')),
    brief: asString(pick(raw, 'brief')),
    criteria: asString(pick(raw, 'criteria')),
    reward: asString(pick(raw, 'reward')),
    client: asString(pick(raw, 'client')),
    worker: asString(pick(raw, 'worker')),
    status: asString(pick(raw, 'status')),
    ruling: asString(pick(raw, 'ruling')),
    seq: asNumber(pick(raw, 'seq')),
  };
}

export function normAgent(raw: unknown): AgentDossier {
  return {
    agent: asString(pick(raw, 'agent')),
    jobs: asNumber(pick(raw, 'jobs')),
    fulfilled: asNumber(pick(raw, 'fulfilled')),
    partial: asNumber(pick(raw, 'partial')),
    failed: asNumber(pick(raw, 'failed')),
    reliability: asNumber(pick(raw, 'reliability')),
    quality: asNumber(pick(raw, 'quality')),
    honesty: asNumber(pick(raw, 'honesty')),
    timeliness: asNumber(pick(raw, 'timeliness')),
    composite: asNumber(pick(raw, 'composite')),
    history: normHistory(pick(raw, 'history')),
  };
}

export function normSettlement(raw: unknown): Settlement {
  return {
    commission: asString(pick(raw, 'commission')),
    title: asString(pick(raw, 'title')),
    worker: asString(pick(raw, 'worker')),
    client: asString(pick(raw, 'client')),
    ruling: asString(pick(raw, 'ruling')),
    scores: normScores(pick(raw, 'scores')),
    composite: asNumber(pick(raw, 'composite')),
    note: asString(pick(raw, 'note')),
    seq: asNumber(pick(raw, 'seq')),
  };
}

async function readView(functionName: string, args: unknown[] = []): Promise<unknown> {
  return withRpcRetry(() =>
    readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args: args as never,
    }),
  );
}

export async function fetchStats(): Promise<Stats> {
  const raw = await readView('get_stats');
  return {
    commissions: asNumber(pick(raw, 'commissions')),
    settlements: asNumber(pick(raw, 'settlements')),
    fulfilled: asNumber(pick(raw, 'fulfilled')),
    agents: asNumber(pick(raw, 'agents')),
  };
}

export async function fetchCommissions(start = 0): Promise<Commission[]> {
  const raw = await readView('get_commissions', [start]);
  return Array.isArray(raw) ? raw.map(normCommission) : [];
}

export async function fetchAgents(start = 0): Promise<AgentDossier[]> {
  const raw = await readView('get_agents', [start]);
  return Array.isArray(raw) ? raw.map(normAgent) : [];
}

export async function fetchAgent(agent: string): Promise<AgentDossier> {
  const raw = await readView('get_agent', [agent]);
  return normAgent(raw);
}

export async function fetchSettlements(start = 0): Promise<Settlement[]> {
  const raw = await readView('get_settlements', [start]);
  return Array.isArray(raw) ? raw.map(normSettlement) : [];
}

export async function fetchCommission(id: string): Promise<Commission> {
  const raw = await readView('get_commission', [id]);
  return normCommission(raw);
}
