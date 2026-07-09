'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  DEFAULT_PARAMS,
  NISAB_EMAS_GRAM,
  formatIDR,
  hitungDagang,
  hitungEmas,
  hitungFitrah,
  hitungPenghasilan,
  hitungSaham,
  hitungTabungan,
  idrToUsdc,
  type CalcParams,
  type CalcResult,
} from '@/lib/zakatCalc';

type CalcType = 'penghasilan' | 'fitrah' | 'emas' | 'tabungan' | 'dagang' | 'saham';

const TABS: Array<{ id: CalcType; label: string; zakatTypeId: string }> = [
  { id: 'penghasilan', label: 'Penghasilan', zakatTypeId: 'maal-profesi' },
  { id: 'fitrah', label: 'Fitrah', zakatTypeId: 'fitrah' },
  { id: 'emas', label: 'Emas & Perak', zakatTypeId: 'maal-emas' },
  { id: 'tabungan', label: 'Tabungan', zakatTypeId: 'maal-tabungan' },
  { id: 'dagang', label: 'Perdagangan', zakatTypeId: 'maal-dagang' },
  { id: 'saham', label: 'Saham & Investasi', zakatTypeId: 'maal-saham' },
];

/** Numeric input that tolerates empty string while typing. */
function NumField({ label, value, onChange, suffix }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <div className="field">
      <label>{label}{suffix ? ` (${suffix})` : ''}</label>
      <input
        className="input"
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
      />
    </div>
  );
}

const num = (s: string) => (s === '' ? 0 : Number(s));

type HargaStatus =
  | { state: 'loading' }
  | { state: 'live'; updatedAt: string; stale: boolean }
  | { state: 'manual' };

export default function KalkulatorPage() {
  const [tab, setTab] = useState<CalcType>('penghasilan');

  // Parameter acuan — dimuat real-time dari backend, tetap bisa diubah manual.
  const [hargaEmas, setHargaEmas] = useState(String(DEFAULT_PARAMS.hargaEmas));
  const [hargaBeras, setHargaBeras] = useState(String(DEFAULT_PARAMS.hargaBeras));
  const [kursUsdc, setKursUsdc] = useState(String(DEFAULT_PARAMS.kursUsdc));
  const [hargaStatus, setHargaStatus] = useState<HargaStatus>({ state: 'loading' });

  const muatHarga = () => {
    setHargaStatus({ state: 'loading' });
    api
      .getHarga()
      .then((h) => {
        setHargaEmas(String(h.hargaEmasPerGram));
        setKursUsdc(String(h.kursUsdIdr));
        setHargaStatus({ state: 'live', updatedAt: h.updatedAt, stale: h.stale });
      })
      .catch(() => setHargaStatus({ state: 'manual' }));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(muatHarga, []);

  const params: CalcParams = {
    hargaEmas: num(hargaEmas),
    hargaBeras: num(hargaBeras),
    kursUsdc: num(kursUsdc),
  };

  // Input per jenis.
  const [gaji, setGaji] = useState('');
  const [penghasilanLain, setPenghasilanLain] = useState('');
  const [jiwa, setJiwa] = useState('1');
  const [gramEmas, setGramEmas] = useState('');
  const [saldo, setSaldo] = useState('');
  const [hutangTabungan, setHutangTabungan] = useState('');
  const [asetLancar, setAsetLancar] = useState('');
  const [hutangDagang, setHutangDagang] = useState('');
  const [portofolio, setPortofolio] = useState('');

  const result: CalcResult = useMemo(() => {
    switch (tab) {
      case 'penghasilan':
        return hitungPenghasilan(params, {
          gajiBulanan: num(gaji),
          penghasilanLain: num(penghasilanLain),
        });
      case 'fitrah':
        return hitungFitrah(params, { jumlahJiwa: num(jiwa) });
      case 'emas':
        return hitungEmas(params, { gramEmas: num(gramEmas) });
      case 'tabungan':
        return hitungTabungan(params, {
          saldo: num(saldo),
          hutangJatuhTempo: num(hutangTabungan),
        });
      case 'dagang':
        return hitungDagang(params, {
          asetLancar: num(asetLancar),
          hutangJangkaPendek: num(hutangDagang),
        });
      case 'saham':
        return hitungSaham(params, { nilaiPortofolio: num(portofolio) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, hargaEmas, hargaBeras, kursUsdc, gaji, penghasilanLain, jiwa, gramEmas, saldo, hutangTabungan, asetLancar, hutangDagang, portofolio]);

  const usdc = idrToUsdc(result.zakatIdr, params.kursUsdc);
  const zakatTypeId = TABS.find((t) => t.id === tab)?.zakatTypeId ?? 'maal-profesi';

  return (
    <main className="container" style={{ padding: '56px 24px 80px' }}>
      <div className="eyebrow">KALKULATOR ZAKAT</div>
      <h2 className="section" style={{ marginTop: 10 }}>
        Hitung zakat Anda
      </h2>
      <p className="muted" style={{ maxWidth: 620, marginBottom: 28 }}>
        Perhitungan mengikuti pedoman umum BAZNAS: nisab {NISAB_EMAS_GRAM} gram
        emas, tarif 2,5%. Semua nilai acuan terlihat dan bisa Anda sesuaikan.
      </p>

      <div className="calc-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`calc-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-2">
        <div>
          <div className="card">
            <div className="label">Data {TABS.find((t) => t.id === tab)?.label}</div>
            <div style={{ marginTop: 12 }}>
              {tab === 'penghasilan' && (
                <>
                  <NumField label="Gaji per bulan" suffix="Rp" value={gaji} onChange={setGaji} />
                  <NumField label="Penghasilan lain per bulan" suffix="Rp" value={penghasilanLain} onChange={setPenghasilanLain} />
                </>
              )}
              {tab === 'fitrah' && (
                <NumField label="Jumlah jiwa (diri + tanggungan)" value={jiwa} onChange={setJiwa} />
              )}
              {tab === 'emas' && (
                <NumField label="Emas dimiliki ≥ 1 tahun" suffix="gram" value={gramEmas} onChange={setGramEmas} />
              )}
              {tab === 'tabungan' && (
                <>
                  <NumField label="Saldo tabungan + deposito (1 tahun)" suffix="Rp" value={saldo} onChange={setSaldo} />
                  <NumField label="Hutang jatuh tempo" suffix="Rp" value={hutangTabungan} onChange={setHutangTabungan} />
                </>
              )}
              {tab === 'dagang' && (
                <>
                  <NumField label="Aset lancar usaha (modal + laba + piutang)" suffix="Rp" value={asetLancar} onChange={setAsetLancar} />
                  <NumField label="Hutang jangka pendek" suffix="Rp" value={hutangDagang} onChange={setHutangDagang} />
                </>
              )}
              {tab === 'saham' && (
                <NumField label="Nilai portofolio (1 tahun)" suffix="Rp" value={portofolio} onChange={setPortofolio} />
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="row">
              <div className="label">Nilai acuan (bisa diubah)</div>
              <button
                type="button"
                className="calc-tab"
                onClick={muatHarga}
                disabled={hargaStatus.state === 'loading'}
              >
                {hargaStatus.state === 'loading' ? 'Memuat…' : '↻ Muat ulang'}
              </button>
            </div>
            {hargaStatus.state === 'live' && (
              <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>
                ● Harga real-time{hargaStatus.stale ? ' (snapshot terakhir)' : ''} —
                emas spot dunia &amp; kurs USD/IDR, diperbarui{' '}
                {new Date(hargaStatus.updatedAt).toLocaleTimeString('id-ID')}.
              </p>
            )}
            {hargaStatus.state === 'manual' && (
              <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>
                Harga real-time tidak tersedia (backend mati?) — memakai nilai
                default, silakan sesuaikan manual.
              </p>
            )}
            <div style={{ marginTop: 12 }}>
              <NumField label="Harga emas per gram" suffix="Rp" value={hargaEmas} onChange={setHargaEmas} />
              {tab === 'fitrah' && (
                <NumField label="Harga beras per kg" suffix="Rp" value={hargaBeras} onChange={setHargaBeras} />
              )}
              <NumField label="Kurs 1 USDC" suffix="Rp" value={kursUsdc} onChange={setKursUsdc} />
            </div>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>
              Sesuaikan dengan harga emas Antam &amp; kurs hari ini agar hasil akurat.
            </p>
          </div>
        </div>

        <div className="card card-glass" style={{ alignSelf: 'start' }}>
          <div className="label">Hasil Perhitungan</div>

          <div style={{ margin: '16px 0' }}>
            {result.rincian.map((line) => (
              <div className="calc-result-line" key={line}>{line}</div>
            ))}
          </div>

          {result.wajib ? (
            <>
              <div className="muted" style={{ fontSize: 13 }}>Zakat yang harus ditunaikan</div>
              <div className="calc-zakat-amount">{formatIDR(result.zakatIdr)}</div>
              <div className="muted mono" style={{ fontSize: 13, marginTop: 4 }}>
                ≈ {usdc} USDC (kurs {formatIDR(params.kursUsdc)})
              </div>
              <Link
                href={`/dashboard?jenis=${zakatTypeId}&amount=${usdc}`}
                className="btn btn-primary btn-block"
                style={{ marginTop: 20 }}
              >
                Tunaikan Sekarang → {usdc} USDC
              </Link>
            </>
          ) : (
            <div className="alert" style={{ background: 'var(--panel-2)' }}>
              Belum mencapai nisab — belum wajib zakat. Anda tetap bisa berinfaq
              atau bersedekah berapa pun melalui{' '}
              <Link href="/dashboard" style={{ color: 'var(--accent)' }}>
                halaman pembayaran
              </Link>.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
