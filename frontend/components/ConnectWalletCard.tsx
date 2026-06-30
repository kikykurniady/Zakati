'use client';

import { useFreighter } from '@/hooks/useFreighter';

/**
 * Connect-wallet prompt shown on role pages before a wallet is linked.
 *
 * Surfaces the connection error (network mismatch, extension missing, user
 * rejection) which was previously swallowed into state and never rendered, so
 * a failed connect looked like the button doing nothing.
 */
export function ConnectWalletCard({ message }: { message: string }) {
  const { connectWallet, isLoading, error, isFreighterInstalled } = useFreighter();

  return (
    <div className="card card-glass" style={{ textAlign: 'center', padding: 48 }}>
      <p className="muted" style={{ marginTop: 0 }}>
        {message}
      </p>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={() => void connectWallet()}
        disabled={isLoading}
      >
        {isLoading ? 'Menghubungkan…' : 'Connect Wallet'}
      </button>

      <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
        {!isFreighterInstalled && (
          <>
            Belum ada Freighter?{' '}
            <a href="https://www.freighter.app/" target="_blank" rel="noreferrer">
              Install ↗
            </a>
            {' · '}
          </>
        )}
        Pastikan jaringan Freighter diatur ke <b>Test Net</b>.
      </p>
    </div>
  );
}
