/**
 * Frontend runtime configuration, sourced from NEXT_PUBLIC_* env vars.
 */

export const STELLAR_NETWORK: 'TESTNET' | 'PUBLIC' =
  (process.env.NEXT_PUBLIC_STELLAR_NETWORK as 'TESTNET' | 'PUBLIC') ?? 'TESTNET';

export const HORIZON_URL: string =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';

export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
