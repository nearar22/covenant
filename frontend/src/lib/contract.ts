import { createClient, createAccount, generatePrivateKey } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

export const CONTRACT_ADDRESS =
  '0xA3BD2ecE538e476C1Bf4de7c6741818ff8438c87' as const;
export const DEPLOY_TX =
  '0x399f5fe7d88cefa5b4bee97dd1cec0ed7bc3fea054655289b2bac864050fb213' as const;
export const EXPLORER = 'https://explorer-studio.genlayer.com';
export const FAUCET = 'https://studio.genlayer.com/';
export const NETWORK_NAME = 'GenLayer Studio';
export const CHAIN_ID = 61999;

export type ReadClient = ReturnType<typeof createClient>;

type BrowserProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

// StudioNet is gasless and requires an account even for reads. A throwaway
// session key (persisted per browser) is generated so reads always work; it
// signs nothing when a real wallet is connected.
const SESSION_PK_KEY = 'covenant_session_pk';

function sessionAccount() {
  let pk: `0x${string}` | undefined;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(SESSION_PK_KEY);
    if (stored && /^0x[0-9a-fA-F]{64}$/.test(stored)) {
      pk = stored as `0x${string}`;
    } else {
      pk = generatePrivateKey() as `0x${string}`;
      localStorage.setItem(SESSION_PK_KEY, pk);
    }
  }
  return createAccount(pk);
}

export const readClient: ReadClient = createClient({
  chain: studionet,
  account: sessionAccount(),
});

// When a wallet with the GenLayer Snap is connected, sign through it. Otherwise
// fall back to the per-browser session key (testnet-only, gasless).
export const makeWalletClient = (
  account: `0x${string}` | null,
  provider: BrowserProvider | null,
) => {
  if (account && provider) {
    return createClient({ chain: studionet, account, provider });
  }
  return createClient({ chain: studionet, account: sessionAccount() });
};

export const sessionAddress = (): `0x${string}` =>
  sessionAccount().address as `0x${string}`;

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
  evidenceUrl: string;
  evidenceKind: string;
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
  evidenceUrl: string;
  evidenceKind: string;
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
    evidenceUrl: asString(pick(raw, 'evidence_url')),
    evidenceKind: asString(pick(raw, 'evidence_kind')),
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
    evidenceUrl: asString(pick(raw, 'evidence_url')),
    evidenceKind: asString(pick(raw, 'evidence_kind')),
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
