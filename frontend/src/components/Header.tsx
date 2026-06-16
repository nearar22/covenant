'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Copy, Check, LogOut, ExternalLink, Droplet } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { shortAddr } from '@/lib/format';
import {
  CONTRACT_ADDRESS,
  EXPLORER,
  FAUCET,
  NETWORK_NAME,
} from '@/lib/contract';

export function Header({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
  };

  const connected = !!wallet.address;
  const dotColor = connected && wallet.onRightChain ? 'bg-lime' : 'bg-ink-500';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-base-800/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center border border-lime/50 bg-base-700">
            <Activity className="h-4 w-4 text-lime" />
          </div>
          <div className="leading-none">
            <div className="font-display text-sm font-semibold tracking-tight text-ink-100">
              COVENANT
            </div>
            <div className="label-mono text-ink-500">AGENT REPUTATION CONSOLE</div>
          </div>
        </div>

        <div className="mx-2 hidden h-7 w-px bg-line md:block" />

        <div className="hidden items-center gap-3 md:flex">
          <span className="flex items-center gap-1.5 label-mono text-ink-300">
            <span className={`h-1.5 w-1.5 rounded-full ${dotColor} animate-pulseline`} />
            {NETWORK_NAME}
          </span>
          <button
            onClick={() => copy(CONTRACT_ADDRESS, 'contract')}
            className="focusable flex items-center gap-1.5 font-mono text-[11px] text-ink-300 hover:text-lime"
            aria-label="Copy contract address"
          >
            {copied === 'contract' ? (
              <Check className="h-3 w-3 text-lime" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {shortAddr(CONTRACT_ADDRESS)}
          </button>
          <a
            href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="focusable flex items-center gap-1 label-mono text-ink-300 hover:text-cyan"
          >
            EXPLORER <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="ml-auto">
          {!wallet.hasProvider ? (
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noreferrer"
              className="focusable border border-line px-3 py-1.5 label-mono text-ink-300 hover:border-lime/50 hover:text-lime"
            >
              NO WALLET / GET METAMASK
            </a>
          ) : connected ? (
            <div className="relative">
              <button
                onClick={() => setOpen((o) => !o)}
                className="focusable flex items-center gap-2 border border-line bg-base-700 px-3 py-1.5 hover:border-lime/50"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                <span className="font-mono text-[11px] text-ink-100">
                  {shortAddr(wallet.address!)}
                </span>
              </button>
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 mt-1 w-60 border border-line-bright bg-base-800 p-3 shadow-xl"
                  >
                    {!wallet.onRightChain && (
                      <p className="mb-2 border border-amber/40 bg-amber/5 px-2 py-1 label-mono text-amber">
                        WRONG NETWORK. SWITCH TO BRADBURY.
                      </p>
                    )}
                    <div className="label-mono mb-1 text-ink-500">ACTIVE AGENT</div>
                    <div className="mb-2 break-all font-mono text-[11px] text-ink-100">
                      {wallet.address}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copy(wallet.address!, 'wallet')}
                        className="focusable flex flex-1 items-center justify-center gap-1 border border-line py-1.5 label-mono text-ink-300 hover:text-lime"
                      >
                        {copied === 'wallet' ? (
                          <Check className="h-3 w-3 text-lime" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        COPY
                      </button>
                      <button
                        onClick={() => {
                          wallet.disconnect();
                          setOpen(false);
                        }}
                        className="focusable flex flex-1 items-center justify-center gap-1 border border-line py-1.5 label-mono text-ink-300 hover:text-danger"
                      >
                        <LogOut className="h-3 w-3" /> EXIT
                      </button>
                    </div>
                    <a
                      href={FAUCET}
                      target="_blank"
                      rel="noreferrer"
                      className="focusable mt-2 flex items-center justify-center gap-1.5 border border-line py-1.5 label-mono text-ink-300 hover:border-cyan/50 hover:text-cyan"
                    >
                      <Droplet className="h-3 w-3" /> TESTNET FAUCET
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={wallet.connect}
              disabled={wallet.connecting}
              className="focusable border border-lime/50 bg-lime/10 px-4 py-1.5 label-mono text-lime hover:bg-lime/20 disabled:opacity-50"
            >
              {wallet.connecting ? 'CONNECTING' : 'CONNECT WALLET'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
