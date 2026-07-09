import { describe, expect, it } from 'vitest';
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
} from './zakatCalc';

// Parameter tetap agar hasil deterministik, terlepas dari feed real-time.
const P: CalcParams = { hargaEmas: 1_900_000, hargaBeras: 18_000, kursUsdc: 16_500 };
const NISAB_TAHUNAN = NISAB_EMAS_GRAM * P.hargaEmas; // 161.500.000
const NISAB_BULANAN = NISAB_TAHUNAN / 12; // 13.458.333,33…

describe('formatIDR', () => {
  it('mengelompokkan ribuan dengan titik', () => {
    expect(formatIDR(375000)).toBe('Rp375.000');
    expect(formatIDR(161500000)).toBe('Rp161.500.000');
  });
  it('membulatkan pecahan dan menangani nol/negatif', () => {
    expect(formatIDR(0)).toBe('Rp0');
    expect(formatIDR(1234.56)).toBe('Rp1.235');
    expect(formatIDR(-5000)).toBe('-Rp5.000');
  });
});

describe('idrToUsdc', () => {
  it('membulatkan ke atas ke 2 desimal agar zakat tidak kurang', () => {
    // 375.000 / 16.500 = 22,7272… → 22.73
    expect(idrToUsdc(375_000, 16_500)).toBe('22.73');
  });
  it('nilai pas tidak dibulatkan naik', () => {
    expect(idrToUsdc(165_000, 16_500)).toBe('10.00');
  });
  it('kurs nol/negatif menghasilkan "0", bukan Infinity', () => {
    expect(idrToUsdc(100_000, 0)).toBe('0');
    expect(idrToUsdc(100_000, -1)).toBe('0');
  });
});

describe('hitungPenghasilan', () => {
  it('wajib saat total ≥ nisab bulanan, zakat 2,5%', () => {
    const r = hitungPenghasilan(P, { gajiBulanan: 15_000_000, penghasilanLain: 0 });
    expect(r.wajib).toBe(true);
    expect(r.zakatIdr).toBe(375_000);
    expect(r.nisab).toBeCloseTo(NISAB_BULANAN, 5);
  });
  it('penghasilan lain ikut dijumlahkan', () => {
    const r = hitungPenghasilan(P, { gajiBulanan: 10_000_000, penghasilanLain: 5_000_000 });
    expect(r.wajib).toBe(true);
    expect(r.zakatIdr).toBe(375_000);
  });
  it('di bawah nisab → belum wajib, zakat 0', () => {
    const r = hitungPenghasilan(P, { gajiBulanan: 10_000_000, penghasilanLain: 0 });
    expect(r.wajib).toBe(false);
    expect(r.zakatIdr).toBe(0);
  });
  it('tepat di nisab → wajib (batas inklusif)', () => {
    const r = hitungPenghasilan(P, { gajiBulanan: NISAB_BULANAN, penghasilanLain: 0 });
    expect(r.wajib).toBe(true);
  });
});

describe('hitungEmas', () => {
  it('nisab berdasarkan gram, bukan nilai: 85 gr wajib, 84 gr tidak', () => {
    expect(hitungEmas(P, { gramEmas: 85 }).wajib).toBe(true);
    expect(hitungEmas(P, { gramEmas: 84 }).wajib).toBe(false);
  });
  it('zakat = 2,5% dari nilai pasar emas', () => {
    const r = hitungEmas(P, { gramEmas: 100 });
    expect(r.dasarPerhitungan).toBe(190_000_000);
    expect(r.zakatIdr).toBe(4_750_000);
  });
});

describe('hitungTabungan', () => {
  it('hutang jatuh tempo mengurangi dasar perhitungan', () => {
    const r = hitungTabungan(P, { saldo: 200_000_000, hutangJatuhTempo: 10_000_000 });
    expect(r.dasarPerhitungan).toBe(190_000_000);
    expect(r.wajib).toBe(true);
    expect(r.zakatIdr).toBe(4_750_000);
  });
  it('saldo bersih di bawah nisab → belum wajib', () => {
    const r = hitungTabungan(P, { saldo: NISAB_TAHUNAN, hutangJatuhTempo: 1 });
    expect(r.wajib).toBe(false);
  });
});

describe('hitungDagang', () => {
  it('aset lancar dikurangi hutang jangka pendek, tarif 2,5%', () => {
    const r = hitungDagang(P, { asetLancar: 300_000_000, hutangJangkaPendek: 50_000_000 });
    expect(r.dasarPerhitungan).toBe(250_000_000);
    expect(r.zakatIdr).toBe(6_250_000);
  });
});

describe('hitungSaham', () => {
  it('tepat di nisab → wajib', () => {
    const r = hitungSaham(P, { nilaiPortofolio: NISAB_TAHUNAN });
    expect(r.wajib).toBe(true);
    expect(r.zakatIdr).toBe(4_037_500);
  });
  it('sepeser di bawah nisab → belum wajib', () => {
    expect(hitungSaham(P, { nilaiPortofolio: NISAB_TAHUNAN - 1 }).wajib).toBe(false);
  });
});

describe('hitungFitrah', () => {
  it('jumlah jiwa × 2,5 kg beras, tanpa nisab', () => {
    const r = hitungFitrah(P, { jumlahJiwa: 4 });
    expect(r.zakatIdr).toBe(180_000); // 4 × 2,5 × 18.000
    expect(r.wajib).toBe(true);
    expect(r.nisab).toBe(0);
  });
  it('nol jiwa → tidak ada kewajiban', () => {
    expect(hitungFitrah(P, { jumlahJiwa: 0 }).wajib).toBe(false);
  });
});

describe('DEFAULT_PARAMS', () => {
  it('semua nilai default positif', () => {
    expect(DEFAULT_PARAMS.hargaEmas).toBeGreaterThan(0);
    expect(DEFAULT_PARAMS.hargaBeras).toBeGreaterThan(0);
    expect(DEFAULT_PARAMS.kursUsdc).toBeGreaterThan(0);
  });
});
