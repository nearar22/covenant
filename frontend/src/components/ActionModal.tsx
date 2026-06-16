'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { type Commission } from '@/lib/contract';
import { useTransaction } from '@/hooks/useTransaction';
import { useWallet } from '@/hooks/useWallet';
import { ConsensusStage } from './ConsensusStage';
import { Tag } from './ui';

export type ActionKind = 'post' | 'accept' | 'deliver';

interface ActionModalProps {
  kind: ActionKind;
  commission: Commission | null;
  wallet: ReturnType<typeof useWallet>;
  onClose: () => void;
  onSettled: () => void;
}

const TITLES: Record<ActionKind, string> = {
  post: 'Post Commission',
  accept: 'Accept Commission',
  deliver: 'Submit Deliverable',
};

export function ActionModal({
  kind,
  commission,
  wallet,
  onClose,
  onSettled,
}: ActionModalProps) {
  const { state, run, reset } = useTransaction(onSettled);
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [criteria, setCriteria] = useState('');
  const [reward, setReward] = useState('');
  const [deliverable, setDeliverable] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    reset();
  }, [kind, commission, reset]);

  const needWallet = !wallet.address;
  const wrongChain = wallet.address && !wallet.onRightChain;

  const submit = async () => {
    setFormError(null);
    if (!wallet.address) {
      await wallet.connect();
      return;
    }
    if (kind === 'post') {
      if (title.trim().length < 1 || title.length > 90)
        return setFormError('Title must be 1 to 90 characters.');
      if (brief.trim().length < 1 || brief.length > 600)
        return setFormError('Brief must be 1 to 600 characters.');
      if (criteria.trim().length < 1 || criteria.length > 600)
        return setFormError('Acceptance criteria must be 1 to 600 characters.');
      if (!/^\d+(\.\d+)?$/.test(reward.trim()) || Number(reward) <= 0)
        return setFormError('Reward intent must be a positive number.');
      await run(wallet.address, 'post_commission', [
        title.trim(),
        brief.trim(),
        criteria.trim(),
        reward.trim(),
      ]);
    } else if (kind === 'accept') {
      if (!commission) return;
      await run(wallet.address, 'accept_commission', [commission.id]);
    } else {
      if (!commission) return;
      if (deliverable.trim().length < 1 || deliverable.length > 900)
        return setFormError('Deliverable must be 1 to 900 characters.');
      await run(wallet.address, 'deliver', [commission.id, deliverable.trim()]);
    }
  };

  const inConsensus = state.phase === 'consensus' || state.phase === 'submitted';
  const confirmed = state.phase === 'confirmed';
  const errored = state.phase === 'error';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-base-900/85 p-3 backdrop-blur-sm sm:items-center sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          onClick={(e) => e.stopPropagation()}
          className="panel panel-bright w-full max-w-2xl"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h2 className="font-display text-sm font-medium uppercase tracking-[0.14em] text-ink-100">
              {TITLES[kind]}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="focusable text-ink-500 hover:text-ink-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4">
            {inConsensus ? (
              <ConsensusStage tx={state} />
            ) : confirmed ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-lime" />
                <h3 className="font-display text-lg text-ink-100">
                  Settled on-chain
                </h3>
                {state.draft?.ruling && (
                  <Tag
                    tone={
                      state.draft.ruling === 'FULFILLED'
                        ? 'lime'
                        : state.draft.ruling === 'PARTIAL'
                          ? 'amber'
                          : 'danger'
                    }
                  >
                    {state.draft.ruling}
                  </Tag>
                )}
                <p className="max-w-[40ch] text-xs text-ink-500">
                  The verdict is the authoritative settlement. The console will
                  refresh with the updated dossier and stream shortly.
                </p>
                <button
                  onClick={onClose}
                  className="focusable mt-2 border border-lime/50 bg-lime/10 px-4 py-1.5 label-mono text-lime hover:bg-lime/20"
                >
                  RETURN TO CONSOLE
                </button>
              </div>
            ) : errored ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <AlertTriangle className="h-9 w-9 text-danger" />
                <p className="max-w-[40ch] text-sm text-ink-300">{state.error}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => reset()}
                    className="focusable border border-line px-4 py-1.5 label-mono text-ink-300 hover:border-lime/50 hover:text-lime"
                  >
                    TRY AGAIN
                  </button>
                  <button
                    onClick={onClose}
                    className="focusable border border-line px-4 py-1.5 label-mono text-ink-500 hover:text-ink-100"
                  >
                    CLOSE
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {kind === 'post' && (
                  <>
                    <Field label="TITLE" hint={`${title.length}/90`}>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value.slice(0, 90))}
                        placeholder="Concise task headline"
                        className="cv-input"
                      />
                    </Field>
                    <Field label="TASK BRIEF" hint={`${brief.length}/600`}>
                      <textarea
                        value={brief}
                        onChange={(e) => setBrief(e.target.value.slice(0, 600))}
                        rows={3}
                        placeholder="What the worker agent must do."
                        className="cv-input resize-none"
                      />
                    </Field>
                    <Field label="ACCEPTANCE CRITERIA" hint={`${criteria.length}/600`}>
                      <textarea
                        value={criteria}
                        onChange={(e) => setCriteria(e.target.value.slice(0, 600))}
                        rows={3}
                        placeholder="Explicit, checkable conditions the jury rules against."
                        className="cv-input resize-none"
                      />
                    </Field>
                    <Field label="REWARD INTENT (GEN, NON-CUSTODIAL)">
                      <input
                        value={reward}
                        onChange={(e) => setReward(e.target.value)}
                        placeholder="e.g. 12.5"
                        inputMode="decimal"
                        className="cv-input"
                      />
                    </Field>
                    <p className="label-mono text-ink-500">
                      NO FUNDS MOVE. THE INTENT IS A NON-CUSTODIAL COMMITMENT;
                      YOU ONLY PAY NETWORK FEES.
                    </p>
                  </>
                )}

                {kind === 'accept' && commission && (
                  <div className="space-y-2">
                    <p className="text-sm text-ink-300">
                      You are accepting commission{' '}
                      <span className="font-mono text-ink-100">{commission.id}</span>{' '}
                      as the worker agent. The client cannot accept their own
                      commission.
                    </p>
                    <div className="border border-line bg-base-800 p-3">
                      <div className="text-sm text-ink-100">{commission.title}</div>
                      <p className="mt-1 text-xs text-ink-500">{commission.brief}</p>
                      <div className="mt-2 label-mono text-cyan">
                        CRITERIA: <span className="text-ink-300">{commission.criteria}</span>
                      </div>
                    </div>
                  </div>
                )}

                {kind === 'deliver' && commission && (
                  <>
                    <div className="border border-line bg-base-800 p-3">
                      <div className="text-sm text-ink-100">{commission.title}</div>
                      <div className="mt-1.5 label-mono text-cyan">
                        ACCEPTANCE CRITERIA
                      </div>
                      <p className="text-xs text-ink-300">{commission.criteria}</p>
                    </div>
                    <Field label="DELIVERABLE" hint={`${deliverable.length}/900`}>
                      <textarea
                        value={deliverable}
                        onChange={(e) =>
                          setDeliverable(e.target.value.slice(0, 900))
                        }
                        rows={6}
                        placeholder="Submit your work as text, a URL, or a hash/reference. The AI jury rules it against the criteria."
                        className="cv-input resize-none"
                      />
                    </Field>
                  </>
                )}

                {formError && (
                  <p className="border border-danger/40 bg-danger/5 px-2 py-1 label-mono text-danger">
                    {formError}
                  </p>
                )}

                {needWallet ? (
                  <button
                    onClick={submit}
                    className="focusable w-full border border-lime/50 bg-lime/10 py-2 label-mono text-lime hover:bg-lime/20"
                  >
                    CONNECT WALLET TO CONTINUE
                  </button>
                ) : wrongChain ? (
                  <button
                    onClick={wallet.connect}
                    className="focusable w-full border border-amber/50 bg-amber/10 py-2 label-mono text-amber hover:bg-amber/20"
                  >
                    SWITCH TO BRADBURY
                  </button>
                ) : (
                  <button
                    onClick={submit}
                    className="focusable w-full border border-lime/50 bg-lime/10 py-2 label-mono text-lime hover:bg-lime/20"
                  >
                    {kind === 'post'
                      ? 'POST COMMISSION'
                      : kind === 'accept'
                        ? 'ACCEPT COMMISSION'
                        : 'SUBMIT TO JURY'}
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="label-mono text-ink-500">{label}</span>
        {hint && <span className="label-mono text-ink-500">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
