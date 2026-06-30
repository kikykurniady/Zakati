/**
 * HTTP 402 "Payment Required" support, following the **x402** protocol shape.
 *
 * A resource server replies `402` with an `accepts` block describing how to
 * pay; the client pays on-chain and retries with an `X-PAYMENT` header carrying
 * a base64-encoded payment payload. Here the settlement rail is the Soroban
 * {@link https://developers.stellar.org Zakat Escrow} contract and the asset is
 * an IDR token.
 *
 * Scope: the 402 protocol is real; on-chain settlement verification is
 * simulated for the PoC (see {@link verifyEscrowPayment}).
 */
import { IDR } from './idr';

/** x402 envelope version implemented here. */
export const X402_VERSION = 1;

/** Network + contract identifiers used to build payment requirements. */
const NETWORK = process.env.X402_NETWORK ?? 'stellar-testnet';
const ESCROW_CONTRACT_ID =
  process.env.ZAKAT_ESCROW_CONTRACT_ID ?? 'CDEMO_ESCROW_CONTRACT_ID_PLACEHOLDER';
const IDR_TOKEN_CONTRACT_ID =
  process.env.IDR_TOKEN_CONTRACT_ID ?? 'CDEMO_IDR_TOKEN_CONTRACT_ID_PLACEHOLDER';

/** Settlement scheme advertised to clients. */
export const PAYMENT_SCHEME = 'soroban-escrow';

/** One acceptable way to pay, per the x402 `accepts` schema. */
export interface PaymentRequirements {
  scheme: string;
  network: string;
  /** IDR token contract address. */
  asset: string;
  /** Required amount, integer IDR as a string. */
  amount: string;
  /** Escrow contract that should receive the deposit. */
  payTo: string;
  resource: string;
  description: string;
  maxTimeoutSeconds: number;
  extra: {
    currency: string;
    decimals: number;
    programId: string;
    displayAmount: string;
  };
}

/** The body returned with an HTTP 402 response. */
export interface X402Challenge {
  x402Version: number;
  accepts: PaymentRequirements[];
  error?: string;
}

/** Decoded `X-PAYMENT` header payload. */
export interface PaymentPayload {
  scheme: string;
  network: string;
  /** Payer (muzakki) address. */
  from: string;
  /** Paid amount, integer IDR as a string. */
  amount: string;
  programId: string;
  /** On-chain reference proving settlement (tx hash or invocation id). */
  txHash?: string;
  proof?: string;
}

/** Result of settlement verification. */
export interface SettlementResult {
  settled: boolean;
  txHash?: string;
  reason?: string;
}

export interface PaymentTarget {
  programId: string;
  amount: string | number;
}

/** Build a single x402 payment-requirement entry for a zakat payment. */
export function buildPaymentRequirements(
  target: PaymentTarget,
): PaymentRequirements {
  const amount = String(target.amount);
  return {
    scheme: PAYMENT_SCHEME,
    network: NETWORK,
    asset: IDR_TOKEN_CONTRACT_ID,
    amount,
    payTo: ESCROW_CONTRACT_ID,
    resource: '/api/zakat/pay',
    description: `Zakat untuk program ${target.programId}`,
    maxTimeoutSeconds: 120,
    extra: {
      currency: IDR.code,
      decimals: IDR.decimals,
      programId: target.programId,
      displayAmount: formatDisplay(amount),
    },
  };
}

/** Build the full HTTP 402 challenge body. */
export function buildChallenge(
  target: PaymentTarget,
  error?: string,
): X402Challenge {
  return {
    x402Version: X402_VERSION,
    accepts: [buildPaymentRequirements(target)],
    ...(error ? { error } : {}),
  };
}

/** Decode a base64 `X-PAYMENT` header into a payload. Throws if malformed. */
export function decodePaymentHeader(header: string): PaymentPayload {
  let json: string;
  try {
    json = Buffer.from(header, 'base64').toString('utf-8');
  } catch {
    throw new Error('Header X-PAYMENT bukan base64 yang valid.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Header X-PAYMENT bukan JSON yang valid.');
  }
  const p = parsed as Partial<PaymentPayload>;
  if (!p || typeof p.from !== 'string' || typeof p.amount !== 'string' || typeof p.programId !== 'string') {
    throw new Error('Payload X-PAYMENT tidak lengkap (from/amount/programId).');
  }
  return {
    scheme: p.scheme ?? PAYMENT_SCHEME,
    network: p.network ?? NETWORK,
    from: p.from,
    amount: p.amount,
    programId: p.programId,
    txHash: p.txHash,
    proof: p.proof,
  };
}

/** Encode a payload back into an `X-PAYMENT` header value (used by clients/tests). */
export function encodePaymentHeader(payload: PaymentPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
}

/** Check a decoded payload against what the resource requires. */
export function validatePaymentPayload(
  payload: PaymentPayload,
  expected: PaymentTarget,
): { ok: boolean; reason?: string } {
  if (payload.programId !== expected.programId) {
    return { ok: false, reason: 'Program zakat tidak cocok.' };
  }
  if (payload.amount !== String(expected.amount)) {
    return { ok: false, reason: 'Jumlah pembayaran tidak cocok.' };
  }
  if (payload.scheme !== PAYMENT_SCHEME) {
    return { ok: false, reason: `Skema pembayaran tidak didukung: ${payload.scheme}.` };
  }
  return { ok: true };
}

/**
 * Verify that the payment settled into the escrow.
 *
 * PoC: accepts any well-formed payload carrying an on-chain reference
 * (`txHash`/`proof`). Replace the body of this function with a real
 * Soroban-RPC / Horizon lookup against {@link ESCROW_CONTRACT_ID} once the
 * contract is deployed (see docs/soroban-escrow-poc.md).
 */
export function verifyEscrowPayment(payload: PaymentPayload): SettlementResult {
  const reference = payload.txHash ?? payload.proof;
  if (!reference) {
    return { settled: false, reason: 'Bukti pembayaran (txHash/proof) tidak ada.' };
  }
  return { settled: true, txHash: reference };
}

function formatDisplay(amount: string): string {
  const grouped = amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp${grouped}`;
}
