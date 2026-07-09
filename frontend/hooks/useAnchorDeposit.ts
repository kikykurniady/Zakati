'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFreighter } from '@/hooks/useFreighter';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { ANCHOR_ASSET_CODE, fetchAnchorInfo } from '@/lib/anchor/config';
import { authenticate } from '@/lib/anchor/sep10';
import {
  getAnchorTransaction,
  startInteractiveDeposit,
  type AnchorTxStatus,
} from '@/lib/anchor/sep24';

const CONTEXT = 'hooks/useAnchorDeposit';
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000; // give the hosted flow up to 10 minutes

export type DepositStatus =
  | 'idle'
  | 'authenticating'
  | 'starting'
  | 'awaiting_user'
  | 'processing'
  | 'completed'
  | 'failed';

export interface UseAnchorDepositReturn {
  status: DepositStatus;
  error: string | null;
  /** Hosted deposit URL, exposed so the UI can offer a link if the popup is blocked. */
  interactiveUrl: string | null;
  start: () => Promise<void>;
  reset: () => void;
}

/** Map an anchor's SEP-24 status onto our coarse UI status. */
function mapStatus(anchor: AnchorTxStatus): DepositStatus {
  switch (anchor) {
    case 'completed':
      return 'completed';
    case 'error':
    case 'refunded':
      return 'failed';
    case 'pending_anchor':
    case 'pending_stellar':
      return 'processing';
    default:
      return 'awaiting_user';
  }
}

/**
 * Drive a SEP-24 interactive deposit: SEP-10 auth → open the anchor's hosted
 * page → poll until the anchor delivers the asset. `onCompleted` fires once the
 * deposit lands so callers can refresh the on-chain balance.
 */
export function useAnchorDeposit(onCompleted?: () => void): UseAnchorDepositReturn {
  const { publicKey, signTransaction } = useFreighter();
  const [status, setStatus] = useState<DepositStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [interactiveUrl, setInteractiveUrl] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    // Stop polling if the component unmounts mid-flow.
    return () => {
      cancelled.current = true;
    };
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setInteractiveUrl(null);
  }, []);

  const start = useCallback(async () => {
    if (!publicKey) return;
    cancelled.current = false;
    setError(null);
    setInteractiveUrl(null);

    try {
      setStatus('authenticating');
      const { webAuthEndpoint, sep24Endpoint } = await fetchAnchorInfo();
      const token = await authenticate(webAuthEndpoint, publicKey, signTransaction);

      setStatus('starting');
      const { url, id } = await startInteractiveDeposit({
        sep24Endpoint,
        token,
        assetCode: ANCHOR_ASSET_CODE,
        account: publicKey,
      });
      setInteractiveUrl(url);

      // Open the anchor's hosted deposit page. If the popup is blocked, the UI
      // still shows the link via `interactiveUrl`.
      window.open(url, 'zakati-anchor', 'popup,width=450,height=680');
      setStatus('awaiting_user');

      // Poll until the anchor reaches a terminal state or we time out.
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (!cancelled.current && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (cancelled.current) return;

        const { status: anchorStatus } = await getAnchorTransaction({
          sep24Endpoint,
          token,
          id,
        });
        const mapped = mapStatus(anchorStatus);
        setStatus(mapped);

        if (mapped === 'completed') {
          logger.info(CONTEXT, `Deposit ${id} completed`);
          onCompleted?.();
          return;
        }
        if (mapped === 'failed') {
          setError('Deposit dibatalkan atau gagal di anchor.');
          return;
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus('failed');
      logger.error(CONTEXT, 'anchor deposit failed', err);
    }
  }, [publicKey, signTransaction, onCompleted]);

  return { status, error, interactiveUrl, start, reset };
}
