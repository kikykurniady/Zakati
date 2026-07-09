'use client';

import { useState } from 'react';
import { ConnectWalletCard } from '@/components/ConnectWalletCard';
import { useFreighter } from '@/hooks/useFreighter';
import { useBatchDistribution } from '@/hooks/useBatchDistribution';
import { ASNAF } from '@/lib/asnaf';
import { api } from '@/lib/api';
import type { BatchDistributionInput } from '@/types';

interface RecipientRow {
  address: string;
  amount: string;
  name: string;
  /** Asnaf code; required only when distributing zakat funds. */
  asnaf: string;
}

/** Fund being distributed. Only zakat is restricted to the eight asnaf. */
type FundKind = 'zakat' | 'infaq' | 'sedekah';

const EMPTY_ROW: RecipientRow = { address: '', amount: '', name: '', asnaf: '' };

/** Amil dashboard: batch-distribute to Mustahiq. */
export default function AmilPage() {
  const { isConnected, publicKey } = useFreighter();
  const { distribute, preview, reset, status, progress, results, issues, error } =
    useBatchDistribution();

  const [fundKind, setFundKind] = useState<FundKind>('zakat');
  const [rows, setRows] = useState<RecipientRow[]>([{ ...EMPTY_ROW }]);
  const [asnafIssues, setAsnafIssues] = useState<
    { index: number; reason: string }[]
  >([]);
  const [previewData, setPreviewData] = useState<{
    batchCount: number;
    totalAmount: string;
    estimatedFee: string;
    recipientCount: number;
  } | null>(null);

  // Any edit to the recipient list invalidates a prior preview/result/validation.
  const clearOutputs = () => {
    setPreviewData(null);
    setAsnafIssues([]);
    reset();
  };

  const updateRow = (i: number, key: keyof RecipientRow, value: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
    clearOutputs();
  };
  const addRow = () => {
    setRows((p) => [...p, { ...EMPTY_ROW }]);
    clearOutputs();
  };
  const removeRow = (i: number) => {
    setRows((p) => p.filter((_, idx) => idx !== i));
    clearOutputs();
  };

  // Rows are passed to the hook 1:1 (no filtering) so issue indices from
  // validation line up exactly with the rows rendered on screen.
  const issueFor = (rowIndex: number) =>
    issues?.find((iss) => iss.index === rowIndex) ??
    asnafIssues.find((iss) => iss.index === rowIndex);
  const senderIssue = issues?.find((iss) => iss.index === -1);

  // Hak amil: the amil's own share of zakat is capped at 1/8 (12.5%). Sum the
  // portion allocated to AMIL-asnaf recipients and flag when it exceeds that.
  const MAX_AMIL_SHARE = 0.125;
  const totalAmount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const amilAmount = rows
    .filter((r) => r.asnaf === 'AMIL')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const amilPercent = totalAmount > 0 ? (amilAmount / totalAmount) * 100 : 0;
  const amilShareExceeded =
    fundKind === 'zakat' && amilAmount > totalAmount * MAX_AMIL_SHARE;

  const buildInput = (): BatchDistributionInput => ({
    senderAddress: publicKey ?? '',
    recipients: rows.map((r) => ({ address: r.address, amount: r.amount, name: r.name })),
  });

  const onPreview = async () => {
    try {
      setPreviewData(
        await preview({
          senderAddress: publicKey ?? '',
          recipients: rows.filter((r) => r.address && r.amount),
        }),
      );
    } catch {
      /* surfaced via hook */
    }
  };

  const onDistribute = async () => {
    // Business rule: zakat may only be distributed to one of the eight asnaf.
    if (fundKind === 'zakat') {
      const missing = rows
        .map((r, index) => ({ r, index }))
        .filter(({ r }) => r.address && !r.asnaf)
        .map(({ index }) => ({ index, reason: 'Pilih golongan asnaf penerima zakat.' }));
      if (missing.length > 0) {
        setAsnafIssues(missing);
        return;
      }
      // Enforce the 1/8 hak-amil cap (the banner above explains the overage).
      if (amilShareExceeded) return;
    }
    setAsnafIssues([]);

    // Record each recipient's asnaf so it's auditable and shown on /mustahiq.
    // Best-effort — a failed registration must not block the on-chain payout.
    if (fundKind === 'zakat') {
      void Promise.all(
        rows
          .filter((r) => r.address && r.asnaf)
          .map((r) =>
            api
              .registerMustahiq({
                stellarAddress: r.address,
                asnaf: r.asnaf,
                name: r.name,
              })
              .catch(() => undefined),
          ),
      );
    }

    await distribute(buildInput());
  };

  return (
    <>
      <main className="container" style={{ padding: '56px 24px 80px' }}>
        <div className="eyebrow">DASHBOARD AMIL</div>
        <h2 className="section" style={{ marginTop: 10, marginBottom: 28 }}>
          Distribusi batch ke Mustahiq
        </h2>

        {!isConnected ? (
          <ConnectWalletCard message="Hubungkan wallet Amil untuk mendistribusikan." />
        ) : (
          <div className="card">
            <div className="field">
              <label>Jenis dana</label>
              <select
                className="select"
                value={fundKind}
                onChange={(e) => {
                  setFundKind(e.target.value as FundKind);
                  clearOutputs();
                }}
              >
                <option value="zakat">Zakat</option>
                <option value="infaq">Infaq</option>
                <option value="sedekah">Sedekah</option>
              </select>
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                {fundKind === 'zakat'
                  ? 'Zakat hanya boleh disalurkan kepada 8 golongan (asnaf). Pilih asnaf tiap penerima.'
                  : 'Infaq/sedekah bersifat sukarela — tidak dibatasi golongan asnaf.'}
              </div>
            </div>

            <div className="label" style={{ marginTop: 20 }}>
              Daftar Penerima (Mustahiq)
            </div>
            <div style={{ marginTop: 16 }}>
              {rows.map((row, i) => {
                const rowIssue = issueFor(i);
                return (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                      {fundKind === 'zakat' && (
                        <select
                          className="select"
                          style={{ width: 150 }}
                          value={row.asnaf}
                          onChange={(e) => updateRow(i, 'asnaf', e.target.value)}
                        >
                          <option value="">— Asnaf —</option>
                          {ASNAF.map((a) => (
                            <option key={a.kode} value={a.kode}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                      )}
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
                    {rowIssue && (
                      <div
                        className="muted"
                        style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}
                      >
                        ⚠ {rowIssue.reason}
                      </div>
                    )}
                  </div>
                );
              })}
              <button className="btn" type="button" onClick={addRow}>
                + Tambah Penerima
              </button>
            </div>

            {fundKind === 'zakat' && amilAmount > 0 && (
              <div
                className={`alert ${amilShareExceeded ? 'alert-warn' : ''}`}
                style={
                  amilShareExceeded
                    ? { marginTop: 16 }
                    : { background: 'var(--panel-2)', marginTop: 16 }
                }
              >
                Porsi amil: <b>{amilPercent.toFixed(1)}%</b> dari total (batas ~12,5%).
                {amilShareExceeded && (
                  <div className="muted" style={{ marginTop: 4 }}>
                    Melebihi batas hak amil 1/8. Kurangi porsi bagian amil.
                  </div>
                )}
              </div>
            )}

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

            {senderIssue && (
              <div className="alert alert-warn" style={{ marginTop: 12 }}>
                Wallet Amil: {senderIssue.reason}
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
