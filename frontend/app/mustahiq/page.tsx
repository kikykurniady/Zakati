'use client';

import { useCallback, useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';
import { ConnectWalletCard } from '@/components/ConnectWalletCard';
import { useFreighter } from '@/hooks/useFreighter';
import { api, type TrackerResponse } from '@/lib/api';
import { getAccountExplorerUrl } from '@/lib/stellar/config';

/** Mustahiq dashboard: funds received on-chain for the connected wallet. */
export default function MustahiqPage() {
  const { isConnected, publicKey } = useFreighter();
  const [data, setData] = useState<TrackerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (address: string) => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.getTracker(address));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (publicKey) void load(publicKey);
  }, [publicKey, load]);

  const incoming = data?.transactions.filter((tx) => tx.to === publicKey) ?? [];

  return (
    <>
      <Nav />
      <main className="container" style={{ padding: '56px 24px 80px' }}>
        <div className="eyebrow">DASHBOARD MUSTAHIQ</div>
        <h2 className="section" style={{ marginTop: 10, marginBottom: 28 }}>
          Dana yang Anda terima
        </h2>

        {!isConnected ? (
          <ConnectWalletCard message="Hubungkan wallet untuk melihat dana zakat yang Anda terima." />
        ) : (
          <>
            {error && <div className="alert alert-error">{error}</div>}
            {loading && <p className="muted">Memuat…</p>}

            {data && (
              <>
                <div className="grid grid-3" style={{ marginBottom: 24 }}>
                  <div className="card">
                    <div className="label">Total Diterima</div>
                    <div className="stat" style={{ color: 'var(--success)' }}>
                      {data.stats.totalMasuk}
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>USDC</div>
                  </div>
                  <div className="card">
                    <div className="label">Saldo Saat Ini</div>
                    <div className="stat">{data.stats.saldo}</div>
                    <div className="muted" style={{ fontSize: 13 }}>USDC</div>
                  </div>
                  <div className="card">
                    <div className="label">Penerimaan</div>
                    <div className="stat">{incoming.length}</div>
                    <div className="muted" style={{ fontSize: 13 }}>transaksi</div>
                  </div>
                </div>

                <div className="card">
                  <div className="row">
                    <div className="label">Riwayat Penerimaan</div>
                    <a
                      className="muted"
                      href={getAccountExplorerUrl(publicKey ?? '')}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Lihat akun ↗
                    </a>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    {incoming.length === 0 && (
                      <p className="muted">Belum ada dana yang diterima.</p>
                    )}
                    {incoming.map((tx) => (
                      <div className="tx-row" key={tx.txHash}>
                        <div>
                          <div className="mono">dari {tx.from.slice(0, 6)}…</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {tx.memo || '—'} ·{' '}
                            {new Date(tx.timestamp).toLocaleString('id-ID')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="mono" style={{ color: 'var(--success)' }}>
                            +{tx.amount} {tx.asset}
                          </div>
                          <a
                            className="muted"
                            style={{ fontSize: 12 }}
                            href={tx.stellarExpertUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Verifikasi ↗
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
