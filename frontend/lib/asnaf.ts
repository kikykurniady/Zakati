/**
 * The eight asnaf (golongan) eligible to receive zakat (QS At-Taubah 9:60).
 *
 * Zakat — unlike infaq/sedekah — may only be distributed to these categories.
 * The `kode` is the stable identifier carried across the API and (in a later
 * phase) on-chain, so it must never change once released.
 *
 * Mirror of backend/src/lib/asnaf.ts — keep the two in sync.
 */

export interface Asnaf {
  /** Slug id used in UI state, e.g. "fakir". */
  id: string;
  /** Stable machine code used across API/on-chain, e.g. "FAKIR". */
  kode: string;
  /** Display label. */
  label: string;
  /** Short explanation. */
  deskripsi: string;
}

export const ASNAF: readonly Asnaf[] = [
  {
    id: 'fakir',
    kode: 'FAKIR',
    label: 'Fakir',
    deskripsi: 'Tidak memiliki harta maupun penghasilan untuk kebutuhan pokok.',
  },
  {
    id: 'miskin',
    kode: 'MISKIN',
    label: 'Miskin',
    deskripsi: 'Memiliki penghasilan namun tidak mencukupi kebutuhan pokok.',
  },
  {
    id: 'amil',
    kode: 'AMIL',
    label: 'Amil',
    deskripsi: 'Pengelola zakat yang menghimpun dan menyalurkan dana.',
  },
  {
    id: 'muallaf',
    kode: 'MUALLAF',
    label: 'Muallaf',
    deskripsi: 'Orang yang baru memeluk Islam atau dilunakkan hatinya.',
  },
  {
    id: 'riqab',
    kode: 'RIQAB',
    label: 'Riqab',
    deskripsi: 'Memerdekakan budak atau membebaskan dari perbudakan.',
  },
  {
    id: 'gharim',
    kode: 'GHARIM',
    label: 'Gharim',
    deskripsi: 'Orang yang terlilit hutang untuk kebutuhan yang halal.',
  },
  {
    id: 'sabilillah',
    kode: 'SABILILLAH',
    label: 'Fi Sabilillah',
    deskripsi: 'Berjuang di jalan Allah: dakwah, pendidikan, dan kemaslahatan umat.',
  },
  {
    id: 'ibnu-sabil',
    kode: 'IBNUSABIL',
    label: 'Ibnu Sabil',
    deskripsi: 'Musafir yang kehabisan bekal dalam perjalanan yang bukan maksiat.',
  },
] as const;

/** Set of valid asnaf codes for O(1) validation. */
const ASNAF_KODE_SET = new Set(ASNAF.map((a) => a.kode));

/** All valid asnaf codes, e.g. ["FAKIR", "MISKIN", …]. */
export const ASNAF_KODES: readonly string[] = ASNAF.map((a) => a.kode);

/** Whether `kode` is one of the eight recognised asnaf (case-insensitive). */
export function isValidAsnaf(kode: string | null | undefined): boolean {
  if (!kode) return false;
  return ASNAF_KODE_SET.has(kode.toUpperCase());
}

/** Resolve an asnaf by its code (case-insensitive), or null if unknown. */
export function asnafFromKode(kode: string | null | undefined): Asnaf | null {
  if (!kode) return null;
  const upper = kode.toUpperCase();
  return ASNAF.find((a) => a.kode === upper) ?? null;
}
