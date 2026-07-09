/**
 * SEP-24 (hosted deposit/withdrawal) client — interactive deposit flow.
 *
 * The muzakki gets an interactive URL where the anchor collects fiat and KYC;
 * once complete, the anchor sends the asset to the muzakki's Stellar account.
 */
import { logger } from '@/lib/logger';

const CONTEXT = 'anchor/sep24';

/** Lifecycle status reported by the anchor for a deposit. */
export type AnchorTxStatus =
  | 'incomplete'
  | 'pending_user_transfer_start'
  | 'pending_anchor'
  | 'pending_stellar'
  | 'completed'
  | 'error'
  | 'refunded'
  | (string & {});

export interface InteractiveDeposit {
  /** URL to open (popup) for the anchor's hosted deposit UI. */
  url: string;
  /** Anchor transaction id, for polling. */
  id: string;
}

/** Start a SEP-24 interactive deposit; returns the hosted URL + tx id. */
export async function startInteractiveDeposit(params: {
  sep24Endpoint: string;
  token: string;
  assetCode: string;
  account: string;
}): Promise<InteractiveDeposit> {
  const { sep24Endpoint, token, assetCode, account } = params;
  const res = await fetch(`${sep24Endpoint}/transactions/deposit/interactive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ asset_code: assetCode, account }),
  });
  if (!res.ok) {
    throw new Error('Anchor menolak permintaan deposit (SEP-24).');
  }
  const data = (await res.json()) as { url?: string; id?: string };
  if (!data.url || !data.id) {
    throw new Error('Anchor tidak mengembalikan URL deposit.');
  }
  logger.info(CONTEXT, `Interactive deposit started: ${data.id}`);
  return { url: data.url, id: data.id };
}

/** Fetch the current status of an anchor deposit transaction. */
export async function getAnchorTransaction(params: {
  sep24Endpoint: string;
  token: string;
  id: string;
}): Promise<{ status: AnchorTxStatus; amountOut: string | null }> {
  const { sep24Endpoint, token, id } = params;
  const res = await fetch(
    `${sep24Endpoint}/transaction?id=${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error('Gagal memeriksa status transaksi anchor.');
  }
  const data = (await res.json()) as {
    transaction?: { status?: AnchorTxStatus; amount_out?: string };
  };
  return {
    status: data.transaction?.status ?? 'error',
    amountOut: data.transaction?.amount_out ?? null,
  };
}
