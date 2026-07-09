/**
 * Zakati shared type definitions.
 *
 * These interfaces describe every domain entity used across the Stellar
 * utilities, REST API, and (mirrored) the React frontend. Keep this file
 * free of runtime/SDK imports so it can be shared verbatim with the client.
 */

/** A supported on-chain asset, expressed in the simple form used by the UI. */
export type AssetCode = 'XLM' | 'USDC';

/** Generic lifecycle status for a single transaction. */
export type TransactionStatus = 'pending' | 'success' | 'failed';

/**
 * Snapshot of a Stellar account relevant to Zakati.
 */
export interface StellarAccount {
  /** Ed25519 public key (G...). */
  publicKey: string;
  /** Native XLM balance, formatted to 7 decimals, e.g. "100.0000000". */
  xlmBalance: string;
  /** USDC balance, "0" when no trustline exists. */
  usdcBalance: string;
  /** Whether the account exists and is funded on-chain. */
  isActive: boolean;
  /** Whether the account holds a USDC trustline. */
  hasTrustline: boolean;
}

/**
 * Wallet connection state surfaced to the UI (Freighter).
 */
export interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  isLoading: boolean;
  error: string | null;
  network: 'TESTNET' | 'PUBLIC' | null;
}

/**
 * A registered zakat-managing institution (Amil / Lembaga).
 */
export interface LembagaAmil {
  id: string;
  name: string;
  description: string;
  /** Stellar address that receives zakat for this institution. */
  stellarAddress: string;
  /** Total zakat collected (incoming), in USDC. */
  totalTerkumpul: string;
  /** Total distributed to mustahiq (outgoing), in USDC. */
  totalTerdistribusi: string;
  jumlahMuzakki: number;
  jumlahMustahiq: number;
  isVerified: boolean;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
}

/**
 * A zakat recipient. The displayed name is privacy-masked.
 */
export interface Mustahiq {
  id: string;
  /** Privacy-masked display name, e.g. "Ahmad S.". */
  name: string;
  stellarAddress: string;
  /** Amount received, in USDC. */
  nominalDiterima: string;
  status: 'pending' | 'distributed';
  createdAt: string;
  /** Distribution transaction hash, present once distributed. */
  txHash?: string;
}

/**
 * A mustahiq registered by an amil, tagged with the asnaf (golongan) that makes
 * them eligible to receive zakat. Persisted in the mustahiq registry so
 * distributions can be checked against a syar'i-valid recipient category.
 */
export interface MustahiqRegistration {
  /** Recipient's Stellar address (G...). */
  stellarAddress: string;
  /** Asnaf code — one of the eight (see lib/asnaf). */
  asnaf: string;
  /** Privacy-masked display name, e.g. "Ahmad S.". */
  name: string;
  /** Id of the registering institution, or "" when unaffiliated. */
  lembagaId: string;
  /** ISO-8601 timestamp of registration. */
  verifiedAt: string;
}

/**
 * A zakat payment (Muzakki → Amil), parsed from Horizon.
 */
export interface ZakatTransaction {
  txHash: string;
  from: string;
  to: string;
  /** Amount in whole asset units (not stroops). */
  amount: string;
  asset: AssetCode;
  /** Optional text memo attached to the transaction. */
  memo: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  status: TransactionStatus;
  /** Link to the transaction on Stellar Expert. */
  stellarExpertUrl: string;
}

/**
 * Inbound/outbound totals for a single asset at one address.
 *
 * Totals are always grouped by asset: summing XLM and USDC into one figure
 * would misreport balances on a transparency report.
 */
export interface AssetFlow {
  /** Asset code, e.g. "USDC" or "XLM". */
  asset: string;
  /** Total received (incoming), formatted to 7 decimals. */
  masuk: string;
  /** Total sent (outgoing), formatted to 7 decimals. */
  keluar: string;
  /** Net (masuk − keluar), formatted to 7 decimals. */
  saldo: string;
}

/** A single recipient inside a distribution batch. */
export interface DistributionRecipient {
  mustahiqId: string;
  address: string;
  amount: string;
  /** Privacy-masked name. */
  name: string;
}

/**
 * A grouped distribution event (Amil → many Mustahiq).
 */
export interface DistributionRecord {
  txHash: string;
  /** Logical batch id, derived from the on-chain memo. */
  batchId: string;
  recipients: DistributionRecipient[];
  totalAmount: string;
  fee: string;
  timestamp: string;
  status: TransactionStatus;
}

/** Input payload for building a batch distribution. */
export interface BatchDistributionInput {
  senderAddress: string;
  recipients: Array<{
    address: string;
    amount: string;
    name: string;
  }>;
}

/** Result of executing a batch distribution. */
export interface BatchDistributionResult {
  success: boolean;
  txHashes: string[];
  totalDistributed: string;
  recipientCount: number;
  failedRecipients?: DistributionRecipient[];
}

/**
 * Minimal subset of a Horizon transaction record consumed by Zakati.
 */
export interface HorizonTransaction {
  id: string;
  hash: string;
  ledger: number;
  created_at: string;
  source_account: string;
  memo?: string;
  memo_type?: string;
  successful: boolean;
  fee_charged: string;
}

/**
 * Minimal subset of a Horizon payment operation record.
 */
export interface HorizonPaymentOperation {
  id: string;
  type: string;
  type_i: number;
  transaction_hash: string;
  transaction_successful: boolean;
  created_at: string;
  from: string;
  to: string;
  amount: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}
