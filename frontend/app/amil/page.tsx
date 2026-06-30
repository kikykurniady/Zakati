'use client';

import { useState } from 'react';
import { Nav } from '@/components/Nav';
import { ConnectWalletCard } from '@/components/ConnectWalletCard';
import { useFreighter } from '@/hooks/useFreighter';
import { useBatchDistribution } from '@/hooks/useBatchDistribution';
import type { BatchDistributionInput } from '@/types';

interface RecipientRow {
  address: string;
  amount: string;
  name: string;
}

/** Amil dashboard: batch-distribute to Mustahiq. */
export default function AmilPage() {
  const { isConnected, publicKey } = useFreighter();
  const { distribute, preview, status, progress, results, error } =
    useBatchDistribution();

  const [rows, setRows] = useState<RecipientRow[]>([
    { address: '', amount: '', name: '' },
  ]);
  const [previewData, setPreviewData] = useState<{
    batchCount: number;
    totalAmount: string;
    estimatedFee: string;
    recipientCount: number;
  } | null>(null);

  const updateRow = (i: number, key: keyof RecipientRow, value: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  };
  const addRow = () => setRows((p) => [...p, { address: '', amount: '', name: '' }]);
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i));

  const buildInput = (): BatchDistributionInput => ({
    senderAddress: publicKey ?? '',
    recipients: rows.filter((r) => r.address && r.amount),
  });

  const onPreview = async () => {
    try {
      setPreviewData(await preview(buildInput()));
    } catch {
      /* surfaced via hook */
    }
  };

  const onDistribute = async () => {
    await distribute(buildInput());
  };

  return (
    <>
      <Nav />
      <main className="container" style={{ padding: '56px 24px 80px' }}>
        <div className="eyebrow">DASHBOARD AMIL</div>
        <h2 className="section" style={{ marginTop: 10, marginBottom: 28 }}>
          Distribusi batch ke Mustahiq
        </h2>

        {!isConnected ? (
          <ConnectWalletCard message="Hubungkan wallet Amil untuk mendistribusikan." />
        ) : (
          <div className="card">
            <div className="label">Daftar Penerima (Mustahiq)</div>
            <div style={{ marginTop: 16 }}>
              {rows.map((row, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}
                >
                  <input
                    className="input mono"
                    style={{ flex: 2, minWidth: 220 }}
                    placeholder="Alamat G..."
                    value={row.address}
                    onChange={(e) => updateRow(i, 'address', e.target.value)}
                  />
                  <input
                    className="input"
                    style={{ flex: 1, minWidth: 100 }}
                    placeholder="Nama"
                    value={row.name}
                    onChange={(e) => updateRow(i, 'name', e.target.value)}
                  />
                  <input
                    className="input"
                    style={{ width: 120 }}
                    type="number"
                    placeholder="USDC"
                    value={row.amount}
                    onChange={(e) => updateRow(i, 'amount', e.target.value)}
                  />
                  <button className="btn" type="button" onClick={() => removeRow(i)}>
                    ✕
                  </button>
                </div>
              ))}
              <button className="btn" type="button" onClick={addRow}>
                + Tambah Penerima
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn" type="button" onClick={() => void onPreview()}>
                Preview
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void onDistribute()}
                disabled={status === 'signing' || status === 'submitting'}
              >
                Distribusikan
              </button>
            </div>

            {previewData && (
              <div className="alert" style={{ background: 'var(--panel-2)', marginTop: 16 }}>
                {previewData.recipientCount} penerima · total{' '}
                <b>{previewData.totalAmount} USDC</b> · {previewData.batchCount} batch
                (perlu {previewData.batchCount}× tanda tangan) · est. fee{' '}
                {previewData.estimatedFee} XLM
              </div>
            )}

            {(status === 'signing' || status === 'submitting') && (
              <div className="alert" style={{ marginTop: 12 }}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <span>
                    Memproses batch {progress.currentBatch}/{progress.totalBatches}
                  </span>
                  <span className="mono">
                    {progress.current}/{progress.total} penerima
                  </span>
                </div>
                <div className="progress">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${
                        progress.total
                          ? Math.round((progress.current / progress.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {error && <div className="alert alert-error">{error}</div>}

            {results && (
              <div
                className={`alert ${results.success ? 'alert-success' : 'alert-error'}`}
              >
                {results.success ? 'Distribusi selesai. ' : 'Distribusi sebagian. '}
                {results.recipientCount} penerima berhasil, total{' '}
                {results.totalDistributed} USDC dalam {results.txHashes.length} transaksi.
                {results.failedRecipients && (
                  <div className="muted">
                    {results.failedRecipients.length} penerima gagal.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
