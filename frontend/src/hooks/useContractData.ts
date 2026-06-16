'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchAgents,
  fetchCommissions,
  fetchSettlements,
  fetchStats,
  type AgentDossier,
  type Commission,
  type Settlement,
  type Stats,
} from '@/lib/contract';

const POLL_MS = 95000;

export interface ContractData {
  loading: boolean;
  error: string | null;
  stats: Stats | null;
  commissions: Commission[];
  agents: AgentDossier[];
  settlements: Settlement[];
  lastUpdated: number | null;
  refresh: () => Promise<void>;
  setTxInFlight: (v: boolean) => void;
}

function classifyError(e: unknown): string {
  const s = String(e);
  if (/contract not found|execution reverted/i.test(s)) {
    return 'No contract exists at the configured address on Bradbury. The deployment must be repaired.';
  }
  if (/rate limit|429/i.test(s)) {
    return 'The network is rate limiting reads. Retrying shortly.';
  }
  return 'Could not reach the contract on Bradbury.';
}

export function useContractData(): ContractData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [agents, setAgents] = useState<AgentDossier[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const alive = useRef(true);
  const txInFlight = useRef(false);

  const load = useCallback(async () => {
    if (txInFlight.current) return;
    try {
      const [s, c, a, st] = await Promise.all([
        fetchStats(),
        fetchCommissions(0),
        fetchAgents(0),
        fetchSettlements(0),
      ]);
      if (!alive.current) return;
      setStats(s);
      setCommissions(c);
      setAgents(a);
      setSettlements(st);
      setError(null);
      setLastUpdated(Date.now());
    } catch (e) {
      if (!alive.current) return;
      setError(classifyError(e));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive.current = false;
      clearInterval(id);
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  const setTxInFlight = useCallback((v: boolean) => {
    txInFlight.current = v;
  }, []);

  const sortedAgents = useMemo(
    () => [...agents].sort((x, y) => y.composite - x.composite),
    [agents],
  );

  return {
    loading,
    error,
    stats,
    commissions,
    agents: sortedAgents,
    settlements,
    lastUpdated,
    refresh,
    setTxInFlight,
  };
}
