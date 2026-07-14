'use client';

import { useCallback, useState } from 'react';
import type { BatchDistributionInput, BatchDistributionResult, DistributionRecipient } from '@/types';
import {
  buildBatchDistribution,
  buildDistributionBatch,
  chunkRecipients,
  estimateFee,
  submitTransaction,
} from '@/lib/stellar/transactions';
import { fetchAccountDetails, validateStellarAddress } from '@/lib/stellar/account';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { useFreighter } from './useFreighter';

const CONTEXT = 'hooks/useBatchDistribution';

/** A pre-flight problem with a single recipient row (0-based `index`). */
export interface RecipientIssue {
  index: number;
  address: string;
  reason: string;
}

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
  issues: RecipientIssue[] | null;
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

/**
 * Pre-flight check run before any signature is requested. Validates recipient
 * addresses/amounts and confirms the sender holds a USDC trustline with enough
 * balance, plus that every recipient is funded and USDC-ready — so failures
 * surface as actionable rows instead of an opaque Horizon error mid-batch.
 */
async function validateDistribution(
  input: BatchDistributionInput,
): Promise<RecipientIssue[]> {
  const issues: RecipientIssue[] = [];

  input.recipients.forEach((r, index) => {
    if (!validateStellarAddress(r.address)) {
      issues.push({ index, address: r.address, reason: 'Alamat Stellar tidak valid.' });
      return;
    }
    const amount = Number(r.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      issues.push({ index, address: r.address, reason: 'Nominal harus lebih dari 0.' });
    }
  });

  // Only network-check rows that passed the cheap synchronous checks above.
  const checkable = input.recipients
    .map((r, index) => ({ r, index }))
    .filter(({ index }) => !issues.some((i) => i.index === index));

  const accounts = await Promise.all(
    checkable.map(({ r }) =>
      fetchAccountDetails(r.address).catch(() => null),
    ),
  );

  accounts.forEach((acct, i) => {
    const { r, index } = checkable[i];
    if (!acct || !acct.isActive) {
      issues.push({ index, address: r.address, reason: 'Akun penerima belum aktif di jaringan.' });
    } else if (!acct.hasTrustline) {
      issues.push({ index, address: r.address, reason: 'Penerima belum menambahkan trustline USDC.' });
    }
  });

  // Sender readiness (reported against row -1 so the UI can show it separately).
  const sender = await fetchAccountDetails(input.senderAddress).catch(() => null);
  const total = input.recipients.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  if (!sender || !sender.isActive) {
    issues.push({ index: -1, address: input.senderAddress, reason: 'Wallet Amil belum aktif di jaringan.' });
  } else if (!sender.hasTrustline) {
    issues.push({ index: -1, address: input.senderAddress, reason: 'Wallet Amil belum punya trustline USDC.' });
  } else if (Number(sender.usdcBalance) < total) {
    issues.push({
      index: -1,
      address: input.senderAddress,
      reason: `Saldo USDC Amil (${sender.usdcBalance}) kurang dari total distribusi (${total}).`,
    });
  }

  return issues.sort((a, b) => a.index - b.index);
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
  const [issues, setIssues] = useState<RecipientIssue[] | null>(null);
  const [progress, setProgress] = useState<DistributionProgress>(DEFAULT_PROGRESS);
  const [results, setResults] = useState<BatchDistributionResult | null>(null);
  const [status, setStatus] = useState<DistributionStatus>('idle');
  const { signTransaction } = useFreighter();

  const distribute = useCallback(
    async (input: BatchDistributionInput) => {
      setIsLoading(true);
      setError(null);
      setIssues(null);
      setResults(null);
      setStatus('preparing');

      try {
        if (input.recipients.length === 0) {
          throw new Error('Daftar penerima tidak boleh kosong.');
        }

        // Pre-flight: never ask the user to sign a batch we already know will
        // fail on-chain (bad address, missing trustline, insufficient balance).
        const foundIssues = await validateDistribution(input);
        if (foundIssues.length > 0) {
          setIssues(foundIssues);
          setError('Perbaiki penerima bermasalah sebelum mendistribusikan.');
          setStatus('failed');
          return;
        }

        const batches = chunkRecipients(input.recipients);
        const totalAmount = input.recipients
          .reduce((sum, r) => sum + Number(r.amount), 0)
          .toFixed(7);

        const txHashes: string[] = [];
        const failedRecipients: DistributionRecipient[] = [];
        let processedCount = 0;

        setProgress({
          current: 0,
          total: input.recipients.length,
          currentBatch: 0,
          totalBatches: batches.length,
        });

        for (let i = 0; i < batches.length; i += 1) {
          const batch = batches[i];
          setProgress((p) => ({ ...p, currentBatch: i + 1 }));

          try {
            // Build each batch fresh so a prior batch's failure never leaves a
            // sequence gap that would cascade into every following batch.
            const tx = await buildDistributionBatch(input.senderAddress, batch, i);

            setStatus('signing');
            const signedXdr = await signTransaction(tx.toXDR());

            setStatus('submitting');
            const result = await submitTransaction(signedXdr);
            txHashes.push(result.txHash);
            processedCount += batch.length;
            setProgress((p) => ({ ...p, current: processedCount }));
            logger.info(CONTEXT, `Batch ${i + 1}/${batches.length} submitted: ${result.txHash}`);
          } catch (batchErr) {
            const failed = batch.map((r, j) => ({
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
        setStatus(
          success
            ? 'complete'
            : failedRecipients.length === input.recipients.length
              ? 'failed'
              : 'partial',
        );
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
    setIssues(null);
    setProgress(DEFAULT_PROGRESS);
    setResults(null);
    setStatus('idle');
  }, []);

  return { isLoading, error, issues, progress, results, status, distribute, preview, reset };
}
