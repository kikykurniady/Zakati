/**
 * IDR (Indonesian Rupiah) formatting helpers.
 *
 * Zakat amounts in the escrow PoC are integer rupiah (no sub-unit / 0 decimals),
 * matching how the Soroban contract stores them as `i128`.
 */

/** Currency metadata advertised in x402 payment requirements. */
export const IDR = { code: 'IDR', decimals: 0 } as const;

/**
 * Format an integer rupiah amount for display, e.g. 1000000 → "Rp1.000.000".
 * Accepts a number, bigint, or numeric string.
 */
export function formatIDR(amount: number | bigint | string): string {
  const value =
    typeof amount === 'bigint' ? amount : BigInt(Math.trunc(Number(amount)));
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}Rp${grouped}`;
}
