'use client';

import { useState } from 'react';
import { API_BASE_URL } from '@/config';
import { useFreighter } from '@/hooks/useFreighter';
import { formatIDR } from '@/lib/zakatCalc';

/**
 * Demo alur pembayaran zakat via escrow Soroban dengan protokol x402
 * (HTTP 402 Payment Required).
 *
 * 1. POST /api/zakat/pay tanpa header → server menjawab 402 + syarat bayar
 *    (kontrak escrow, token IDR, jumlah).
 * 2. Klien menyetor ke escrow lalu mengulang request dengan header X-PAYMENT.
 * 3. Server memverifikasi settlement dan mengembalikan resi.
 *
 * Verifikasi on-chain di server masih disimulasikan (PoC) — protokol 402-nya
 * nyata, kontraknya ter-deploy di testnet.
 */

interface Challenge {
  x402Version: number;
  accepts: Array<{
    scheme: string;
    network: string;
    asset: string;
    amount: string;
    payTo: string;
    extra: { displayAmount: string; currency: string };
  }>;
  error?: string;
}

interface Receipt {
  settled: boolean;
  programId: string;
  amount: string;
  currency: string;
  displayAmount: string;
  txHash: string;
}

const PROGRAM_LIST = [
  { id: 'fitrah-2026', label: 'Zakat Fitrah 2026' },
  { id: 'maal-2026', label: 'Zakat Maal 2026' },
  { id: 'fidyah-2026', label: 'Fidyah 2026' },
];

export default function EscrowPage() {
  const { publicKey } = useFreighter();
  const [programId, setProgramId] = useState(PROGRAM_LIST[0].id);
  const [amount, setAmount] = useState('100000');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = publicKey ?? 'GDEMO-MUZAKKI-TANPA-WALLET';

  /** Langkah 1 — minta tagihan (402 challenge). */
  const mintaTagihan = async () => {
    setBusy(true);
    setError(null);
    setReceipt(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/zakat/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId, amount }),
      });
      const body = (await res.json()) as Challenge & { error?: string };
      if (res.status !== 402) {
        throw new Error(body.error ?? `Respons tidak terduga (${res.status}).`);
      }
      setChallenge(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal meminta tagihan.');
    } finally {
      setBusy(false);
    }
  };

  /** Langkah 2 — setor (disimulasikan) lalu kirim bukti via X-PAYMENT. */
  const bayarDanVerifikasi = async () => {
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      const req = challenge.accepts[0];
      const payload = {
        scheme: req.scheme,
        network: req.network,
        from,
        amount: req.amount,
        programId,
        // PoC: referensi setoran disimulasikan; produksi memakai hash
        // invokasi deposit() kontrak escrow yang sesungguhnya.
        proof: `poc-deposit-${crypto.randomUUID()}`,
      };
      const header = btoa(JSON.stringify(payload));
      const res = await fetch(`${API_BASE_URL}/api/zakat/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-PAYMENT': header },
        body: JSON.stringify({ programId, amount }),
      });
      const body = (await res.json()) as Receipt & { error?: string };
      if (!res.ok || !body.settled) {
        throw new Error(body.error ?? 'Pembayaran ditolak server.');
      }
      setReceipt(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pembayaran gagal.');
    } finally {
      setBusy(false);
    }
  };

  const req = challenge?.accepts[0];

  return (
    <main className="container" style={{ padding: '56px 24px 80px' }}>
      <div className="eyebrow">ESCROW SOROBAN · x402 (PoC)</div>
      <h2 className="section" style={{ marginTop: 10 }}>
        Zakat via Smart Contract Escrow
      </h2>
      <p className="muted" style={{ maxWidth: 640, marginBottom: 8 }}>
        Dana zakat masuk ke kontrak escrow dan hanya bisa dicairkan ke mustahiq
        yang terverifikasi — dibayar dalam <b>Rupiah</b> (token IDR di Stellar).
        Alur memakai protokol <span className="mono">HTTP 402 x402</span>.
      </p>
      <p className="muted" style={{ fontSize: 12, marginBottom: 28 }}>
        ⚠ PoC: protokol 402 dan kontraknya nyata di testnet; verifikasi
        settlement di server masih disimulasikan.
      </p>

      <div className="grid grid-2">
        <div className="card">
          <div className="label">Langkah 1 — Pilih program &amp; jumlah</div>
          <div style={{ marginTop: 12 }}>
            <div className="field">
              <label>Program zakat</label>
              <select
                className="select"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
              >
                {PROGRAM_LIST.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Jumlah (Rp)</label>
              <input
                className="input"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                {Number(amount) > 0 ? formatIDR(Number(amount)) : ''}
              </div>
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={() => void mintaTagihan()}
              disabled={busy || Number(amount) <= 0}
            >
              {busy && !challenge ? 'Meminta…' : 'Minta Tagihan (402)'}
            </button>
          </div>
        </div>

        <div className="card card-glass" style={{ alignSelf: 'start' }}>
          <div className="label">Langkah 2 — Tagihan dari server</div>
          {!challenge && (
            <p className="muted" style={{ marginBottom: 0 }}>
              Belum ada tagihan. Klik “Minta Tagihan” — server akan menjawab
              <span className="mono"> HTTP 402 Payment Required</span>.
            </p>
          )}
          {req && (
            <>
              <div style={{ margin: '14px 0' }}>
                <div className="calc-result-line">Skema: {req.scheme} · {req.network}</div>
                <div className="calc-result-line">
                  Bayar ke escrow: {req.payTo.slice(0, 10)}…{req.payTo.slice(-6)}
                </div>
                <div className="calc-result-line">
                  Token: IDR ({req.asset.slice(0, 10)}…)
                </div>
                <div className="calc-result-line">
                  Tagihan: <b>{req.extra.displayAmount}</b>
                </div>
                <div className="calc-result-line">
                  Muzakki: {from.slice(0, 10)}…{from.slice(-4)}
                </div>
              </div>
              <button
                className="btn btn-primary btn-block"
                onClick={() => void bayarDanVerifikasi()}
                disabled={busy}
              >
                {busy ? 'Memproses…' : 'Setor ke Escrow & Kirim Bukti'}
              </button>
            </>
          )}

          {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}

          {receipt && (
            <div className="alert alert-success" style={{ marginTop: 14 }}>
              ✅ Settled! {receipt.displayAmount} untuk program{' '}
              <b>{receipt.programId}</b>
              <div className="mono" style={{ fontSize: 11, marginTop: 6, wordBreak: 'break-all' }}>
                ref: {receipt.txHash}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
