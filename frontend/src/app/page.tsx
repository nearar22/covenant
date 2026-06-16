'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { StatusBar } from '@/components/StatusBar';
import { AgentRail } from '@/components/AgentRail';
import { DossierPanel } from '@/components/DossierPanel';
import { CommissionLedger } from '@/components/CommissionLedger';
import { SettlementStream } from '@/components/SettlementStream';
import { ActionModal, type ActionKind } from '@/components/ActionModal';
import { DataError, ErrorBoundary } from '@/components/ErrorState';
import { useWallet } from '@/hooks/useWallet';
import { useContractData } from '@/hooks/useContractData';
import { type Commission } from '@/lib/contract';

export default function ConsolePage() {
  const wallet = useWallet();
  const data = useContractData();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    kind: ActionKind;
    commission: Commission | null;
  } | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!selectedAgent && data.agents.length > 0) {
      setSelectedAgent(data.agents[0].agent);
    }
  }, [data.agents, selectedAgent]);

  useEffect(() => {
    if (!data.lastUpdated) return;
    setStale(false);
    const id = setInterval(() => {
      setStale(Date.now() - (data.lastUpdated ?? 0) > 130000);
    }, 5000);
    return () => clearInterval(id);
  }, [data.lastUpdated]);

  const selectedDossier = useMemo(
    () => data.agents.find((a) => a.agent === selectedAgent) ?? null,
    [data.agents, selectedAgent],
  );

  const openModal = (kind: ActionKind, commission: Commission | null) => {
    data.setTxInFlight(true);
    setModal({ kind, commission });
  };

  const closeModal = () => {
    data.setTxInFlight(false);
    setModal(null);
  };

  const onActCommission = (c: Commission) =>
    openModal(c.status === 'OPEN' ? 'accept' : 'deliver', c);

  return (
    <div className="grid-field min-h-screen">
      <Header wallet={wallet} />
      <StatusBar stats={data.stats} lastUpdated={data.lastUpdated} />

      {stale && (
        <div className="border-b border-amber/30 bg-amber/5 px-4 py-1 text-center label-mono text-amber">
          DATA MAY BE STALE. THE NETWORK COULD BE SLOW; NEXT SYNC PENDING.
        </div>
      )}

      <main className="mx-auto w-full max-w-[1600px] p-3">
        {data.error && !data.loading && data.agents.length === 0 ? (
          <div className="py-10">
            <DataError message={data.error} onRetry={data.refresh} />
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
            <div className="h-[calc(100vh-220px)] min-h-[480px]">
              <ErrorBoundary>
                <AgentRail
                  agents={data.agents}
                  loading={data.loading}
                  selected={selectedAgent}
                  onSelect={setSelectedAgent}
                />
              </ErrorBoundary>
            </div>

            <div className="flex h-[calc(100vh-220px)] min-h-[480px] flex-col gap-3">
              <div className="min-h-0 flex-1">
                <ErrorBoundary>
                  <DossierPanel agent={selectedDossier} />
                </ErrorBoundary>
              </div>
              <div className="min-h-0 flex-1">
                <ErrorBoundary>
                  <CommissionLedger
                    commissions={data.commissions}
                    loading={data.loading}
                    onPost={() => openModal('post', null)}
                    onAct={onActCommission}
                    activeAgent={wallet.address ?? null}
                  />
                </ErrorBoundary>
              </div>
            </div>

            <div className="h-[calc(100vh-220px)] min-h-[480px]">
              <ErrorBoundary>
                <SettlementStream
                  settlements={data.settlements}
                  loading={data.loading}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}
      </main>

      {modal && (
        <ActionModal
          kind={modal.kind}
          commission={modal.commission}
          wallet={wallet}
          onClose={closeModal}
          onSettled={() => {
            setTimeout(() => {
              data.setTxInFlight(false);
              data.refresh();
            }, 1500);
          }}
        />
      )}
    </div>
  );
}
