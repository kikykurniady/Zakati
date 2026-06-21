'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StellarAccount } from '@/types';
import {
  fetchAccountDetails,
  validateStellarAddress,
} from '@/lib/stellar/account';
import { buildAddUSDCTrustline } from '@/lib/stellar/transactions';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { useFreighter } from './useFreighter';

const CONTEXT = 'hooks/useStellarAccount';
const REFRESH_INTERVAL_MS = 30_000;

export interface UseStellarAccountReturn {
  account: StellarAccount | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  addUSDCTrustline: () => Promise<void>;
}

export function useStellarAccount(
  publicKey: string | null,
): UseStellarAccountReturn {
  const [account, setAccount] = useState<StellarAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { signAndSubmit } = useFreighter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey || !validateStellarAddress(publicKey)) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAccountDetails(publicKey);
      setAccount(data);
      setLastUpdated(new Date());
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      logger.error(CONTEXT, 'refresh failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  // Fetch on publicKey change and auto-refresh every 30 s.
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!publicKey || !validateStellarAddress(publicKey)) {
      setAccount(null);
      return;
    }

    void refresh();
    intervalRef.current = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [publicKey, refresh]);

  const addUSDCTrustline = useCallback(async () => {
    if (!publicKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const tx = await buildAddUSDCTrustline(publicKey);
      await signAndSubmit(tx);
      await refresh();
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      logger.error(CONTEXT, 'addUSDCTrustline failed', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, signAndSubmit, refresh]);

  return { account, isLoading, error, lastUpdated, refresh, addUSDCTrustline };
}
