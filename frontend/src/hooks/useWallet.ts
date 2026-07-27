'use client';

import { useCallback, useEffect, useState } from 'react';
import { CHAIN_ID, sessionAddress } from '@/lib/contract';

const STUDIO_CHAIN_HEX = '0x' + CHAIN_ID.toString(16);

interface Eth {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

function getEth(): Eth | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { ethereum?: Eth }).ethereum ?? null;
}

export interface WalletState {
  address: `0x${string}` | null;
  chainId: number | null;
  connecting: boolean;
  hasProvider: boolean;
  provider: Eth | null;
  usingSession: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    connecting: false,
    hasProvider: false,
    provider: null,
    usingSession: false,
    error: null,
  });

  useEffect(() => {
    setState((s) => ({ ...s, hasProvider: !!getEth() }));
  }, []);

  const connect = useCallback(async () => {
    const eth = getEth();
    // No injected wallet: fall back to the gasless per-browser session signer
    // so the user can still submit on StudioNet without MetaMask.
    if (!eth) {
      setState((s) => ({
        ...s,
        address: sessionAddress(),
        chainId: CHAIN_ID,
        provider: null,
        usingSession: true,
        error: null,
      }));
      return;
    }
    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      const accounts = (await eth.request({
        method: 'eth_requestAccounts',
      })) as string[];
      if (!accounts[0]) throw new Error('Wallet returned no account');
      // Ask the wallet to move to StudioNet. If it is not a known chain the
      // user stays where they are; StudioNet writes still go through the
      // GenLayer Snap, which targets Studio directly.
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: STUDIO_CHAIN_HEX }],
        });
      } catch {
        /* chain not added in the wallet; Snap still targets Studio */
      }
      let chainId: number | null = null;
      try {
        const cid = (await eth.request({ method: 'eth_chainId' })) as string;
        chainId = parseInt(cid, 16);
      } catch {
        /* ignore */
      }
      setState((s) => ({
        ...s,
        address: accounts[0] as `0x${string}`,
        chainId,
        connecting: false,
        hasProvider: true,
        provider: eth,
        usingSession: false,
      }));
    } catch (e) {
      const msg = /user rejected|denied/i.test(String(e))
        ? 'Connection request was declined'
        : 'Could not connect wallet';
      setState((s) => ({ ...s, connecting: false, error: msg }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState((s) => ({
      ...s,
      address: null,
      provider: null,
      usingSession: false,
    }));
  }, []);

  useEffect(() => {
    const eth = getEth();
    if (!eth?.on) return;
    const onAccounts = (...args: unknown[]) => {
      const accts = args[0] as string[];
      setState((s) =>
        s.usingSession
          ? s
          : {
              ...s,
              address: (accts && accts.length ? accts[0] : null) as
                | `0x${string}`
                | null,
            },
      );
    };
    eth.on('accountsChanged', onAccounts);
    return () => {
      eth.removeListener?.('accountsChanged', onAccounts);
    };
  }, []);

  // StudioNet is gasless; any connected signer (wallet or session) can write.
  const onRightChain = true;
  return { ...state, onRightChain, connect, disconnect };
}
