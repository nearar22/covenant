import type { ReadClient } from './contract';
import { DIMENSIONS, type Dimension } from './contract';

const STATUS_NAME: Record<string, string> = {
  '1': 'PENDING',
  '2': 'PROPOSING',
  '3': 'COMMITTING',
  '4': 'REVEALING',
  '5': 'ACCEPTED',
  '6': 'UNDETERMINED',
  '7': 'FINALIZED',
  '8': 'CANCELED',
  '12': 'VALIDATORS_TIMEOUT',
  '13': 'LEADER_TIMEOUT',
};

export const statusName = (s: unknown) =>
  STATUS_NAME[String(s)] ?? String(s).toUpperCase();

const TERMINAL = new Set([
  'ACCEPTED',
  'FINALIZED',
  'UNDETERMINED',
  'CANCELED',
  'LEADER_TIMEOUT',
  'VALIDATORS_TIMEOUT',
]);
const EXECUTION_NAME: Record<string, string> = {
  '0': 'NOT_VOTED',
  '1': 'FINISHED_WITH_RETURN',
  '2': 'FINISHED_WITH_ERROR',
};

function executionName(tx: unknown): string {
  const named = pick(tx, 'txExecutionResultName');
  if (named !== undefined && named !== null) return String(named).toUpperCase();
  const raw = pick(tx, 'txExecutionResult');
  return EXECUTION_NAME[String(raw)] ?? String(raw ?? 'NOT_VOTED').toUpperCase();
}

export interface LeaderDraft {
  ruling: string;
  scores?: Partial<Record<Dimension, number>>;
  composite?: number;
  note?: string;
}

function pick(obj: unknown, key: string): unknown {
  if (obj instanceof Map) return obj.get(key);
  if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
  return undefined;
}

export function extractLeaderDraft(tx: unknown): LeaderDraft | null {
  try {
    const receipts = pick(pick(tx, 'consensus_data'), 'leader_receipt');
    const first = Array.isArray(receipts) ? receipts[0] : receipts;
    const b64 = pick(pick(first, 'eq_outputs'), '0');
    if (typeof b64 !== 'string' || b64.length === 0) return null;
    const text = atob(b64);
    for (let i = text.length - 1; i >= 0; i--) {
      if (text[i] !== '{') continue;
      try {
        const obj = JSON.parse(text.slice(i));
        if (obj && typeof obj === 'object' && 'ruling' in obj) {
          const scores: Partial<Record<Dimension, number>> = {};
          const rawScores = (obj as Record<string, unknown>).scores;
          if (rawScores && typeof rawScores === 'object') {
            for (const d of DIMENSIONS) {
              const val = (rawScores as Record<string, unknown>)[d];
              if (val !== undefined) scores[d] = Number(val);
            }
          }
          return {
            ruling: String((obj as Record<string, unknown>).ruling),
            scores,
            note: String((obj as Record<string, unknown>).note ?? ''),
          };
        }
      } catch {
        /* keep scanning */
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function pollUntilDecided(
  client: ReadClient,
  hash: `0x${string}`,
  onUpdate?: (status: string, draft: LeaderDraft | null) => void,
): Promise<{ status: string; execution: string; draft: LeaderDraft | null }> {
  let draft: LeaderDraft | null = null;
  for (let i = 0; i < 160; i++) {
    const tx = await client
      .getTransaction({ hash } as Parameters<typeof client.getTransaction>[0])
      .catch(() => null);
    const status = statusName(
      tx ? (tx as { status?: unknown }).status : 'PENDING',
    );
    const execution = tx ? executionName(tx) : 'NOT_VOTED';
    draft = (tx && extractLeaderDraft(tx)) ?? draft;
    onUpdate?.(status, draft);
    if (TERMINAL.has(status)) return { status, execution, draft };
    await new Promise((r) => setTimeout(r, 8000));
  }
  return { status: 'TIMEOUT', execution: 'NOT_VOTED', draft };
}
