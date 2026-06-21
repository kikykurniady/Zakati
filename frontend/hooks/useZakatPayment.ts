'use client';

import { useCallback, useState } from 'react';
import { buildZakatPayment } from '@/lib/stellar/transactions';
import { validateStellarAddress, checkUSDCTrustline } from '@/lib/stellar/account';
import { getErrorMessage, InvalidAddressError, TrustlineNotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { useFreighter } from './useFreighter';

const CONTEXT = 'hooks/useZakatPayment';
const LS_RECOVERY_KEY = 'zakati_last_tx';

export type PaymentStatus =
  | 'idle'
  | 'building'
  | 'signing'
  | 'submitting'
  | 'success'
  | 'failed';

export interface UseZakatPaymentReturn {
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  explorerUrl: string | null;
  status: PaymentStatus;
  sendZakat: (params: {
    fromAddress: string;
    toAddress: string;
    amount: string;
    asset: 'XLM' | 'USDC';
    memo?: string;
  }) => Promise<void>;
  reset: () => void;
}

export function useZakatPayment(): UseZakatPaymentReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const { signTransaction } = useFreighter();

  const sendZakat = useCallback(
    async (params: {
      fromAddress: string;
      toAddress: string;
      amount: string;
      asset: 'XLM' | 'USDC';
      memo?: string;
    }) => {
      const { fromAddress, toAddress, amount, asset, memo } = params;

      if (!validateStellarAddress(toAddress)) throw new InvalidAddressError();
      if (Number(amount) <= 0) throw new Error('Jumlah harus lebih dari 0.');

      setIsLoading(true);
      setError(null);
      setStatus('building');

      try {
        if (asset === 'USDC') {
          const hasTrustline = await checkUSDCTrustline(toAddress);
          if (!hasTrustline) throw new TrustlineNotFoundError();
        }

        const tx = await buildZakatPayment({ fromAddress, toAddress, amount, asset, memo });
        logger.info(CONTEXT, 'Transaction built');

        setStatus('signing');
        const signedXdr = await signTransaction(tx.toXDR());
        logger.info(CONTEXT, 'Transaction signed');

        setStatus('submitting');
        const { submitTransaction } = await import('@/lib/stellar/transactions');
        const result = await submitTransaction(signedXdr);

        setTxHash(result.txHash);
        setExplorerUrl(result.explorerUrl);
        setStatus('success');

        if (typeof window !== 'undefined') {
          localStorage.setItem(LS_RECOVERY_KEY, JSON.stringify(result));
        }
        logger.info(CONTEXT, `Payment success: ${result.txHash}`);
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        setStatus('failed');
        logger.error(CONTEXT, 'sendZakat failed', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [signTransaction],
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setTxHash(null);
    setExplorerUrl(null);
    setStatus('idle');
  }, []);

  return { isLoading, error, txHash, explorerUrl, status, sendZakat, reset };
}
