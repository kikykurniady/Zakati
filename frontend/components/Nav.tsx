'use client';

import Link from 'next/link';
import { useFreighter } from '@/hooks/useFreighter';

/** Top navigation bar with an inline Freighter connect button. */
export function Nav() {
  const { isConnected, publicKey, isLoading, connectWallet, disconnectWallet } =
    useFreighter();

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand" aria-label="Zakati beranda">
          <span className="brand-mark">Zakati</span>
          <span className="brand-ar">زكاتي</span>
        </Link>

        <div className="nav-links">
          <Link href="/dashboard">Bayar Zakat</Link>
          <Link href="/lembaga">Lembaga</Link>
          <Link href="/amil">Amil</Link>
          <Link href="/mustahiq">Mustahiq</Link>
          <Link href="/tracker">Transparansi</Link>

          {isConnected && publicKey ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge-testnet">● Testnet</span>
              <button
                className="addr-pill"
                onClick={disconnectWallet}
                title={`${publicKey} — klik untuk memutus`}
              >
                {publicKey.slice(0, 4)}…{publicKey.slice(-4)}
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => void connectWallet()}
              disabled={isLoading}
            >
              {isLoading ? 'Menghubungkan…' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
