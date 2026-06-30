'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { ConnectWalletCard } from '@/components/ConnectWalletCard';
import { useFreighter } from '@/hooks/useFreighter';
import { useStellarAccount } from '@/hooks/useStellarAccount';
import { useZakatPayment } from '@/hooks/useZakatPayment';
import { api } from '@/lib/api';
import type { LembagaAmil } from '@/types';

/** Muzakki dashboard: balances + pay zakat. */
function DashboardContent() {
  const searchParams = useSearchParams();
  const { isConnected, publicKey } = useFreighter();
  const { account, addUSDCTrustline } = useStellarAccount(publicKey);
  const { sendZakat, status, error, txHash, explorerUrl, reset } =
    useZakatPayment();

  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState<'XLM' | 'USDC'>('USDC');
  const [memo, setMemo] = useState('ZAKAT-MAL-2024');
  const [lembaga, setLembaga] = useState<LembagaAmil[]>([]);
  const [selectedLembaga, setSelectedLembaga] = useState('');

  // Prefill the destination when arriving from a lembaga detail page.
  const prefillTo = searchParams.get('to');
  const prefillName = searchParams.get('name');
  useEffect(() => {
    if (prefillTo) setToAddress(prefillTo);
  }, [prefillTo]);

  // Load institutions for the inline selector.
  useEffect(() => {
    api
      .listLembaga()
      .then((res) => setLembaga(res.lembaga.filter((l) => l.stellarAddress)))
      .catch(() => {
        /* selector is optional; ignore load failures */
      });
  }, []);

  const onSelectLembaga = (id: string) => {
    setSelectedLembaga(id);
    const match = lembaga.find((l) => l.id === id);
    if (match) setToAddress(match.stellarAddress);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;
    try {
      await sendZakat({ fromAddress: publicKey, toAddress, amount, asset, memo });
    } catch {
      /* error surfaced via hook state */
    }
  };

  return (
    <>
      <Nav />
      <main className="container" style={{ padding: '56px 24px 80px' }}>
        <div className="eyebrow">DASHBOARD MUZAKKI</div>
        <h2 className="section" style={{ marginTop: 10, marginBottom: 28 }}>
          Salurkan zakat Anda
        </h2>

        {!isConnected ? (
          <ConnectWalletCard message="Hubungkan wallet Freighter untuk memulai." />
        ) : (
          <div className="grid grid-2">
            <div className="card card-glass">
              <div className="row">
                <div className="label">Saldo Anda</div>
                <span className="badge-testnet">● Testnet</span>
              </div>
              <div className="row" style={{ marginTop: 18, justifyContent: 'flex-start', gap: 48 }}>
                <div>
                  <div className="stat">{account?.xlmBalance ?? '0'}</div>
                  <div className="muted" style={{ fontSize: 13 }}>XLM</div>
                </div>
                <div>
                  <div className="stat stat-gold">{account?.usdcBalance ?? '0'}</div>
                  <div className="muted" style={{ fontSize: 13 }}>USDC</div>
                </div>
              </div>
              {account && !account.hasTrustline && (
                <>
                  <div className="alert alert-warn">
                    USDC trustline belum ditambahkan. Tambahkan dulu untuk
                    menerima &amp; mengirim USDC.
                  </div>
                  <button
                    className="btn btn-primary btn-block"
                    onClick={() => void addUSDCTrustline()}
                  >
                    Tambahkan USDC Trustline
                  </button>
                </>
              )}
            </div>

            <div className="card">
              <div className="label">Bayar Zakat</div>
              {prefillName && (
                <div className="alert" style={{ background: 'var(--panel-2)', marginTop: 12 }}>
                  Tujuan: <b>{prefillName}</b>
                </div>
              )}
              <form onSubmit={onSubmit} style={{ marginTop: 12 }}>
                {lembaga.length > 0 && (
                  <div className="field">
                    <label>Pilih lembaga (opsional)</label>
                    <select
                      className="select"
                      value={selectedLembaga}
                      onChange={(e) => onSelectLembaga(e.target.value)}
                    >
                      <option value="">— Masukkan alamat manual —</option>
                      {lembaga.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                          {l.isVerified ? ' ✓' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="field">
                  <label>Alamat Amil (tujuan)</label>
                  <input
                    className="input mono"
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    placeholder="G..."
                    required
                  />
                </div>
                <div className="field">
                  <label>Jumlah</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.0000001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>Aset</label>
                  <select
                    className="select"
                    value={asset}
                    onChange={(e) => setAsset(e.target.value as 'XLM' | 'USDC')}
                  >
                    <option value="USDC">USDC</option>
                    <option value="XLM">XLM</option>
                  </select>
                </div>
                <div className="field">
                  <label>Memo (jenis zakat)</label>
                  <input
                    className="input"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    maxLength={28}
                  />
                </div>

                <div
                  className="row"
                  style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}
                >
                  <span>Estimasi fee jaringan</span>
                  <span className="mono">~0.00001 XLM</span>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {status === 'success' && txHash && (
                  <div className="alert alert-success">
                    Berhasil!{' '}
                    <a href={explorerUrl ?? '#'} target="_blank" rel="noreferrer">
                      Lihat di Stellar Expert ↗
                    </a>
                  </div>
                )}

                <button
                  className="btn btn-primary btn-block"
                  type="submit"
                  disabled={
                    status === 'building' ||
                    status === 'signing' ||
                    status === 'submitting'
                  }
                >
                  {status === 'idle' || status === 'success' || status === 'failed'
                    ? 'Kirim Zakat'
                    : status === 'building'
                      ? 'Menyiapkan…'
                      : status === 'signing'
                        ? 'Menunggu tanda tangan…'
                        : 'Mengirim…'}
                </button>
                {status === 'success' && (
                  <button
                    type="button"
                    className="btn btn-block"
                    style={{ marginTop: 8 }}
                    onClick={reset}
                  >
                    Kirim Lagi
                  </button>
                )}
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
