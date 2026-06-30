'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { api, type LembagaDetailResponse } from '@/lib/api';
import { getAccountExplorerUrl } from '@/lib/stellar/config';

/** Institution detail with live on-chain totals + a donate shortcut. */
export default function LembagaDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [data, setData] = useState<LembagaDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .getLembaga(id)
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Gagal memuat lembaga.'),
      )
      .finally(() => setLoading(false));
  }, [id]);

  const onDonate = () => {
    if (!data?.lembaga.stellarAddress) return;
    const q = new URLSearchParams({
      to: data.lembaga.stellarAddress,
      name: data.lembaga.name,
    });
    router.push(`/dashboard?${q.toString()}`);
  };

  return (
    <>
      <Nav />
      <main className="container" style={{ padding: '56px 24px 80px' }}>
        {loading && <p className="muted">Memuat…</p>}
        {error && <div className="alert alert-error">{error}</div>}

        {data && (
          <>
            <div className="row">
              <div>
                <div className="eyebrow">LEMBAGA AMIL</div>
                <h2 className="section" style={{ marginTop: 10, marginBottom: 6 }}>
                  {data.lembaga.name}
                </h2>
              </div>
              {data.lembaga.isVerified ? (
                <span className="badge-live">
                  <span className="dot" /> Terverifikasi
                </span>
              ) : (
                <span className="badge-testnet">Belum diverifikasi</span>
              )}
            </div>
            <p className="muted" style={{ marginTop: 0, marginBottom: 24, maxWidth: 600 }}>
              {data.lembaga.description || '—'}
            </p>

            <div className="grid grid-3" style={{ marginBottom: 24 }}>
              <div className="card">
                <div className="label">Total Terkumpul</div>
                <div className="stat" style={{ color: 'var(--success)' }}>
                  {data.stats.totalTerkumpul}
                </div>
                <div className="muted" style={{ fontSize: 13 }}>USDC</div>
              </div>
              <div className="card">
                <div className="label">Total Terdistribusi</div>
                <div className="stat" style={{ color: 'var(--accent)' }}>
                  {data.stats.totalTerdistribusi}
                </div>
                <div className="muted" style={{ fontSize: 13 }}>USDC</div>
              </div>
              <div className="card">
                <div className="label">Saldo</div>
                <div className="stat">{data.stats.saldo}</div>
                <div className="muted" style={{ fontSize: 13 }}>USDC</div>
              </div>
            </div>

            <div className="card">
              {data.lembaga.stellarAddress ? (
                <>
                  <div className="row">
                    <div className="label">Alamat Stellar</div>
                    <a
                      className="muted"
                      href={getAccountExplorerUrl(data.lembaga.stellarAddress)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Lihat akun ↗
                    </a>
                  </div>
                  <div className="mono" style={{ marginTop: 8, wordBreak: 'break-all' }}>
                    {data.lembaga.stellarAddress}
                  </div>
                  <button
                    className="btn btn-primary btn-block"
                    style={{ marginTop: 20 }}
                    onClick={onDonate}
                  >
                    Salurkan zakat ke lembaga ini
                  </button>
                </>
              ) : (
                <p className="muted">
                  Lembaga ini belum menautkan alamat Stellar, sehingga belum dapat
                  menerima zakat.
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
