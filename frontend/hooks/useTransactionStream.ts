'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ZakatTransaction } from '@/types';
import { parseHorizonPayment } from '@/lib/stellar/history';
import { HORIZON_URL } from '@/lib/stellar/config';
import { logger } from '@/lib/logger';

const CONTEXT = 'hooks/useTransactionStream';
const MAX_TRANSACTIONS = 50;
const MAX_RECONNECT_ATTEMPTS = 3;
const POLL_INTERVAL_MS = 10_000;

export interface UseTransactionStreamReturn {
  transactions: ZakatTransaction[];
  isStreaming: boolean;
  error: string | null;
  lastEvent: Date | null;
  reconnect: () => void;
  clearHistory: () => void;
}

/** Real-time payment stream for an account via Horizon SSE (poll fallback). */
export function useTransactionStream(
  accountAddress: string | null,
): UseTransactionStreamReturn {
  const [transactions, setTransactions] = useState<ZakatTransaction[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<Date | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttempts = useRef(0);
  const lastCursor = useRef<string>('now');

  const pushRecord = useCallback((record: ZakatTransaction) => {
    setTransactions((prev) => {
      if (prev.some((t) => t.txHash === record.txHash)) return prev;
      return [record, ...prev].slice(0, MAX_TRANSACTIONS);
    });
    setLastEvent(new Date());
  }, []);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  /** Polling fallback when EventSource is unavailable. */
  const startPolling = useCallback(
    (address: string) => {
      setIsStreaming(true);
      pollRef.current = setInterval(async () => {
        try {
          const url = `${HORIZON_URL}/accounts/${address}/payments?cursor=${lastCursor.current}&order=asc&limit=20`;
          const res = await fetch(url);
          const data = await res.json();
          const records = data?._embedded?.records ?? [];
          for (const r of records) {
            if (r.type !== 'payment') continue;
            lastCursor.current = r.paging_token;
            pushRecord(parseHorizonPayment(r));
          }
        } catch (err) {
          logger.warn(CONTEXT, 'poll failed', err);
        }
      }, POLL_INTERVAL_MS);
    },
    [pushRecord],
  );

  const startStream = useCallback(
    (address: string) => {
      cleanup();
      setError(null);

      if (typeof window === 'undefined') return;

      if (typeof EventSource === 'undefined') {
        logger.info(CONTEXT, 'EventSource unavailable, falling back to polling');
        startPolling(address);
        return;
      }

      const url = `${HORIZON_URL}/accounts/${address}/payments?cursor=now&order=asc`;
      const es = new EventSource(url);
      eventSourceRef.current = es;
      setIsStreaming(true);

      es.onmessage = (event: MessageEvent) => {
        try {
          const record = JSON.parse(event.data);
          if (record.type === 'payment') {
            lastCursor.current = record.paging_token ?? 'now';
            pushRecord(parseHorizonPayment(record));
          }
          reconnectAttempts.current = 0;
        } catch (err) {
          logger.warn(CONTEXT, 'failed to parse SSE event', err);
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        setIsStreaming(false);

        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          logger.warn(CONTEXT, `SSE drop, reconnect ${reconnectAttempts.current}`);
          setTimeout(() => startStream(address), 1000 * reconnectAttempts.current);
        } else {
          logger.warn(CONTEXT, 'max reconnects reached, switching to polling');
          startPolling(address);
        }
      };
    },
    [cleanup, pushRecord, startPolling],
  );

  useEffect(() => {
    if (!accountAddress) {
      cleanup();
      return;
    }
    reconnectAttempts.current = 0;
    lastCursor.current = 'now';
    startStream(accountAddress);
    return cleanup;
  }, [accountAddress, startStream, cleanup]);

  const reconnect = useCallback(() => {
    if (accountAddress) {
      reconnectAttempts.current = 0;
      startStream(accountAddress);
    }
  }, [accountAddress, startStream]);

  const clearHistory = useCallback(() => setTransactions([]), []);

  return { transactions, isStreaming, error, lastEvent, reconnect, clearHistory };
}
