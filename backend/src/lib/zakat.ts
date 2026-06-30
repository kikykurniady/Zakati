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

/**
 * Truncate a string so its UTF-8 encoding fits within `maxBytes`, dropping any
 * trailing partial multibyte sequence.
 *
 * Stellar text memos are limited to 28 *bytes*, not characters; slicing by
 * `String.prototype.slice` measures UTF-16 code units and lets multibyte input
 * (accents, em-dashes, emoji) overflow the protocol limit.
 */
export function truncateMemoToBytes(memo: string, maxBytes: number): string {
  const bytes = new TextEncoder().encode(memo);
  if (bytes.length <= maxBytes) return memo;
  return new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.slice(0, maxBytes))
    .replace(/�$/, '');
}
