'use client';

import { useEffect, useState } from 'react';
import { fetchPaymentHistory } from '@/lib/stellar/history';
import { useHarga, usdcToIdrLabel } from '@/hooks/useHarga';
import { zakatTypeFromMemo } from '@/lib/zakatTypes';
import type { ZakatTransaction } from '@/types';

const fmtTanggal = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const fmtJumlah = (amount: string) => {
  const n = Number(amount);
  return Number.isFinite(n)
    ? n.toLocaleString('id-ID', { maximumFractionDigits: 2 })
    : amount;
};

/** Riwayat pembayaran zakat keluar dari wallet yang terhubung. */
export function RiwayatZakat({ publicKey }: { publicKey: string }) {
  const [records, setRecords] = useState<ZakatTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { kursUsdIdr } = useHarga();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPaymentHistory({ publicKey, limit: 50 })
      .then(({ records }) => {
        if (cancelled) return;
        setRecords(records.filter((r) => r.from === publicKey));
      })
      .catch(() => {
        if (!cancelled) setError('Riwayat tidak dapat dimuat.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="label">Riwayat Pembayaran Anda</div>

      {loading && <p className="muted" style={{ marginBottom: 0 }}>Memuat riwayat…</p>}
      {error && <p className="muted" style={{ marginBottom: 0 }}>{error}</p>}
      {!loading && !error && records.length === 0 && (
        <p className="muted" style={{ marginBottom: 0 }}>
          Belum ada pembayaran dari wallet ini.
        </p>
      )}

      {records.map((tx) => {
        const jenis = zakatTypeFromMemo(tx.memo);
        return (
          <div className="riwayat-item" key={`${tx.txHash}-${tx.to}`}>
            <span className="chip-jenis">{jenis?.label ?? (tx.memo || 'Transfer')}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>
                {fmtJumlah(tx.amount)} {tx.asset}
                {tx.asset === 'USDC' && usdcToIdrLabel(tx.amount, kursUsdIdr) && (
                  <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>
                    {' '}{usdcToIdrLabel(tx.amount, kursUsdIdr)}
                  </span>
                )}
              </div>
              <div className="muted mono" style={{ fontSize: 12 }}>
                ke {tx.to.slice(0, 6)}…{tx.to.slice(-6)} · {fmtTanggal(tx.timestamp)}
              </div>
            </div>
            <a
              href={tx.stellarExpertUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--accent)', fontSize: 13, whiteSpace: 'nowrap' }}
            >
              Bukti ↗
            </a>
          </div>
        );
      })}
    </div>
  );
}
