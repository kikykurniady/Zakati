'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BuktiSetor } from '@/components/BuktiSetor';
import { ConnectWalletCard } from '@/components/ConnectWalletCard';
import { RiwayatZakat } from '@/components/RiwayatZakat';
import { useAnchorDeposit } from '@/hooks/useAnchorDeposit';
import { useEscrow } from '@/hooks/useEscrow';
import { useFreighter } from '@/hooks/useFreighter';
import { useHarga, usdcToIdrLabel } from '@/hooks/useHarga';
import { useStellarAccount } from '@/hooks/useStellarAccount';
import { useZakatPayment } from '@/hooks/useZakatPayment';
import { api } from '@/lib/api';
import {
  CUSTOM_NIAT,
  CUSTOM_ZAKAT_TYPE_ID,
  ZAKAT_TYPES,
  memoForZakatType,
} from '@/lib/zakatTypes';
import type { LembagaAmil } from '@/types';

/** Muzakki dashboard: balances + pay zakat. */
function DashboardContent() {
  const searchParams = useSearchParams();
  const { isConnected, publicKey } = useFreighter();
  const { account, addUSDCTrustline, refresh: refreshAccount } =
    useStellarAccount(publicKey);
  const {
    status: depositStatus,
    error: depositError,
    interactiveUrl,
    start: startDeposit,
  } = useAnchorDeposit(refreshAccount);
  const { sendZakat, status, error, txHash, explorerUrl, reset } =
    useZakatPayment();
  const escrow = useEscrow();
  const { kursUsdIdr, live: kursLive } = useHarga();

  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState<'XLM' | 'USDC'>('USDC');
  const [zakatTypeId, setZakatTypeId] = useState(ZAKAT_TYPES[0].id);
  const [customMemo, setCustomMemo] = useState('');
  // Niat (intention) is a rukun of zakat — the muzakki must affirm it before
  // paying. Re-required whenever the payment type changes.
  const [niatConfirmed, setNiatConfirmed] = useState(false);

  const selectedType = ZAKAT_TYPES.find((t) => t.id === zakatTypeId) ?? null;
  const memo = selectedType ? memoForZakatType(selectedType) : customMemo;
  const niatText = selectedType?.niat ?? CUSTOM_NIAT;
  const [lembaga, setLembaga] = useState<LembagaAmil[]>([]);
  const [selectedLembaga, setSelectedLembaga] = useState('');

  // Prefill the destination when arriving from a lembaga detail page.
  const prefillTo = searchParams.get('to');
  const prefillName = searchParams.get('name');
  useEffect(() => {
    if (prefillTo) setToAddress(prefillTo);
  }, [prefillTo]);

  // Prefill type + amount when arriving from the zakat calculator.
  const prefillJenis = searchParams.get('jenis');
  const prefillAmount = searchParams.get('amount');
  useEffect(() => {
    if (prefillJenis && ZAKAT_TYPES.some((t) => t.id === prefillJenis)) {
      setZakatTypeId(prefillJenis);
    }
    if (prefillAmount && Number(prefillAmount) > 0) {
      setAmount(prefillAmount);
      setAsset('USDC');
    }
  }, [prefillJenis, prefillAmount]);

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
      <main className="container" style={{ padding: '56px 24px 80px' }}>
        <div className="eyebrow">DASHBOARD MUZAKKI</div>
        <h2 className="section" style={{ marginTop: 10, marginBottom: 28 }}>
          Salurkan zakat Anda
        </h2>

        {!isConnected ? (
          <ConnectWalletCard message="Hubungkan wallet Stellar Anda untuk memulai." />
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

              {account?.hasTrustline && (
                <div style={{ marginTop: 16 }}>
                  <button
                    className="btn btn-block"
                    type="button"
                    onClick={() => void startDeposit()}
                    disabled={
                      depositStatus === 'authenticating' ||
                      depositStatus === 'starting' ||
                      depositStatus === 'awaiting_user' ||
                      depositStatus === 'processing'
                    }
                  >
                    {depositStatus === 'idle' ||
                    depositStatus === 'completed' ||
                    depositStatus === 'failed'
                      ? '↑ Top up saldo (Rupiah → USDC)'
                      : depositStatus === 'authenticating'
                        ? 'Menghubungkan ke anchor…'
                        : depositStatus === 'starting'
                          ? 'Menyiapkan deposit…'
                          : depositStatus === 'processing'
                            ? 'Anchor memproses…'
                            : 'Selesaikan di jendela anchor…'}
                  </button>
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    Top up via anchor Stellar (SEP-24). Di produksi, slot ini
                    diisi anchor IDR lokal — muzakki top up dalam Rupiah.
                  </div>
                  {depositStatus === 'awaiting_user' && interactiveUrl && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      Jendela tidak terbuka?{' '}
                      <a href={interactiveUrl} target="_blank" rel="noreferrer">
                        Buka halaman anchor ↗
                      </a>
                    </div>
                  )}
                  {depositStatus === 'completed' && (
                    <div className="alert alert-success" style={{ marginTop: 8 }}>
                      Top up selesai — saldo USDC diperbarui.
                    </div>
                  )}
                  {depositError && (
                    <div className="alert alert-error" style={{ marginTop: 8 }}>
                      {depositError}
                    </div>
                  )}
                </div>
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
                  {asset === 'USDC' && usdcToIdrLabel(amount, kursUsdIdr) && (
                    <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                      {usdcToIdrLabel(amount, kursUsdIdr)}
                      {kursLive ? ' (kurs real-time)' : ' (kurs perkiraan)'}
                    </div>
                  )}
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
                  <label>Jenis pembayaran</label>
                  <select
                    className="select"
                    value={zakatTypeId}
                    onChange={(e) => {
                      setZakatTypeId(e.target.value);
                      setNiatConfirmed(false);
                    }}
                  >
                    {ZAKAT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                    <option value={CUSTOM_ZAKAT_TYPE_ID}>Lainnya (memo bebas)</option>
                  </select>
                  {selectedType ? (
                    <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                      {selectedType.description}
                      <br />
                      Memo on-chain: <span className="mono">{memo}</span>
                    </div>
                  ) : (
                    <input
                      className="input"
                      style={{ marginTop: 8 }}
                      value={customMemo}
                      onChange={(e) => setCustomMemo(e.target.value)}
                      placeholder="Memo (maks. 28 byte)"
                      maxLength={28}
                      required
                    />
                  )}
                </div>

                <div
                  className="row"
                  style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}
                >
                  <span>Estimasi fee jaringan</span>
                  <span className="mono">~0.00001 XLM</span>
                </div>

                <label
                  className="alert"
                  style={{
                    background: 'var(--panel-2)',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={niatConfirmed}
                    onChange={(e) => setNiatConfirmed(e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <span style={{ fontSize: 14 }}>
                    <b>Niat.</b> {niatText}
                  </span>
                </label>

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
                    !niatConfirmed ||
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
                {selectedType && selectedType.id !== 'infaq' && selectedType.id !== 'sedekah' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-block"
                      style={{ marginTop: 8 }}
                      disabled={
                        !niatConfirmed || !amount || escrow.status === 'working'
                      }
                      onClick={() => void escrow.deposit(amount, 'ZAKATMAL')}
                    >
                      {escrow.status === 'working'
                        ? 'Menyetor ke escrow…'
                        : '⛓ Setor ke Escrow on-chain (terjamin kontrak)'}
                    </button>
                    {escrow.status === 'success' && escrow.txHash && (
                      <div className="alert alert-success" style={{ marginTop: 8 }}>
                        Tersetor ke escrow.{' '}
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${escrow.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Lihat ↗
                        </a>
                      </div>
                    )}
                    {escrow.status === 'failed' && escrow.error && (
                      <div className="alert alert-error" style={{ marginTop: 8 }}>
                        {escrow.error}
                      </div>
                    )}
                  </>
                )}

                {status === 'success' && (
                  <button
                    type="button"
                    className="btn btn-block"
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      reset();
                      setNiatConfirmed(false);
                    }}
                  >
                    Kirim Lagi
                  </button>
                )}
              </form>
            </div>
          </div>
        )}

        {status === 'success' && txHash && publicKey && (
          <BuktiSetor
            data={{
              txHash,
              explorerUrl: explorerUrl ?? '#',
              dari: publicKey,
              kepada: toAddress,
              namaLembaga:
                lembaga.find((l) => l.stellarAddress === toAddress)?.name ??
                prefillName ??
                undefined,
              jumlah: amount,
              aset: asset,
              jenisLabel: selectedType?.label ?? 'Lainnya',
              memo,
              tanggal: new Date(),
              kursUsdIdr,
            }}
          />
        )}

        {isConnected && publicKey && <RiwayatZakat publicKey={publicKey} />}
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
