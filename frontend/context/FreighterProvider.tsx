'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Transaction } from '@stellar/stellar-sdk';
import { submitTransaction } from '@/lib/stellar/transactions';
import {
  WalletNotConnectedError,
  WalletNotInstalledError,
  NetworkMismatchError,
  getErrorMessage,
} from '@/lib/errors';
import { logger } from '@/lib/logger';

const CONTEXT = 'context/FreighterProvider';
const LS_CONNECTED_KEY = 'zakati_wallet_connected';

type FreighterApi = typeof import('@stellar/freighter-api');

/** Lazily import Freighter only on the client to avoid SSR crashes. */
async function loadFreighter(): Promise<FreighterApi> {
  return import('@stellar/freighter-api');
}

export interface UseFreighterReturn {
  isConnected: boolean;
  publicKey: string | null;
  isLoading: boolean;
  error: string | null;
  isFreighterInstalled: boolean;
  network: 'TESTNET' | 'PUBLIC' | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  signTransaction: (xdr: string) => Promise<string>;
  signAndSubmit: (
    transaction: Transaction,
  ) => Promise<{ txHash: string; explorerUrl: string }>;
}

/**
 * The single source of truth for wallet state. Instantiated exactly once by
 * {@link FreighterProvider}; every component reads it via {@link useFreighter}.
 *
 * Previously this lived in a hook that each component called independently,
 * which produced divergent connection state across the tree (a connect in one
 * component was invisible to the payment/distribution hooks until a reload).
 */
function useFreighterState(): UseFreighterReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState(false);
  const [network, setNetwork] = useState<'TESTNET' | 'PUBLIC' | null>(null);

  const freighterRef = useRef<FreighterApi | null>(null);

  /** Check install status on mount (client only). */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    (async () => {
      try {
        const api = await loadFreighter();
        freighterRef.current = api;
        const installed = await api.isConnected();
        if (!cancelled) setIsFreighterInstalled(installed.isConnected);

        // Auto-reconnect if the user previously connected.
        if (installed.isConnected && localStorage.getItem(LS_CONNECTED_KEY) === '1') {
          const addrResult = await api.getAddress();
          if (!cancelled && !addrResult.error && addrResult.address) {
            const netResult = await api.getNetwork();
            const net = netResult.network?.toUpperCase() as 'TESTNET' | 'PUBLIC' | null;
            setPublicKey(addrResult.address);
            setNetwork(net ?? null);
            setIsConnected(true);
          }
        }
      } catch (err) {
        logger.warn(CONTEXT, 'init check failed', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const connectWallet = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setIsLoading(true);
    setError(null);

    try {
      const api = freighterRef.current ?? await loadFreighter();
      freighterRef.current = api;

      const installedResult = await api.isConnected();
      if (!installedResult.isConnected) throw new WalletNotInstalledError();

      const accessResult = await api.requestAccess();
      if (accessResult.error || !accessResult.address) {
        throw new Error('Tidak bisa mendapatkan alamat dari Freighter.');
      }

      const netResult = await api.getNetwork();
      const net = netResult.network?.toUpperCase() as 'TESTNET' | 'PUBLIC' | undefined;
      if (net !== 'TESTNET') throw new NetworkMismatchError();

      setPublicKey(accessResult.address);
      setNetwork('TESTNET');
      setIsConnected(true);
      setIsFreighterInstalled(true);
      localStorage.setItem(LS_CONNECTED_KEY, '1');
      logger.info(CONTEXT, `Connected: ${accessResult.address.slice(0, 8)}…`);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      logger.error(CONTEXT, 'connectWallet failed', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setIsConnected(false);
    setPublicKey(null);
    setNetwork(null);
    setError(null);
    if (typeof window !== 'undefined') localStorage.removeItem(LS_CONNECTED_KEY);
    logger.info(CONTEXT, 'Disconnected wallet');
  }, []);

  const signTransaction = useCallback(async (xdr: string): Promise<string> => {
    if (!isConnected || !publicKey) throw new WalletNotConnectedError();
    setIsLoading(true);
    setError(null);

    try {
      const api = freighterRef.current ?? await loadFreighter();
      const result = await api.signTransaction(xdr, {
        networkPassphrase: (await api.getNetwork()).networkPassphrase ?? '',
      });
      if (result.error) throw new Error(result.error);
      return result.signedTxXdr;
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, publicKey]);

  const signAndSubmit = useCallback(
    async (
      transaction: Transaction,
    ): Promise<{ txHash: string; explorerUrl: string }> => {
      const signedXdr = await signTransaction(transaction.toXDR());
      return submitTransaction(signedXdr);
    },
    [signTransaction],
  );

  return {
    isConnected,
    publicKey,
    isLoading,
    error,
    isFreighterInstalled,
    network,
    connectWallet,
    disconnectWallet,
    signTransaction,
    signAndSubmit,
  };
}

const FreighterContext = createContext<UseFreighterReturn | null>(null);

/** Provides a single shared wallet state to the whole app. */
export function FreighterProvider({ children }: { children: ReactNode }) {
  const value = useFreighterState();
  return (
    <FreighterContext.Provider value={value}>
      {children}
    </FreighterContext.Provider>
  );
}

/** Read the shared wallet state. Must be used within {@link FreighterProvider}. */
export function useFreighter(): UseFreighterReturn {
  const ctx = useContext(FreighterContext);
  if (!ctx) {
    throw new Error('useFreighter must be used within <FreighterProvider>');
  }
  return ctx;
}
