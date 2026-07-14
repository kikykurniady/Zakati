/**
 * SEP-24 on-ramp anchor configuration.
 *
 * Zakati settles zakat in USDC. To let a muzakki fund that with fiat, we use a
 * Stellar **anchor** (SEP-24 interactive deposit). On testnet the only usable
 * anchor is the SDF reference anchor, which conveniently issues the *same* USDC
 * asset Zakati already uses — so the on-ramp mints the exact settlement asset,
 * end to end. In production this slot is swapped for a local IDR anchor from the
 * Stellar Anchor Directory (same SEP-24 flow), so a muzakki tops up in Rupiah.
 */

export const ANCHOR_HOME_DOMAIN =
  process.env.NEXT_PUBLIC_ANCHOR_HOME_DOMAIN ?? 'testanchor.stellar.org';

/** On-ramp asset — USDC, matching Zakati's settlement asset (see stellar/config). */
export const ANCHOR_ASSET_CODE = process.env.NEXT_PUBLIC_ANCHOR_ASSET_CODE ?? 'USDC';

/** Endpoints discovered from the anchor's SEP-1 stellar.toml. */
export interface AnchorInfo {
  webAuthEndpoint: string;
  sep24Endpoint: string;
}

/** Derived fallback used when the toml can't be read (endpoints match home domain). */
const FALLBACK: AnchorInfo = {
  webAuthEndpoint: `https://${ANCHOR_HOME_DOMAIN}/auth`,
  sep24Endpoint: `https://${ANCHOR_HOME_DOMAIN}/sep24`,
};

/** Extract a quoted `KEY = "value"` field from a stellar.toml body. */
export function parseTomlField(toml: string, key: string): string | null {
  const match = toml.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"`, 'm'));
  return match ? match[1] : null;
}

/**
 * Read the anchor's endpoints from its SEP-1 `stellar.toml`. Falls back to the
 * home-domain-derived defaults if the toml is unreachable, so the flow still
 * works offline/in tests.
 */
export async function fetchAnchorInfo(): Promise<AnchorInfo> {
  try {
    const res = await fetch(`https://${ANCHOR_HOME_DOMAIN}/.well-known/stellar.toml`);
    if (!res.ok) return FALLBACK;
    const toml = await res.text();
    return {
      webAuthEndpoint: parseTomlField(toml, 'WEB_AUTH_ENDPOINT') ?? FALLBACK.webAuthEndpoint,
      sep24Endpoint:
        parseTomlField(toml, 'TRANSFER_SERVER_SEP0024') ?? FALLBACK.sep24Endpoint,
    };
  } catch {
    return FALLBACK;
  }
}
