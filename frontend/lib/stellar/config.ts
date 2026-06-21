/**
 * Stellar network configuration for the browser (NEXT_PUBLIC_* env vars).
 */
import { Asset, Horizon, Networks } from '@stellar/stellar-sdk';

export const STELLAR_NETWORK: 'TESTNET' | 'PUBLIC' =
  (process.env.NEXT_PUBLIC_STELLAR_NETWORK as 'TESTNET' | 'PUBLIC') ?? 'TESTNET';

const IS_TESTNET = STELLAR_NETWORK !== 'PUBLIC';

export const HORIZON_URL: string =
  process.env.NEXT_PUBLIC_HORIZON_URL ??
  (IS_TESTNET
    ? 'https://horizon-testnet.stellar.org'
    : 'https://horizon.stellar.org');

export const NETWORK_PASSPHRASE: string =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ??
  (IS_TESTNET ? Networks.TESTNET : Networks.PUBLIC);

export const BASE_FEE = '100';
export const TIMEOUT = 30;

export const USDC_ISSUER: string =
  process.env.NEXT_PUBLIC_USDC_ISSUER ??
  'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

export const USDC_CODE: string = process.env.NEXT_PUBLIC_USDC_CODE ?? 'USDC';

export const XLM_ASSET: Asset = Asset.native();
export const USDC_ASSET: Asset = new Asset(USDC_CODE, USDC_ISSUER);

/** Resolve an {@link Asset} from a simple "XLM" | "USDC" code. */
export function getAssetByCode(code: string): Asset {
  const normalized = code.toUpperCase();
  if (normalized === 'XLM') return XLM_ASSET;
  if (normalized === 'USDC') return USDC_ASSET;
  throw new Error(`Aset tidak didukung: ${code}`);
}

/** Singleton Horizon server. */
export const stellarServer: Horizon.Server = new Horizon.Server(HORIZON_URL);

export const STELLAR_EXPERT_BASE_URL: string =
  process.env.NEXT_PUBLIC_STELLAR_EXPERT_BASE_URL ??
  `https://stellar.expert/explorer/${IS_TESTNET ? 'testnet' : 'public'}`;

export const FRIENDBOT_URL: string =
  process.env.NEXT_PUBLIC_FRIENDBOT_URL ?? 'https://friendbot.stellar.org';

export const MAX_OPERATIONS_PER_TX = 100;
export const MEMO_MAX_LENGTH = 28;

export function getTxExplorerUrl(txHash: string): string {
  return `${STELLAR_EXPERT_BASE_URL}/tx/${txHash}`;
}

export function getAccountExplorerUrl(address: string): string {
  return `${STELLAR_EXPERT_BASE_URL}/account/${address}`;
}
