/**
 * Stellar transaction builders and submission for Zakati.
 *
 * Builders return unsigned {@link Transaction} objects; signing happens in
 * the wallet (Freighter on the client) before {@link submitTransaction}.
 */
import {
  Memo,
  Operation,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import type { BatchDistributionInput } from '../../types';
import { logger } from '../logger';
import { parseHorizonError } from '../errors';
import { truncateMemoToBytes } from '../zakat';
import {
  BASE_FEE,
  MAX_OPERATIONS_PER_TX,
  MEMO_MAX_LENGTH,
  NETWORK_PASSPHRASE,
  TIMEOUT,
  USDC_ASSET,
  XLM_ASSET,
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
  return Memo.text(truncateMemoToBytes(memo, MEMO_MAX_LENGTH));
}

/**
 * Build an unsigned zakat payment (Muzakki → Amil).
 */
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
    Operation.payment({
      destination: toAddress,
      asset: getAssetByCode(asset),
      amount,
    }),
  );

  if (memo && memo.trim().length > 0) {
    builder.addMemo(safeMemo(memo));
  }

  const tx = builder.setTimeout(TIMEOUT).build();
  logger.info(CONTEXT, `Built zakat payment ${amount} ${asset} → ${toAddress}`);
  return tx;
}

/**
 * Build an unsigned transaction that adds a USDC trustline.
 */
export async function buildAddUSDCTrustline(
  fromAddress: string,
): Promise<Transaction> {
  const source = await stellarServer.loadAccount(fromAddress);
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.changeTrust({ asset: USDC_ASSET, limit: '1000000' }),
    )
    .setTimeout(TIMEOUT)
    .build();

  logger.info(CONTEXT, `Built USDC trustline for ${fromAddress}`);
  return tx;
}

/**
 * Build batch distribution transactions (Amil → many Mustahiq).
 *
 * Recipients are split into batches of at most {@link MAX_OPERATIONS_PER_TX}
 * payment operations; each batch becomes one transaction carrying a
 * `ZAKATI-DIST-{index}` memo. All payments are denominated in USDC.
 */
export async function buildBatchDistribution(
  params: BatchDistributionInput,
): Promise<{
  transactions: Transaction[];
  totalAmount: string;
  feeEstimate: string;
  batchCount: number;
}> {
  const { senderAddress, recipients } = params;

  if (recipients.length === 0) {
    throw new Error('Daftar penerima tidak boleh kosong.');
  }

  const source = await stellarServer.loadAccount(senderAddress);

  // Chunk recipients into batches.
  const batches: BatchDistributionInput['recipients'][] = [];
  for (let i = 0; i < recipients.length; i += MAX_OPERATIONS_PER_TX) {
    batches.push(recipients.slice(i, i + MAX_OPERATIONS_PER_TX));
  }

  const transactions: Transaction[] = [];

  batches.forEach((batch, index) => {
    const builder = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    for (const recipient of batch) {
      builder.addOperation(
        Operation.payment({
          destination: recipient.address,
          asset: USDC_ASSET,
          amount: recipient.amount,
        }),
      );
    }

    builder.addMemo(safeMemo(`ZAKATI-DIST-${index}`));
    transactions.push(builder.setTimeout(TIMEOUT).build());
  });

  const totalAmount = recipients
    .reduce((sum, r) => sum + Number(r.amount), 0)
    .toFixed(7);
  const feeEstimate = estimateFee(recipients.length);

  logger.info(
    CONTEXT,
    `Built ${transactions.length} batch(es) for ${recipients.length} recipients`,
  );

  return {
    transactions,
    totalAmount,
    feeEstimate,
    batchCount: transactions.length,
  };
}

/**
 * Estimate the total fee, in XLM, for `operationCount` operations.
 * Formula: (operationCount * BASE_FEE) / 10_000_000.
 */
export function estimateFee(operationCount: number): string {
  const stroops = operationCount * Number(BASE_FEE);
  return (stroops / 10_000_000).toFixed(7);
}

/**
 * Submit a signed transaction XDR to Horizon.
 *
 * @param signedXdr Base64 transaction envelope already signed by the wallet.
 * @returns Transaction hash, explorer URL, and ledger sequence.
 * @throws ZakatiError parsed from the Horizon error response on failure.
 */
export async function submitTransaction(signedXdr: string): Promise<{
  txHash: string;
  explorerUrl: string;
  ledger: number;
}> {
  try {
    const tx = new Transaction(signedXdr, NETWORK_PASSPHRASE);
    const result = await stellarServer.submitTransaction(tx);

    logger.info(CONTEXT, `Submitted tx ${result.hash} @ ledger ${result.ledger}`);
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
