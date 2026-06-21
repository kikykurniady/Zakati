/**
 * Stellar account utilities for the browser.
 */
import { StrKey } from '@stellar/stellar-sdk';
import type { StellarAccount } from '@/types';
import { logger } from '@/lib/logger';
import { InvalidAddressError, NetworkMismatchError } from '@/lib/errors';
import {
  FRIENDBOT_URL,
  STELLAR_NETWORK,
  USDC_CODE,
  USDC_ISSUER,
  stellarServer,
} from './config';

const CONTEXT = 'stellar/account';

function isAccountNotFound(error: unknown): boolean {
  const status =
    (error as { response?: { status?: number } })?.response?.status ??
    (error as { status?: number })?.status;
  return status === 404;
}

/** Load full account details from Horizon (inactive snapshot if unfunded). */
export async function fetchAccountDetails(
  publicKey: string,
): Promise<StellarAccount> {
  if (!validateStellarAddress(publicKey)) {
    throw new InvalidAddressError();
  }

  try {
    const account = await stellarServer.loadAccount(publicKey);
    let xlmBalance = '0';
    let usdcBalance = '0';
    let hasTrustline = false;

    for (const balance of account.balances) {
      if (balance.asset_type === 'native') {
        xlmBalance = balance.balance;
      } else if (
        'asset_code' in balance &&
        'asset_issuer' in balance &&
        balance.asset_code === USDC_CODE &&
        balance.asset_issuer === USDC_ISSUER
      ) {
        usdcBalance = balance.balance;
        hasTrustline = true;
      }
    }

    return { publicKey, xlmBalance, usdcBalance, isActive: true, hasTrustline };
  } catch (error) {
    if (isAccountNotFound(error)) {
      logger.warn(CONTEXT, `Account not funded: ${publicKey}`);
      return {
        publicKey,
        xlmBalance: '0',
        usdcBalance: '0',
        isActive: false,
        hasTrustline: false,
      };
    }
    logger.error(CONTEXT, 'fetchAccountDetails failed', error);
    throw error;
  }
}

export async function getXLMBalance(publicKey: string): Promise<string> {
  return (await fetchAccountDetails(publicKey)).xlmBalance;
}

export async function getUSDCBalance(publicKey: string): Promise<string> {
  return (await fetchAccountDetails(publicKey)).usdcBalance;
}

export async function checkUSDCTrustline(publicKey: string): Promise<boolean> {
  return (await fetchAccountDetails(publicKey)).hasTrustline;
}

export function validateStellarAddress(address: string): boolean {
  try {
    return StrKey.isValidEd25519PublicKey(address);
  } catch {
    return false;
  }
}

/** Fund a testnet account via Friendbot (testnet only). */
export async function fundTestnetAccount(publicKey: string): Promise<void> {
  if (STELLAR_NETWORK !== 'TESTNET') throw new NetworkMismatchError();
  if (!validateStellarAddress(publicKey)) throw new InvalidAddressError();

  const res = await fetch(
    `${FRIENDBOT_URL}/?addr=${encodeURIComponent(publicKey)}`,
  );
  if (!res.ok) {
    throw new Error('Gagal mendanai akun melalui Friendbot.');
  }
  logger.info(CONTEXT, `Funded testnet account: ${publicKey}`);
}

/** Minimum XLM balance for `numEntries` subentries. */
export function getMinimumBalance(numEntries: number): string {
  return (1 + numEntries * 0.5).toFixed(7);
}
