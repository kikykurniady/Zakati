'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { LembagaAmil } from '@/types';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

const fmtUsdc = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString('id-ID', { maximumFractionDigits: 2 })
    : '0';
};

/** Persentase dana yang sudah tersalurkan dari yang terkumpul. */
const persenTersalurkan = (l: LembagaAmil) => {
  const masuk = Number(l.totalTerkumpul);
  const keluar = Number(l.totalTerdistribusi);
  if (!Number.isFinite(masuk) || masuk <= 0) return 0;
  return Math.min(100, Math.round((keluar / masuk) * 100));
};

/** Browse registered Amil institutions, campaign-card style. */
export default function LembagaListPage() {
  const [lembaga, setLembaga] = useState<LembagaAmil[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listLembaga()
      .then((res) => setLembaga(res.lembaga))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Gagal memuat lembaga.'),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="container" style={{ padding: '56px 24px 80px' }}>
      <div className="eyebrow">LEMBAGA AMIL</div>
      <h2 className="section" style={{ marginTop: 10, marginBottom: 8 }}>
        Pilih lembaga amil terpercaya
      </h2>
      <p className="muted" style={{ marginTop: 0, marginBottom: 28, maxWidth: 560 }}>
        Angka terkumpul &amp; tersalurkan diambil langsung dari blockchain —
        bukan klaim lembaga.
      </p>

      {loading && <p className="muted">Memuat…</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && lembaga.length === 0 && (
        <p className="muted">Belum ada lembaga terdaftar.</p>
      )}

      <div className="grid grid-2">
        {lembaga.map((l) => {
          const persen = persenTersalurkan(l);
          return (
            <div key={l.id} className="card card-hover">
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div className="lembaga-avatar">{initials(l.name)}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row" style={{ gap: 10 }}>
                    <div style={{ fontWeight: 700 }}>{l.name}</div>
                    {l.isVerified ? (
                      <span className="badge-live">
                        <span className="dot" /> Terverifikasi
                      </span>
                    ) : (
                      <span className="badge-testnet">Belum diverifikasi</span>
                    )}
                  </div>
                  <p className="muted" style={{ margin: '8px 0 0', fontSize: 14 }}>
                    {l.description || '—'}
                  </p>
                </div>
              </div>

              <div className="lembaga-stats">
                <div>
                  <div className="stat-num stat-gold">
                    {fmtUsdc(l.totalTerkumpul)} <span style={{ fontSize: 12 }}>USDC</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>Terkumpul</div>
                </div>
                <div>
                  <div className="stat-num">
                    {fmtUsdc(l.totalTerdistribusi)} <span style={{ fontSize: 12 }}>USDC</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>Tersalurkan</div>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="row" style={{ fontSize: 12 }}>
                  <span className="muted">Penyaluran ke mustahiq</span>
                  <span className="mono">{persen}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${persen}%` }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                {l.stellarAddress && (
                  <Link
                    href={`/dashboard?to=${l.stellarAddress}&name=${encodeURIComponent(l.name)}`}
                    className="btn btn-primary"
                    style={{ flex: 1, textAlign: 'center' }}
                  >
                    Salurkan Zakat
                  </Link>
                )}
                <Link href={`/lembaga/${l.id}`} className="btn" style={{ flex: 1, textAlign: 'center' }}>
                  Lihat Detail
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
