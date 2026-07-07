/**
 * Canonical zakat payment types and their on-chain memo codes.
 *
 * The memo is the only on-chain marker of a payment's type, so codes here
 * must stay within Stellar's 28-byte text-memo limit and keep the prefixes
 * the backend recognizes (ZAKAT / INFAQ / SEDEKAH — see backend zakat.ts).
 */

export interface ZakatType {
  id: string;
  /** Label shown in the selector. */
  label: string;
  /** Short explanation shown under the selector. */
  description: string;
  /** Memo code without the year suffix, e.g. "ZAKAT-MAL-PROFESI". */
  memoPrefix: string;
}

export const ZAKAT_TYPES: readonly ZakatType[] = [
  {
    id: 'fitrah',
    label: 'Zakat Fitrah',
    description: 'Zakat wajib per jiwa, ditunaikan sebelum shalat Idul Fitri.',
    memoPrefix: 'ZAKAT-FITRAH',
  },
  {
    id: 'maal-profesi',
    label: 'Zakat Maal — Penghasilan',
    description: '2,5% dari penghasilan rutin yang mencapai nisab.',
    memoPrefix: 'ZAKAT-MAL-PROFESI',
  },
  {
    id: 'maal-emas',
    label: 'Zakat Maal — Emas & Perak',
    description: '2,5% dari nilai emas/perak ≥ nisab (85 gr emas), haul 1 tahun.',
    memoPrefix: 'ZAKAT-MAL-EMAS',
  },
  {
    id: 'maal-tabungan',
    label: 'Zakat Maal — Tabungan',
    description: '2,5% dari saldo tabungan/deposito ≥ nisab, haul 1 tahun.',
    memoPrefix: 'ZAKAT-MAL-TABUNGAN',
  },
  {
    id: 'maal-dagang',
    label: 'Zakat Maal — Perdagangan',
    description: '2,5% dari aset lancar usaha dikurangi hutang jangka pendek.',
    memoPrefix: 'ZAKAT-MAL-DAGANG',
  },
  {
    id: 'maal-saham',
    label: 'Zakat Maal — Saham & Investasi',
    description: '2,5% dari nilai atau keuntungan portofolio investasi.',
    memoPrefix: 'ZAKAT-MAL-SAHAM',
  },
  {
    id: 'infaq',
    label: 'Infaq',
    description: 'Pemberian sukarela untuk kepentingan umum.',
    memoPrefix: 'INFAQ-UMUM',
  },
  {
    id: 'sedekah',
    label: 'Sedekah',
    description: 'Pemberian sukarela kepada siapa pun yang membutuhkan.',
    memoPrefix: 'SEDEKAH-UMUM',
  },
] as const;

/** Sentinel id for the free-text memo option in selectors. */
export const CUSTOM_ZAKAT_TYPE_ID = 'custom';

/** Full memo for a zakat type in a given year, e.g. "ZAKAT-MAL-EMAS-2026". */
export function memoForZakatType(
  type: ZakatType,
  year: number = new Date().getFullYear(),
): string {
  return `${type.memoPrefix}-${year}`;
}

/**
 * Resolve a transaction memo back to its zakat type, or null for unknown or
 * free-text memos. Matches case-insensitively on the memo prefix so both
 * current ("ZAKAT-MAL-EMAS-2026") and year-less legacy memos resolve.
 */
export function zakatTypeFromMemo(memo: string | null | undefined): ZakatType | null {
  if (!memo) return null;
  const upper = memo.toUpperCase();
  // Longest prefix first so "ZAKAT-MAL-EMAS" wins over a plain "ZAKAT-MAL".
  const sorted = [...ZAKAT_TYPES].sort(
    (a, b) => b.memoPrefix.length - a.memoPrefix.length,
  );
  return sorted.find((t) => upper.startsWith(t.memoPrefix)) ?? null;
}
