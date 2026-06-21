/**
 * Stellar account management utilities for Zakati.
 */
import { StrKey } from '@stellar/stellar-sdk';
import axios from 'axios';
import type { StellarAccount } from '../../types';
import { logger } from '../logger';
import { InvalidAddressError, NetworkMismatchError } from '../errors';
import {
  FRIENDBOT_URL,
  STELLAR_NETWORK,
  USDC_CODE,
  USDC_ISSUER,
  stellarServer,
} from './config';

const CONTEXT = 'stellar/account';

/** Horizon throws a 404-shaped error when an account is not yet funded. */
function isAccountNotFound(error: unknown): boolean {
  const status =
    (error as { response?: { status?: number } })?.response?.status ??
    (error as { status?: number })?.status;
  return status === 404;
}

/**
 * Load full account details from Horizon.
 *
 * Returns an inactive (unfunded) snapshot when the account does not exist,
 * rather than throwing, so the UI can prompt the user to fund it.
 *
 * @param publicKey Ed25519 public key (G...).
 */
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

    return {
      publicKey,
      xlmBalance,
      usdcBalance,
      isActive: true,
      hasTrustline,
    };
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

/** Return the native XLM balance, e.g. "100.0000000". */
export async function getXLMBalance(publicKey: string): Promise<string> {
  const account = await fetchAccountDetails(publicKey);
  return account.xlmBalance;
}

/** Return the USDC balance, or "0" when no trustline exists. */
export async function getUSDCBalance(publicKey: string): Promise<string> {
  const account = await fetchAccountDetails(publicKey);
  return account.usdcBalance;
}

/** Whether the account holds a USDC trustline. */
export async function checkUSDCTrustline(publicKey: string): Promise<boolean> {
  const account = await fetchAccountDetails(publicKey);
  return account.hasTrustline;
}

/** Validate a Stellar Ed25519 public key. */
export function validateStellarAddress(address: string): boolean {
  try {
    return StrKey.isValidEd25519PublicKey(address);
  } catch {
    return false;
  }
}

/**
 * Fund an account via Friendbot. Testnet only.
 *
 * @throws NetworkMismatchError when called outside TESTNET.
 */
export async function fundTestnetAccount(publicKey: string): Promise<void> {
  if (STELLAR_NETWORK !== 'TESTNET') {
    throw new NetworkMismatchError();
  }
  if (!validateStellarAddress(publicKey)) {
    throw new InvalidAddressError();
  }

  try {
    await axios.get(`${FRIENDBOT_URL}/?addr=${encodeURIComponent(publicKey)}`);
    logger.info(CONTEXT, `Funded testnet account: ${publicKey}`);
  } catch (error) {
    logger.error(CONTEXT, 'fundTestnetAccount failed', error);
    throw error;
  }
}

/**
 * Compute the minimum XLM balance for a given number of subentries.
 * Base reserve is 1 XLM (2 base entries), each additional entry is 0.5 XLM.
 *
 * @param numEntries Number of subentries (trustlines, offers, signers, …).
 */
export function getMinimumBalance(numEntries: number): string {
  const minimum = 1 + numEntries * 0.5;
  return minimum.toFixed(7);
}
