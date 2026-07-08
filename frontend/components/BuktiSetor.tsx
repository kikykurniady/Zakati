'use client';

import { usdcToIdrLabel } from '@/hooks/useHarga';

export interface BuktiSetorData {
  txHash: string;
  explorerUrl: string;
  dari: string;
  kepada: string;
  namaLembaga?: string;
  jumlah: string;
  aset: string;
  jenisLabel: string;
  memo: string;
  tanggal: Date;
  kursUsdIdr: number;
}

/**
 * Bukti Setor Zakat — resi pembayaran yang bisa dicetak/disimpan PDF.
 *
 * Tombol cetak memakai window.print(); CSS @media print di globals.css
 * menyembunyikan seluruh halaman kecuali elemen .bukti-setor.
 */
export function BuktiSetor({ data }: { data: BuktiSetorData }) {
  const idr = data.aset === 'USDC' ? usdcToIdrLabel(data.jumlah, data.kursUsdIdr) : '';

  const baris: Array<[string, string]> = [
    ['No. Referensi', data.txHash],
    [
      'Tanggal',
      data.tanggal.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }),
    ],
    ['Muzakki (pengirim)', data.dari],
    ['Lembaga Amil (penerima)', data.namaLembaga ? `${data.namaLembaga} — ${data.kepada}` : data.kepada],
    ['Jenis pembayaran', data.jenisLabel],
    ['Jumlah', `${data.jumlah} ${data.aset}${idr ? ` (${idr})` : ''}`],
    ['Memo on-chain', data.memo],
    ['Jaringan', 'Stellar Testnet'],
  ];

  return (
    <div className="bukti-setor card" style={{ marginTop: 16 }}>
      <div className="row">
        <div>
          <div className="label">BUKTI SETOR ZAKAT</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 20, marginTop: 4 }}>
            Zakati — Your Zakat, Verified
          </div>
        </div>
        <span className="badge-live">
          <span className="dot" /> LUNAS
        </span>
      </div>

      <div style={{ marginTop: 16 }}>
        {baris.map(([k, v]) => (
          <div className="riwayat-item" key={k} style={{ gap: 18 }}>
            <span className="muted" style={{ fontSize: 13, width: 170, flexShrink: 0 }}>{k}</span>
            <span className="mono" style={{ fontSize: 13, wordBreak: 'break-all' }}>{v}</span>
          </div>
        ))}
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
        Bukti ini tercatat permanen di Stellar blockchain dan dapat diverifikasi
        siapa pun tanpa login di{' '}
        <a href={data.explorerUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
          Stellar Expert ↗
        </a>
        . Dokumen testnet — bukan bukti setor resmi untuk pengurang pajak.
      </p>

      <button
        type="button"
        className="btn btn-block no-print"
        style={{ marginTop: 10 }}
        onClick={() => window.print()}
      >
        🖨 Cetak / Simpan PDF
      </button>
    </div>
  );
}
