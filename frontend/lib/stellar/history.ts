/**
 * Transaction history retrieval from Horizon (browser-side).
 */
import { Keypair } from '@stellar/stellar-sdk';
import type {
  AssetCode,
  DistributionRecord,
  DistributionRecipient,
  ZakatTransaction,
} from '@/types';
import { logger } from '@/lib/logger';
import { getTxExplorerUrl, stellarServer } from './config';

const CONTEXT = 'stellar/history';

/** Parse a raw Horizon payment record into a ZakatTransaction. */
export function parseHorizonPayment(horizonRecord: {
  transaction_hash: string;
  from: string;
  to: string;
  amount: string;
  asset_type: string;
  asset_code?: string;
  created_at: string;
  transaction_successful?: boolean;
  memo?: string;
}): ZakatTransaction {
  const asset: AssetCode =
    horizonRecord.asset_type === 'native'
      ? 'XLM'
      : ((horizonRecord.asset_code as AssetCode) ?? 'USDC');

  return {
    txHash: horizonRecord.transaction_hash,
    from: horizonRecord.from,
    to: horizonRecord.to,
    amount: horizonRecord.amount,
    asset,
    memo: horizonRecord.memo ?? '',
    timestamp: new Date(horizonRecord.created_at).toISOString(),
    status: horizonRecord.transaction_successful === false ? 'failed' : 'success',
    stellarExpertUrl: getTxExplorerUrl(horizonRecord.transaction_hash),
  };
}

/** Fetch paginated payment history for an account. */
export async function fetchPaymentHistory(params: {
  publicKey: string;
  limit?: number;
  cursor?: string;
  order?: 'asc' | 'desc';
}): Promise<{ records: ZakatTransaction[]; nextCursor: string | null }> {
  const { publicKey, limit = 20, cursor, order = 'desc' } = params;

  try {
    let builder = stellarServer
      .payments()
      .forAccount(publicKey)
      .limit(limit)
      .order(order)
      .join('transactions');

    if (cursor) builder = builder.cursor(cursor);

    const page = await builder.call();

    const records: ZakatTransaction[] = page.records
      .filter((r) => r.type === 'payment')
      .map((r) => {
        const memo =
          (r as unknown as { transaction_attr?: { memo?: string } })
            .transaction_attr?.memo ?? '';
        return parseHorizonPayment({
          transaction_hash: r.transaction_hash,
          from: (r as unknown as { from: string }).from,
          to: (r as unknown as { to: string }).to,
          amount: (r as unknown as { amount: string }).amount,
          asset_type: (r as unknown as { asset_type: string }).asset_type,
          asset_code: (r as unknown as { asset_code?: string }).asset_code,
          created_at: r.created_at,
          transaction_successful: (r as unknown as { transaction_successful?: boolean })
            .transaction_successful,
          memo,
        });
      });

    const nextCursor =
      page.records.length > 0
        ? page.records[page.records.length - 1].paging_token
        : null;

    return { records, nextCursor };
  } catch (error) {
    logger.error(CONTEXT, 'fetchPaymentHistory failed', error);
    throw error;
  }
}

/** Fetch a single transaction detail. */
export async function fetchTransactionDetail(txHash: string): Promise<ZakatTransaction> {
  const tx = await stellarServer.transactions().transaction(txHash).call();
  const ops = await stellarServer.operations().forTransaction(txHash).call();
  const payment = ops.records.find((o) => o.type === 'payment');
  if (!payment) throw new Error('Transaksi tidak mengandung operasi pembayaran.');

  return parseHorizonPayment({
    transaction_hash: txHash,
    from: (payment as unknown as { from: string }).from,
    to: (payment as unknown as { to: string }).to,
    amount: (payment as unknown as { amount: string }).amount,
    asset_type: (payment as unknown as { asset_type: string }).asset_type,
    asset_code: (payment as unknown as { asset_code?: string }).asset_code,
    created_at: tx.created_at,
    transaction_successful: tx.successful,
    memo: tx.memo ?? '',
  });
}

/** Fetch distribution history from an Amil address, grouped by batch. */
export async function fetchDistributionHistory(
  amilAddress: string,
): Promise<DistributionRecord[]> {
  const { records } = await fetchPaymentHistory({
    publicKey: amilAddress,
    limit: 200,
    order: 'desc',
  });

  const outgoing = records.filter(
    (r) => r.from === amilAddress && r.memo.startsWith('ZAKATI-DIST'),
  );

  const groups = new Map<string, ZakatTransaction[]>();
  for (const tx of outgoing) {
    const list = groups.get(tx.txHash) ?? [];
    list.push(tx);
    groups.set(tx.txHash, list);
  }

  return Array.from(groups.entries()).map(([txHash, txs]) => {
    const recipients: DistributionRecipient[] = txs.map((t, i) => ({
      mustahiqId: `${txHash}-${i}`,
      address: t.to,
      amount: t.amount,
      name: '••••',
    }));
    return {
      txHash,
      batchId: txs[0].memo,
      recipients,
      totalAmount: txs.reduce((s, t) => s + Number(t.amount), 0).toFixed(7),
      fee: '0',
      timestamp: txs[0].timestamp,
      status: txs[0].status,
    };
  });
}

/** Realistic mock transactions for dev/demo. */
export function getMockTransactions(count: number): ZakatTransaction[] {
  const memos = ['ZAKAT-MAL-2024', 'ZAKAT-FITRAH-2024', 'INFAQ-MASJID', 'SEDEKAH-UMUM'];
  return Array.from({ length: count }, (_, i) => {
    const hash = Keypair.random().publicKey().slice(1, 65).toLowerCase();
    const amount = (Math.floor(Math.random() * 1900) + 100).toString();
    return {
      txHash: hash,
      from: Keypair.random().publicKey(),
      to: Keypair.random().publicKey(),
      amount: `${amount}.0000000`,
      asset: 'USDC' as AssetCode,
      memo: memos[i % memos.length],
      timestamp: new Date(Date.now() - i * 86_400_000).toISOString(),
      status: 'success' as const,
      stellarExpertUrl: getTxExplorerUrl(hash),
    };
  });
}
