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

/** Fund category a transaction belongs to, derived from its memo prefix. */
export type FundCategory = 'zakat' | 'infaq' | 'sedekah' | 'lainnya';

/**
 * Classify a transaction by its memo prefix into a fund category.
 *
 * Zakat carries far stricter distribution rules (the eight asnaf) than infaq or
 * sedekah, so transparency reporting keeps the three separate rather than
 * lumping every inflow into one "terkumpul" figure.
 */
export function categoryFromMemo(memo: string | null | undefined): FundCategory {
  if (!memo) return 'lainnya';
  const upper = memo.toUpperCase();
  if (upper.startsWith('ZAKAT')) return 'zakat';
  if (upper.startsWith('INFAQ')) return 'infaq';
  if (upper.startsWith('SEDEKAH')) return 'sedekah';
  return 'lainnya';
}

/** Inbound/outbound totals for one fund category at a single asset. */
export interface CategoryFlow {
  category: FundCategory;
  masuk: string;
  keluar: string;
  saldo: string;
}

/**
 * Aggregate inbound/outbound totals **per fund category** for `address`, for a
 * single `asset` (defaults to USDC — the asset zakat is denominated in).
 *
 * Distribution memos ("ZAKATI-DIST-…") classify as zakat, so a lembaga's zakat
 * outflow is attributed to the zakat bucket rather than left uncategorised.
 */
export function summarizeByCategory(
  records: ZakatTransaction[],
  address: string,
  asset = 'USDC',
): CategoryFlow[] {
  const order: FundCategory[] = ['zakat', 'infaq', 'sedekah', 'lainnya'];
  const masuk: Record<FundCategory, number> = { zakat: 0, infaq: 0, sedekah: 0, lainnya: 0 };
  const keluar: Record<FundCategory, number> = { zakat: 0, infaq: 0, sedekah: 0, lainnya: 0 };

  for (const tx of records) {
    if (tx.asset !== asset) continue;
    const category = categoryFromMemo(tx.memo);
    if (tx.to === address) masuk[category] += Number(tx.amount);
    if (tx.from === address) keluar[category] += Number(tx.amount);
  }

  return order
    .filter((category) => masuk[category] !== 0 || keluar[category] !== 0)
    .map((category) => ({
      category,
      masuk: masuk[category].toFixed(7),
      keluar: keluar[category].toFixed(7),
      saldo: (masuk[category] - keluar[category]).toFixed(7),
    }));
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
