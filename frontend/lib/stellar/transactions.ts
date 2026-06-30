/**
 * Stellar transaction builders for the browser (Freighter signs, Horizon submits).
 */
import {
  Memo,
  Operation,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import type { BatchDistributionInput } from '@/types';
import { logger } from '@/lib/logger';
import { parseHorizonError } from '@/lib/errors';
import {
  BASE_FEE,
  MAX_OPERATIONS_PER_TX,
  MEMO_MAX_LENGTH,
  NETWORK_PASSPHRASE,
  TIMEOUT,
  USDC_ASSET,
  getAssetByCode,
  getTxExplorerUrl,
  stellarServer,
} from './config';

const CONTEXT = 'stellar/transactions';

/**
 * Build a text memo trimmed to the protocol limit, which is 28 *bytes* (not
 * characters). Slicing by string length would let a multibyte memo (accents,
 * em-dashes, emoji) exceed 28 bytes and make {@link Memo.text} throw.
 */
function safeMemo(memo: string): Memo {
  const bytes = new TextEncoder().encode(memo);
  if (bytes.length <= MEMO_MAX_LENGTH) return Memo.text(memo);
  // Truncate to the byte limit, dropping any trailing partial UTF-8 sequence.
  const truncated = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.slice(0, MEMO_MAX_LENGTH))
    .replace(/�$/, '');
  return Memo.text(truncated);
}

/** Build an unsigned zakat payment transaction. */
export async function buildZakatPayment(params: {
  fromAddress: string;
  toAddress: string;
  amount: string;
  asset: 'XLM' | 'USDC';
  memo?: string;
}): Promise<Transaction> {
  const { fromAddress, toAddress, amount, asset, memo } = params;
  const source = await stellarServer.loadAccount(fromAddress);
  const builder = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  }).addOperation(
    Operation.payment({ destination: toAddress, asset: getAssetByCode(asset), amount }),
  );
  if (memo?.trim()) builder.addMemo(safeMemo(memo));
  const tx = builder.setTimeout(TIMEOUT).build();
  logger.info(CONTEXT, `Built zakat payment ${amount} ${asset} → ${toAddress}`);
  return tx;
}

/** Build an unsigned USDC trustline transaction. */
export async function buildAddUSDCTrustline(fromAddress: string): Promise<Transaction> {
  const source = await stellarServer.loadAccount(fromAddress);
  return new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset: USDC_ASSET, limit: '1000000' }))
    .setTimeout(TIMEOUT)
    .build();
}

/** Build batch distribution transactions split into ≤100-operation batches. */
export async function buildBatchDistribution(params: BatchDistributionInput): Promise<{
  transactions: Transaction[];
  totalAmount: string;
  feeEstimate: string;
  batchCount: number;
}> {
  const { senderAddress, recipients } = params;
  if (recipients.length === 0) throw new Error('Daftar penerima tidak boleh kosong.');

  const source = await stellarServer.loadAccount(senderAddress);
  const batches: BatchDistributionInput['recipients'][] = [];
  for (let i = 0; i < recipients.length; i += MAX_OPERATIONS_PER_TX) {
    batches.push(recipients.slice(i, i + MAX_OPERATIONS_PER_TX));
  }

  const transactions: Transaction[] = batches.map((batch, index) => {
    const builder = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    for (const r of batch) {
      builder.addOperation(
        Operation.payment({ destination: r.address, asset: USDC_ASSET, amount: r.amount }),
      );
    }
    builder.addMemo(safeMemo(`ZAKATI-DIST-${index}`));
    return builder.setTimeout(TIMEOUT).build();
  });

  const totalAmount = recipients
    .reduce((sum, r) => sum + Number(r.amount), 0)
    .toFixed(7);

  return {
    transactions,
    totalAmount,
    feeEstimate: estimateFee(recipients.length),
    batchCount: transactions.length,
  };
}

/** Estimate total fee in XLM for `operationCount` operations. */
export function estimateFee(operationCount: number): string {
  return ((operationCount * Number(BASE_FEE)) / 10_000_000).toFixed(7);
}

/** Submit a signed XDR to Horizon. */
export async function submitTransaction(signedXdr: string): Promise<{
  txHash: string;
  explorerUrl: string;
  ledger: number;
}> {
  try {
    const tx = new Transaction(signedXdr, NETWORK_PASSPHRASE);
    const result = await stellarServer.submitTransaction(tx);
    logger.info(CONTEXT, `Submitted tx ${result.hash}`);
    return {
      txHash: result.hash,
      explorerUrl: getTxExplorerUrl(result.hash),
      ledger: result.ledger,
    };
  } catch (error) {
    logger.error(CONTEXT, 'submitTransaction failed', error);
    throw parseHorizonError(error);
  }
}
