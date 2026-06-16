'use client';

import { useCallback, useRef, useState } from 'react';
import { makeWalletClient, CONTRACT_ADDRESS } from '@/lib/contract';
import { pollUntilDecided, type LeaderDraft } from '@/lib/tx';

export type TxPhase =
  | 'idle'
  | 'wallet'
  | 'submitted'
  | 'consensus'
  | 'confirmed'
  | 'error';

export interface TxState {
  phase: TxPhase;
  hash: `0x${string}` | null;
  liveStatus: string;
  draft: LeaderDraft | null;
  error: string | null;
  finalStatus: string | null;
}

const INITIAL: TxState = {
  phase: 'idle',
  hash: null,
  liveStatus: '',
  draft: null,
  error: null,
  finalStatus: null,
};

function friendlyError(e: unknown): string {
  const s = String(e);
  if (/user rejected|denied/i.test(s)) return 'You declined the signature request.';
  if (/LackOfFundForMaxFee|insufficient/i.test(s))
    return 'Wallet balance is below the AI-write fee reserve. Claim test GEN from the faucet and retry.';
  if (/rate limit|429/i.test(s)) return 'The network is busy. Wait a moment and retry.';
  return 'The transaction could not be completed. Please retry.';
}

export function useTransaction(onConfirmed?: () => void) {
  const [state, setState] = useState<TxState>(INITIAL);
  const busy = useRef(false);

  const reset = useCallback(() => {
    busy.current = false;
    setState(INITIAL);
  }, []);

  const run = useCallback(
    async (
      account: `0x${string}`,
      functionName: string,
      args: unknown[],
    ): Promise<boolean> => {
      if (busy.current) return false;
      busy.current = true;
      setState({ ...INITIAL, phase: 'wallet' });
      try {
        const client = makeWalletClient(account);
        const hash = (await client.writeContract({
          address: CONTRACT_ADDRESS,
          functionName,
          args: args as never,
          value: 0n,
        })) as `0x${string}`;
        setState((s) => ({ ...s, phase: 'submitted', hash }));
        setState((s) => ({ ...s, phase: 'consensus' }));
        const { status, draft } = await pollUntilDecided(
          client,
          hash,
          (liveStatus, d) =>
            setState((s) => ({ ...s, liveStatus, draft: d ?? s.draft })),
        );
        if (status === 'ACCEPTED' || status === 'FINALIZED') {
          setState((s) => ({
            ...s,
            phase: 'confirmed',
            finalStatus: status,
            draft: draft ?? s.draft,
          }));
          onConfirmed?.();
          busy.current = false;
          return true;
        }
        setState((s) => ({
          ...s,
          phase: 'error',
          finalStatus: status,
          error:
            status === 'UNDETERMINED'
              ? 'Validators could not agree on this verdict. You can retry the delivery.'
              : status === 'CANCELED'
                ? 'The transaction was canceled by the network.'
                : 'The transaction did not settle in time. Check the explorer.',
        }));
        busy.current = false;
        return false;
      } catch (e) {
        setState((s) => ({ ...s, phase: 'error', error: friendlyError(e) }));
        busy.current = false;
        return false;
      }
    },
    [onConfirmed],
  );

  return { state, run, reset };
}
