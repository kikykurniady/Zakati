'use client';

import { useCallback, useState } from 'react';
import type { BatchDistributionInput, BatchDistributionResult, DistributionRecipient } from '@/types';
import { buildBatchDistribution, estimateFee, submitTransaction } from '@/lib/stellar/transactions';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { useFreighter } from './useFreighter';

const CONTEXT = 'hooks/useBatchDistribution';

export type DistributionStatus =
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'submitting'
  | 'complete'
  | 'partial'
  | 'failed';

export interface DistributionProgress {
  current: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
}

export interface UseBatchDistributionReturn {
  isLoading: boolean;
  error: string | null;
  progress: DistributionProgress;
  results: BatchDistributionResult | null;
  status: DistributionStatus;
  distribute: (input: BatchDistributionInput) => Promise<void>;
  preview: (input: BatchDistributionInput) => Promise<{
    batchCount: number;
    totalAmount: string;
    estimatedFee: string;
    recipientCount: number;
  }>;
  reset: () => void;
}

const DEFAULT_PROGRESS: DistributionProgress = {
  current: 0,
  total: 0,
  currentBatch: 0,
  totalBatches: 0,
};

export function useBatchDistribution(): UseBatchDistributionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<DistributionProgress>(DEFAULT_PROGRESS);
  const [results, setResults] = useState<BatchDistributionResult | null>(null);
  const [status, setStatus] = useState<DistributionStatus>('idle');
  const { signTransaction } = useFreighter();

  const distribute = useCallback(
    async (input: BatchDistributionInput) => {
      setIsLoading(true);
      setError(null);
      setResults(null);
      setStatus('preparing');

      try {
        const { transactions, totalAmount, batchCount } =
          await buildBatchDistribution(input);

        const txHashes: string[] = [];
        const failedRecipients: DistributionRecipient[] = [];
        let processedCount = 0;

        setProgress({ current: 0, total: input.recipients.length, currentBatch: 0, totalBatches: batchCount });

        for (let i = 0; i < transactions.length; i += 1) {
          const batchSize = Math.min(
            100,
            input.recipients.length - i * 100,
          );
          setProgress((p) => ({ ...p, currentBatch: i + 1 }));

          try {
            setStatus('signing');
            const signedXdr = await signTransaction(transactions[i].toXDR());

            setStatus('submitting');
            const result = await submitTransaction(signedXdr);
            txHashes.push(result.txHash);
            processedCount += batchSize;
            setProgress((p) => ({ ...p, current: processedCount }));
            logger.info(CONTEXT, `Batch ${i + 1}/${batchCount} submitted: ${result.txHash}`);
          } catch (batchErr) {
            const batchStart = i * 100;
            const failed = input.recipients
              .slice(batchStart, batchStart + batchSize)
              .map((r, j) => ({
                mustahiqId: `failed-${i}-${j}`,
                address: r.address,
                amount: r.amount,
                name: r.name,
              }));
            failedRecipients.push(...failed);
            logger.error(CONTEXT, `Batch ${i + 1} failed`, batchErr);
          }
        }

        const success = failedRecipients.length === 0;
        setStatus(success ? 'complete' : failedRecipients.length === input.recipients.length ? 'failed' : 'partial');
        setResults({
          success,
          txHashes,
          totalDistributed: totalAmount,
          recipientCount: input.recipients.length - failedRecipients.length,
          failedRecipients: failedRecipients.length > 0 ? failedRecipients : undefined,
        });
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        setStatus('failed');
        logger.error(CONTEXT, 'distribute failed', err);
      } finally {
        setIsLoading(false);
      }
    },
    [signTransaction],
  );

  const preview = useCallback(
    async (input: BatchDistributionInput) => {
      const { batchCount, totalAmount } = await buildBatchDistribution(input);
      return {
        batchCount,
        totalAmount,
        estimatedFee: estimateFee(input.recipients.length),
        recipientCount: input.recipients.length,
      };
    },
    [],
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setProgress(DEFAULT_PROGRESS);
    setResults(null);
    setStatus('idle');
  }, []);

  return { isLoading, error, progress, results, status, distribute, preview, reset };
}
