/**
 * Zakati domain helpers shared across routes — kept free of network/SDK calls
 * so they remain trivially unit-testable.
 */
import type { AssetFlow, ZakatTransaction } from '../types';

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

/**
 * Aggregate inbound/outbound totals **per asset** for `address`.
 *
 * Grouping by asset is deliberate: a previous version summed every payment's
 * amount into one number regardless of asset, so 100 XLM + 100 USDC was
 * reported as "200". Returns one {@link AssetFlow} per asset seen, sorted by
 * asset code for stable output.
 */
export function aggregateFlowsByAsset(
  records: ZakatTransaction[],
  address: string,
): AssetFlow[] {
  const masuk: Record<string, number> = {};
  const keluar: Record<string, number> = {};

  for (const tx of records) {
    if (tx.to === address) {
      masuk[tx.asset] = (masuk[tx.asset] ?? 0) + Number(tx.amount);
    }
    if (tx.from === address) {
      keluar[tx.asset] = (keluar[tx.asset] ?? 0) + Number(tx.amount);
    }
  }

  const assets = Array.from(
    new Set([...Object.keys(masuk), ...Object.keys(keluar)]),
  ).sort();

  return assets.map((asset) => {
    const inn = masuk[asset] ?? 0;
    const out = keluar[asset] ?? 0;
    return {
      asset,
      masuk: inn.toFixed(7),
      keluar: out.toFixed(7),
      saldo: (inn - out).toFixed(7),
    };
  });
}

/**
 * Pick a single asset's flow from a list, defaulting to USDC (the asset zakat
 * is denominated in). Returns a zeroed flow when the asset is absent.
 */
export function flowForAsset(flows: AssetFlow[], asset = 'USDC'): AssetFlow {
  return (
    flows.find((f) => f.asset === asset) ?? {
      asset,
      masuk: '0.0000000',
      keluar: '0.0000000',
      saldo: '0.0000000',
    }
  );
}
