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
import { NETWORK_PASSPHRASE, STELLAR_NETWORK } from '@/lib/stellar/config';
import {
  WalletNotConnectedError,
  NetworkMismatchError,
  getErrorMessage,
} from '@/lib/errors';
import { logger } from '@/lib/logger';

const CONTEXT = 'context/WalletProvider';
const LS_CONNECTED_KEY = 'zakati_wallet_connected';
const LS_WALLET_ID_KEY = 'zakati_wallet_id';

type StellarWalletsKit =
  typeof import('@creit.tech/stellar-wallets-kit')['StellarWalletsKit'];

/**
 * Lazily construct and initialise the Stellar Wallets Kit exactly once, on the
 * client. The kit renders web components that touch `window`/`document`, so it
 * must never be imported during SSR — every access goes through this promise.
 *
 * Modules enabled: Freighter, xBull, Albedo, Rabet, Lobstr, Hana. xBull and
 * Albedo are web-based, so they work in mobile browsers where extension-only
 * wallets like Freighter cannot run.
 */
let kitPromise: Promise<StellarWalletsKit> | null = null;

async function getKit(): Promise<StellarWalletsKit> {
  if (typeof window === 'undefined') {
    throw new Error('Wallet hanya tersedia di browser.');
  }
  if (!kitPromise) {
    kitPromise = (async () => {
      const [{ StellarWalletsKit, Networks }, freighter, xbull, albedo, rabet, lobstr, hana] =
        await Promise.all([
          import('@creit.tech/stellar-wallets-kit'),
          import('@creit.tech/stellar-wallets-kit/modules/freighter'),
          import('@creit.tech/stellar-wallets-kit/modules/xbull'),
          import('@creit.tech/stellar-wallets-kit/modules/albedo'),
          import('@creit.tech/stellar-wallets-kit/modules/rabet'),
          import('@creit.tech/stellar-wallets-kit/modules/lobstr'),
          import('@creit.tech/stellar-wallets-kit/modules/hana'),
        ]);

      StellarWalletsKit.init({
        network: STELLAR_NETWORK === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET,
        selectedWalletId: localStorage.getItem(LS_WALLET_ID_KEY) ?? undefined,
        modules: [
          new freighter.FreighterModule(),
          new xbull.xBullModule(),
          new albedo.AlbedoModule(),
          new rabet.RabetModule(),
          new lobstr.LobstrModule(),
          new hana.HanaModule(),
        ],
      });

      return StellarWalletsKit;
    })();
  }
  return kitPromise;
}

export interface UseFreighterReturn {
  isConnected: boolean;
  publicKey: string | null;
  isLoading: boolean;
  error: string | null;
  network: 'TESTNET' | 'PUBLIC' | null;
  /** Wallet id of the connected module, e.g. "freighter" | "albedo". */
  walletId: string | null;
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
 * Backed by the Stellar Wallets Kit, so the user picks from any supported
 * wallet (Freighter, xBull, Albedo, Rabet, Lobstr, Hana) via the kit's modal —
 * including web wallets that run on mobile browsers.
 */
function useFreighterState(): UseFreighterReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<'TESTNET' | 'PUBLIC' | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);

  const didInit = useRef(false);

  /** Restore a previous session on mount (client only). */
  useEffect(() => {
    if (typeof window === 'undefined' || didInit.current) return;
    didInit.current = true;

    if (localStorage.getItem(LS_CONNECTED_KEY) !== '1') return;

    let cancelled = false;
    (async () => {
      try {
        const kit = await getKit();
        const { address } = await kit.getAddress();
        if (!cancelled && address) {
          setPublicKey(address);
          setNetwork(STELLAR_NETWORK);
          setWalletId(localStorage.getItem(LS_WALLET_ID_KEY));
          setIsConnected(true);
        }
      } catch (err) {
        // e.g. Freighter permission not (re)granted — stay disconnected quietly.
        logger.warn(CONTEXT, 'auto-reconnect failed', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const connectWallet = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setIsLoading(true);
    setError(null);

    try {
      const kit = await getKit();
      // Opens the wallet-picker modal, sets the chosen module active, and
      // returns the address. Throws if the user closes it without choosing.
      const { address } = await kit.authModal();
      if (!address) throw new Error('Tidak mendapatkan alamat dari wallet.');

      // Reject a wallet locked to the wrong network when it exposes one.
      try {
        const net = await kit.getNetwork();
        if (net.networkPassphrase && net.networkPassphrase !== NETWORK_PASSPHRASE) {
          throw new NetworkMismatchError();
        }
      } catch (err) {
        if (err instanceof NetworkMismatchError) throw err;
        // Some wallets (e.g. Albedo) sign per-request and don't expose a
        // persistent network; don't block on an unreadable network.
      }

      const id = kit.selectedModule.productId;
      setPublicKey(address);
      setNetwork(STELLAR_NETWORK);
      setWalletId(id);
      setIsConnected(true);
      localStorage.setItem(LS_CONNECTED_KEY, '1');
      localStorage.setItem(LS_WALLET_ID_KEY, id);
      logger.info(CONTEXT, `Connected ${id}: ${address.slice(0, 8)}…`);
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
    setWalletId(null);
    setError(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LS_CONNECTED_KEY);
      localStorage.removeItem(LS_WALLET_ID_KEY);
      void getKit()
        .then((kit) => kit.disconnect())
        .catch((err) => logger.warn(CONTEXT, 'kit disconnect failed', err));
    }
    logger.info(CONTEXT, 'Disconnected wallet');
  }, []);

  const signTransaction = useCallback(
    async (xdr: string): Promise<string> => {
      if (!isConnected || !publicKey) throw new WalletNotConnectedError();
      setIsLoading(true);
      setError(null);

      try {
        const kit = await getKit();
        const { signedTxXdr } = await kit.signTransaction(xdr, {
          address: publicKey,
          networkPassphrase: NETWORK_PASSPHRASE,
        });
        return signedTxXdr;
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, publicKey],
  );

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
    network,
    walletId,
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
