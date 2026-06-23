'use client';

import { useState } from 'react';
import { Nav } from '@/components/Nav';
import { api, type TrackerResponse } from '@/lib/api';
import { getAccountExplorerUrl } from '@/lib/stellar/config';

/** Per-transaction verification state, keyed by txHash. */
type VerifyState = 'pending' | 'valid' | 'invalid';

/** Public transaction tracker for any Stellar address. */
export default function TrackerPage() {
  const [address, setAddress] = useState('');
  const [data, setData] = useState<TrackerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState<Record<string, VerifyState>>({});

  /** Cross-check each tx against the backend verify endpoint (memo + status). */
  const verifyAll = (txs: TrackerResponse['transactions']) => {
    setVerified(Object.fromEntries(txs.map((tx) => [tx.txHash, 'pending'])));
    txs.forEach((tx) => {
      api
        .verifyTx(tx.txHash)
        .then((res) =>
          setVerified((prev) => ({
            ...prev,
            [tx.txHash]: res.isValid ? 'valid' : 'invalid',
          })),
        )
        .catch(() =>
          setVerified((prev) => ({ ...prev, [tx.txHash]: 'invalid' })),
        );
    });
  };

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    setVerified({});
    try {
      const result = await api.getTracker(address.trim());
      setData(result);
      verifyAll(result.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav />
      <main className="container" style={{ padding: '56px 24px 80px' }}>
        <span className="badge-live">
          <span className="dot" /> Verified on Stellar
        </span>
        <h2 className="section" style={{ marginTop: 14, marginBottom: 8 }}>
          Tracker Transparansi
        </h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 24, maxWidth: 560 }}>
          Masukkan alamat Stellar mana pun untuk melihat aliran zakat — data
          diambil langsung dari blockchain, tanpa modifikasi.
        </p>

        <form
          onSubmit={onSearch}
          style={{ display: 'flex', gap: 12, marginBottom: 32, alignItems: 'flex-end' }}
        >
          <input
            className="input mono"
            placeholder="Masukkan alamat Stellar (G...)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Memuat…' : 'Lacak'}
          </button>
        </form>

        {error && <div className="alert alert-error">{error}</div>}

        {data && (
          <>
            <div className="grid grid-3" style={{ marginBottom: 24 }}>
              <div className="card">
                <div className="label">Total Masuk</div>
                <div className="stat" style={{ color: 'var(--success)' }}>
                  {data.stats.totalMasuk}
                </div>
              </div>
              <div className="card">
                <div className="label">Total Keluar</div>
                <div className="stat" style={{ color: 'var(--accent)' }}>
                  {data.stats.totalKeluar}
                </div>
              </div>
              <div className="card">
                <div className="label">Jumlah Transaksi</div>
                <div className="stat">{data.stats.jumlahTransaksi}</div>
              </div>
            </div>

            <div className="card">
              <div className="row">
                <div className="label">Riwayat Transaksi</div>
                <a
                  className="muted"
                  href={getAccountExplorerUrl(address.trim())}
                  target="_blank"
                  rel="noreferrer"
                >
                  Lihat akun ↗
                </a>
              </div>
              <div style={{ marginTop: 12 }}>
                {data.transactions.length === 0 && (
                  <p className="muted">Belum ada transaksi.</p>
                )}
                {data.transactions.map((tx) => (
                  <div className="tx-row" key={tx.txHash}>
                    <div>
                      <div
                        className="mono"
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        {tx.from.slice(0, 4)}… → {tx.to.slice(0, 4)}…
                        {verified[tx.txHash] === 'valid' && (
                          <span className="badge-live" title="Memo & status cocok dengan transfer Zakati">
                            <span className="dot" /> Terverifikasi Zakati
                          </span>
                        )}
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {tx.memo || '—'} ·{' '}
                        {new Date(tx.timestamp).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono">
                        {tx.amount} {tx.asset}
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
      </main>
    </>
  );
}
