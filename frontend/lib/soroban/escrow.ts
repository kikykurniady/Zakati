/**
 * Browser client for the zakat escrow Soroban contract.
 *
 * The acting party (muzakki for deposit, amil for verify/distribute) is always
 * the transaction source, so Soroban's `require_auth` is satisfied by
 * source-account authorization — the wallet signing the assembled transaction
 * is enough, with no separate auth-entry signing.
 */
import {
  Address,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
  xdr,
} from '@stellar/stellar-sdk';
import { BASE_FEE, NETWORK_PASSPHRASE } from '@/lib/stellar/config';
import {
  IDR_DECIMALS,
  SOROBAN_RPC_URL,
  ZAKAT_ESCROW_CONTRACT_ID,
} from './config';
import { logger } from '@/lib/logger';

const CONTEXT = 'soroban/escrow';

/** A function that signs a transaction XDR with the connected wallet. */
export type SignTx = (xdr: string) => Promise<string>;

export interface EscrowRecipient {
  address: string;
  /** Whole IDR amount, e.g. "60000". */
  amount: string;
}

function server(): rpc.Server {
  return new rpc.Server(SOROBAN_RPC_URL);
}

/** Convert a whole-IDR string to the token's integer (7-decimal) units. */
export function toTokenUnits(wholeAmount: string): bigint {
  const [intPart, fracPart = ''] = wholeAmount.trim().split('.');
  const frac = (fracPart + '0'.repeat(IDR_DECIMALS)).slice(0, IDR_DECIMALS);
  return BigInt(`${intPart || '0'}${frac}`);
}

function amountScVal(wholeAmount: string): xdr.ScVal {
  return nativeToScVal(toTokenUnits(wholeAmount), { type: 'i128' });
}

/**
 * Build → simulate/assemble → sign → submit → poll a contract invocation.
 * Returns the transaction hash once the ledger confirms success.
 */
async function invoke(
  sourcePublicKey: string,
  op: xdr.Operation,
  sign: SignTx,
): Promise<string> {
  const srv = server();
  const source = await srv.getAccount(sourcePublicKey);
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  // simulate + attach Soroban resources/auth in one step
  const prepared = await srv.prepareTransaction(tx);
  const signedXdr = await sign(prepared.toXDR());
  const signed = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  const sent = await srv.sendTransaction(signed);
  if (sent.status === 'ERROR') {
    throw new Error('Transaksi kontrak ditolak jaringan.');
  }

  // Poll until the ledger includes the transaction.
  for (let i = 0; i < 30; i += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await srv.getTransaction(sent.hash);
    if (res.status === 'SUCCESS') {
      logger.info(CONTEXT, `Invocation confirmed: ${sent.hash}`);
      return sent.hash;
    }
    if (res.status === 'FAILED') {
      throw new Error('Transaksi kontrak gagal di ledger.');
    }
  }
  throw new Error('Timeout menunggu konfirmasi transaksi kontrak.');
}

function escrow(): Contract {
  return new Contract(ZAKAT_ESCROW_CONTRACT_ID);
}

/** Muzakki → escrow: deposit zakat into a program's escrow. */
export function deposit(
  params: { from: string; amount: string; program: string },
  sign: SignTx,
): Promise<string> {
  const op = escrow().call(
    'deposit',
    Address.fromString(params.from).toScVal(),
    amountScVal(params.amount),
    nativeToScVal(params.program, { type: 'symbol' }),
  );
  return invoke(params.from, op, sign);
}

/** Amil → escrow: verify a mustahiq under an asnaf category. */
export function verifyMustahiq(
  params: { amil: string; addr: string; asnaf: string },
  sign: SignTx,
): Promise<string> {
  const op = escrow().call(
    'verify_mustahiq',
    Address.fromString(params.addr).toScVal(),
    nativeToScVal(params.asnaf, { type: 'symbol' }),
  );
  return invoke(params.amil, op, sign);
}

/** Amil → escrow: release escrowed funds to verified mustahiq. */
export function distribute(
  params: { amil: string; program: string; recipients: EscrowRecipient[] },
  sign: SignTx,
): Promise<string> {
  const recipients = xdr.ScVal.scvVec(
    params.recipients.map((r) =>
      xdr.ScVal.scvVec([
        Address.fromString(r.address).toScVal(),
        amountScVal(r.amount),
      ]),
    ),
  );
  const op = escrow().call(
    'distribute',
    nativeToScVal(params.program, { type: 'symbol' }),
    recipients,
  );
  return invoke(params.amil, op, sign);
}

/** Read a program's collected/distributed totals (simulation only, no signing). */
export async function readProgram(
  sourcePublicKey: string,
  program: string,
): Promise<{ collected: bigint; distributed: bigint }> {
  const srv = server();
  const source = await srv.getAccount(sourcePublicKey);
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(escrow().call('program', nativeToScVal(program, { type: 'symbol' })))
    .setTimeout(30)
    .build();

  const sim = await srv.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim) || !sim.result) {
    throw new Error('Gagal membaca data program escrow.');
  }
  const stats = scValToNative(sim.result.retval) as {
    collected: bigint;
    distributed: bigint;
  };
  return stats;
}
