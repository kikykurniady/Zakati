/**
 * Perhitungan zakat mengikuti pedoman umum BAZNAS:
 *
 * - Nisab zakat maal  : 85 gram emas, haul 1 tahun, tarif 2,5%.
 * - Zakat penghasilan : nisab 85 gram emas per tahun (≈ 1/12 per bulan),
 *                       tarif 2,5% dari penghasilan bruto (SK BAZNAS).
 * - Zakat fitrah      : 2,5 kg beras per jiwa, atau uang senilai itu
 *                       (SK BAZNAS per wilayah, umumnya Rp45.000–Rp55.000).
 *
 * Harga emas/beras/kurs berubah setiap hari, jadi nilainya adalah parameter
 * yang bisa diubah pengguna — bukan konstanta tersembunyi — agar perhitungan
 * selalu bisa diaudit.
 */

export const ZAKAT_RATE = 0.025;
export const NISAB_EMAS_GRAM = 85;
export const FITRAH_BERAS_KG = 2.5;

/** Nilai acuan default; selalu tampilkan & izinkan pengguna menyuntingnya. */
export const DEFAULT_PARAMS = {
  /** Harga emas murni per gram (IDR). */
  hargaEmas: 1_900_000,
  /** Harga beras per kg untuk fitrah (IDR). */
  hargaBeras: 18_000,
  /** Kurs 1 USDC dalam IDR untuk konversi pembayaran on-chain. */
  kursUsdc: 16_500,
} as const;

export type CalcParams = { hargaEmas: number; hargaBeras: number; kursUsdc: number };

export interface CalcResult {
  /** Total harta/penghasilan yang dihitung (IDR). */
  dasarPerhitungan: number;
  /** Ambang nisab yang berlaku untuk jenis ini (IDR). */
  nisab: number;
  /** Apakah mencapai nisab sehingga wajib zakat. */
  wajib: boolean;
  /** Zakat yang harus dibayar (IDR); 0 jika belum wajib. */
  zakatIdr: number;
  /** Baris-baris rincian perhitungan untuk ditampilkan apa adanya. */
  rincian: string[];
}

export function formatIDR(amount: number): string {
  const rounded = Math.round(amount);
  const negative = rounded < 0;
  const grouped = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}Rp${grouped}`;
}

/** Konversi IDR → USDC dengan 2 desimal (pembulatan ke atas agar tak kurang). */
export function idrToUsdc(idr: number, kursUsdc: number): string {
  if (kursUsdc <= 0) return '0';
  return (Math.ceil((idr / kursUsdc) * 100) / 100).toFixed(2);
}

const nisabTahunan = (p: CalcParams) => NISAB_EMAS_GRAM * p.hargaEmas;

export function hitungPenghasilan(
  p: CalcParams,
  input: { gajiBulanan: number; penghasilanLain: number },
): CalcResult {
  const total = input.gajiBulanan + input.penghasilanLain;
  const nisabBulanan = nisabTahunan(p) / 12;
  const wajib = total >= nisabBulanan;
  const zakat = wajib ? total * ZAKAT_RATE : 0;
  return {
    dasarPerhitungan: total,
    nisab: nisabBulanan,
    wajib,
    zakatIdr: zakat,
    rincian: [
      `Penghasilan sebulan = ${formatIDR(input.gajiBulanan)} + ${formatIDR(input.penghasilanLain)} = ${formatIDR(total)}`,
      `Nisab per bulan = (${NISAB_EMAS_GRAM} gr × ${formatIDR(p.hargaEmas)}) ÷ 12 = ${formatIDR(nisabBulanan)}`,
      wajib
        ? `Zakat = 2,5% × ${formatIDR(total)} = ${formatIDR(zakat)}`
        : 'Penghasilan di bawah nisab — belum wajib zakat.',
    ],
  };
}

export function hitungEmas(p: CalcParams, input: { gramEmas: number }): CalcResult {
  const nilai = input.gramEmas * p.hargaEmas;
  const wajib = input.gramEmas >= NISAB_EMAS_GRAM;
  const zakat = wajib ? nilai * ZAKAT_RATE : 0;
  return {
    dasarPerhitungan: nilai,
    nisab: nisabTahunan(p),
    wajib,
    zakatIdr: zakat,
    rincian: [
      `Nilai emas = ${input.gramEmas} gr × ${formatIDR(p.hargaEmas)} = ${formatIDR(nilai)}`,
      `Nisab = ${NISAB_EMAS_GRAM} gr emas (${formatIDR(nisabTahunan(p))}), haul 1 tahun`,
      wajib
        ? `Zakat = 2,5% × ${formatIDR(nilai)} = ${formatIDR(zakat)}`
        : `Kepemilikan di bawah ${NISAB_EMAS_GRAM} gr — belum wajib zakat.`,
    ],
  };
}

export function hitungTabungan(
  p: CalcParams,
  input: { saldo: number; hutangJatuhTempo: number },
): CalcResult {
  const bersih = input.saldo - input.hutangJatuhTempo;
  const nisab = nisabTahunan(p);
  const wajib = bersih >= nisab;
  const zakat = wajib ? bersih * ZAKAT_RATE : 0;
  return {
    dasarPerhitungan: bersih,
    nisab,
    wajib,
    zakatIdr: zakat,
    rincian: [
      `Saldo bersih = ${formatIDR(input.saldo)} − ${formatIDR(input.hutangJatuhTempo)} = ${formatIDR(bersih)}`,
      `Nisab = ${NISAB_EMAS_GRAM} gr emas = ${formatIDR(nisab)}, haul 1 tahun`,
      wajib
        ? `Zakat = 2,5% × ${formatIDR(bersih)} = ${formatIDR(zakat)}`
        : 'Saldo di bawah nisab — belum wajib zakat.',
    ],
  };
}

export function hitungDagang(
  p: CalcParams,
  input: { asetLancar: number; hutangJangkaPendek: number },
): CalcResult {
  const bersih = input.asetLancar - input.hutangJangkaPendek;
  const nisab = nisabTahunan(p);
  const wajib = bersih >= nisab;
  const zakat = wajib ? bersih * ZAKAT_RATE : 0;
  return {
    dasarPerhitungan: bersih,
    nisab,
    wajib,
    zakatIdr: zakat,
    rincian: [
      `Aset dagang bersih = ${formatIDR(input.asetLancar)} − ${formatIDR(input.hutangJangkaPendek)} = ${formatIDR(bersih)}`,
      `Nisab = ${NISAB_EMAS_GRAM} gr emas = ${formatIDR(nisab)}, haul 1 tahun`,
      wajib
        ? `Zakat = 2,5% × ${formatIDR(bersih)} = ${formatIDR(zakat)}`
        : 'Aset di bawah nisab — belum wajib zakat.',
    ],
  };
}

export function hitungSaham(p: CalcParams, input: { nilaiPortofolio: number }): CalcResult {
  const nisab = nisabTahunan(p);
  const wajib = input.nilaiPortofolio >= nisab;
  const zakat = wajib ? input.nilaiPortofolio * ZAKAT_RATE : 0;
  return {
    dasarPerhitungan: input.nilaiPortofolio,
    nisab,
    wajib,
    zakatIdr: zakat,
    rincian: [
      `Nilai portofolio = ${formatIDR(input.nilaiPortofolio)}`,
      `Nisab = ${NISAB_EMAS_GRAM} gr emas = ${formatIDR(nisab)}, haul 1 tahun`,
      wajib
        ? `Zakat = 2,5% × ${formatIDR(input.nilaiPortofolio)} = ${formatIDR(zakat)}`
        : 'Portofolio di bawah nisab — belum wajib zakat.',
    ],
  };
}

export function hitungFitrah(p: CalcParams, input: { jumlahJiwa: number }): CalcResult {
  const tarifPerJiwa = FITRAH_BERAS_KG * p.hargaBeras;
  const zakat = input.jumlahJiwa * tarifPerJiwa;
  return {
    dasarPerhitungan: zakat,
    nisab: 0,
    wajib: input.jumlahJiwa > 0,
    zakatIdr: zakat,
    rincian: [
      `Tarif per jiwa = ${FITRAH_BERAS_KG} kg beras × ${formatIDR(p.hargaBeras)} = ${formatIDR(tarifPerJiwa)}`,
      `Zakat fitrah = ${input.jumlahJiwa} jiwa × ${formatIDR(tarifPerJiwa)} = ${formatIDR(zakat)}`,
      'Ditunaikan sebelum shalat Idul Fitri; tidak ada nisab.',
    ],
  };
}
