/**
 * Stellar network configuration, asset definitions, and shared helpers.
 *
 * Reads from environment variables. On the backend these are plain
 * `process.env.*`; the frontend mirror of this file reads
 * `process.env.NEXT_PUBLIC_*`.
 */
import { Asset, Horizon, Networks } from '@stellar/stellar-sdk';

/** Active network selector. */
export const STELLAR_NETWORK: 'TESTNET' | 'PUBLIC' =
  (process.env.STELLAR_NETWORK as 'TESTNET' | 'PUBLIC') ?? 'TESTNET';

const IS_TESTNET = STELLAR_NETWORK !== 'PUBLIC';

/** Horizon REST endpoint for the active network. */
export const HORIZON_URL: string =
  process.env.HORIZON_URL ??
  (IS_TESTNET
    ? 'https://horizon-testnet.stellar.org'
    : 'https://horizon.stellar.org');

/** Network passphrase used when signing transactions. */
export const NETWORK_PASSPHRASE: string = IS_TESTNET
  ? Networks.TESTNET
  : Networks.PUBLIC;

/** Base fee per operation, in stroops. */
export const BASE_FEE = '100';

/** Default transaction timeout, in seconds. */
export const TIMEOUT = 30;

/** USDC issuer for the active network. */
export const USDC_ISSUER: string =
  process.env.USDC_ISSUER ??
  'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

/** USDC asset code. */
export const USDC_CODE: string = process.env.USDC_CODE ?? 'USDC';

/** Native XLM asset. */
export const XLM_ASSET: Asset = Asset.native();

/** USDC asset on the active network. */
export const USDC_ASSET: Asset = new Asset(USDC_CODE, USDC_ISSUER);

/**
 * Resolve an {@link Asset} from a simple code.
 *
 * @param code Either "XLM" or "USDC" (case-insensitive).
 * @throws Error when the code is unsupported.
 */
export function getAssetByCode(code: string): Asset {
  const normalized = code.toUpperCase();
  if (normalized === 'XLM') return XLM_ASSET;
  if (normalized === 'USDC') return USDC_ASSET;
  throw new Error(`Aset tidak didukung: ${code}`);
}

/** Singleton Horizon server instance — reuse to avoid re-instantiation. */
export const stellarServer: Horizon.Server = new Horizon.Server(HORIZON_URL);

/** Base URL for Stellar Expert explorer on the active network. */
export const STELLAR_EXPERT_BASE_URL: string =
  process.env.STELLAR_EXPERT_BASE_URL ??
  `https://stellar.expert/explorer/${IS_TESTNET ? 'testnet' : 'public'}`;

/** Friendbot endpoint (testnet funding faucet). */
export const FRIENDBOT_URL: string =
  process.env.FRIENDBOT_URL ?? 'https://friendbot.stellar.org';

/** Maximum payment operations packed into a single transaction. */
export const MAX_OPERATIONS_PER_TX = 100;

/** Maximum length of a text memo, in bytes. */
export const MEMO_MAX_LENGTH = 28;

/** Build a Stellar Expert URL for a transaction hash. */
export function getTxExplorerUrl(txHash: string): string {
  return `${STELLAR_EXPERT_BASE_URL}/tx/${txHash}`;
}

/** Build a Stellar Expert URL for an account address. */
export function getAccountExplorerUrl(address: string): string {
  return `${STELLAR_EXPERT_BASE_URL}/account/${address}`;
}

/** Convert a stroops amount (string) to XLM with 7 decimals. */
export function stroopsToXLM(stroops: string): string {
  return (BigInt(stroops) / 10_000_000n).toString().concat(
    '.',
    (BigInt(stroops) % 10_000_000n).toString().padStart(7, '0'),
  );
}

/** Convert an XLM amount (string) to stroops. */
export function XLMToStroops(xlm: string): string {
  const [whole, fraction = ''] = xlm.split('.');
  const paddedFraction = fraction.padEnd(7, '0').slice(0, 7);
  return (BigInt(whole) * 10_000_000n + BigInt(paddedFraction || '0')).toString();
}
