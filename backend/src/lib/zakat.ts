/**
 * Zakati domain helpers shared across routes — kept free of network/SDK calls
 * so they remain trivially unit-testable.
 */

/** Memo prefixes that identify Zakati-originated transactions. */
export const ZAKATI_MEMO_PREFIXES = ['ZAKAT', 'INFAQ', 'SEDEKAH', 'ZAKATI-DIST'] as const;

/**
 * Whether a transaction memo looks like a Zakati transfer.
 *
 * Matching is case-insensitive and prefix-based, e.g. "ZAKAT-MAL-2024".
 */
export function isZakatiMemo(memo: string | null | undefined): boolean {
  if (!memo) return false;
  const upper = memo.toUpperCase();
  return ZAKATI_MEMO_PREFIXES.some((prefix) => upper.startsWith(prefix));
}
