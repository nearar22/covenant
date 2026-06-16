'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { CONTRACT_ADDRESS, EXPLORER } from '@/lib/contract';

export function DataError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-danger" />
      <h3 className="font-display text-base text-ink-100">Console data offline</h3>
      <p className="max-w-[44ch] text-sm text-ink-500">{message}</p>
      <div className="flex gap-2">
        <button
          onClick={onRetry}
          className="focusable flex items-center gap-1.5 border border-lime/50 bg-lime/10 px-3 py-1.5 label-mono text-lime hover:bg-lime/20"
        >
          <RefreshCw className="h-3 w-3" /> RETRY
        </button>
        <a
          href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
          className="focusable flex items-center gap-1.5 border border-line px-3 py-1.5 label-mono text-ink-300 hover:text-cyan"
        >
          EXPLORER <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

interface BoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  BoundaryState
> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="panel flex flex-col items-center gap-2 p-6 text-center">
            <AlertTriangle className="h-7 w-7 text-danger" />
            <p className="text-sm text-ink-300">
              This panel hit an error. The rest of the console is unaffected.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="focusable border border-line px-3 py-1.5 label-mono text-ink-300 hover:text-lime"
            >
              RETRY PANEL
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
