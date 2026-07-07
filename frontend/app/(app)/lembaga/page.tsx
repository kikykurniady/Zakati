'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { LembagaAmil } from '@/types';

/** Browse registered Amil institutions before donating. */
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
    <>
      <main className="container" style={{ padding: '56px 24px 80px' }}>
        <div className="eyebrow">LEMBAGA AMIL</div>
        <h2 className="section" style={{ marginTop: 10, marginBottom: 8 }}>
          Pilih lembaga amil terpercaya
        </h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 28, maxWidth: 560 }}>
          Lihat riwayat distribusi on-chain setiap lembaga sebelum menyalurkan
          zakat Anda.
        </p>

        {loading && <p className="muted">Memuat…</p>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && lembaga.length === 0 && (
          <p className="muted">Belum ada lembaga terdaftar.</p>
        )}

        <div className="grid grid-2">
          {lembaga.map((l) => (
            <Link
              key={l.id}
              href={`/lembaga/${l.id}`}
              className="card"
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              <div className="row">
                <div className="label">{l.name}</div>
                {l.isVerified ? (
                  <span className="badge-live">
                    <span className="dot" /> Terverifikasi
                  </span>
                ) : (
                  <span className="badge-testnet">Belum diverifikasi</span>
                )}
              </div>
              <p className="muted" style={{ marginTop: 10 }}>
                {l.description || '—'}
              </p>
              {l.stellarAddress && (
                <div className="mono muted" style={{ fontSize: 12, marginTop: 8 }}>
                  {l.stellarAddress.slice(0, 6)}…{l.stellarAddress.slice(-6)}
                </div>
              )}
              <div style={{ marginTop: 14, color: 'var(--accent)' }}>
                Lihat detail →
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
