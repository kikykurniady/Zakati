'use client';

import { useCallback, useState } from 'react';
import { useFreighter } from '@/hooks/useFreighter';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  deposit as escrowDeposit,
  distribute as escrowDistribute,
  verifyMustahiq as escrowVerify,
  type EscrowRecipient,
} from '@/lib/soroban/escrow';

const CONTEXT = 'hooks/useEscrow';

export type EscrowStatus = 'idle' | 'working' | 'success' | 'failed';

export interface EscrowVerifiedRecipient extends EscrowRecipient {
  /** Asnaf code the amil verifies this recipient under. */
  asnaf: string;
}

export interface UseEscrowReturn {
  status: EscrowStatus;
  error: string | null;
  /** Hash of the last successful invocation. */
  txHash: string | null;
  /** Muzakki deposits zakat into a program's escrow. */
  deposit: (amount: string, program: string) => Promise<void>;
  /**
   * Amil distributes on-chain: verify each recipient under their asnaf, then
   * release escrowed funds. The contract itself also rejects any unverified
   * recipient, so this is defence in depth.
   */
  distribute: (program: string, recipients: EscrowVerifiedRecipient[]) => Promise<void>;
  reset: () => void;
}

/** Drive the asnaf-enforced escrow contract from muzakki/amil wallets. */
export function useEscrow(): UseEscrowReturn {
  const { publicKey, signTransaction } = useFreighter();
  const [status, setStatus] = useState<EscrowStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
  }, []);

  const deposit = useCallback(
    async (amount: string, program: string) => {
      if (!publicKey) return;
      setStatus('working');
      setError(null);
      try {
        const hash = await escrowDeposit(
          { from: publicKey, amount, program },
          signTransaction,
        );
        setTxHash(hash);
        setStatus('success');
      } catch (err) {
        setError(getErrorMessage(err));
        setStatus('failed');
        logger.error(CONTEXT, 'deposit failed', err);
      }
    },
    [publicKey, signTransaction],
  );

  const distribute = useCallback(
    async (program: string, recipients: EscrowVerifiedRecipient[]) => {
      if (!publicKey) return;
      setStatus('working');
      setError(null);
      try {
        // Verify each recipient's asnaf on-chain before releasing funds.
        for (const r of recipients) {
          await escrowVerify(
            { amil: publicKey, addr: r.address, asnaf: r.asnaf },
            signTransaction,
          );
        }
        const hash = await escrowDistribute(
          { amil: publicKey, program, recipients },
          signTransaction,
        );
        setTxHash(hash);
        setStatus('success');
      } catch (err) {
        setError(getErrorMessage(err));
        setStatus('failed');
        logger.error(CONTEXT, 'distribute failed', err);
      }
    },
    [publicKey, signTransaction],
  );

  return { status, error, txHash, deposit, distribute, reset };
}
