/**
 * SEP-10 (Stellar Web Authentication) client.
 *
 * Exchanges a wallet signature for a short-lived JWT the anchor requires on
 * every SEP-24 call. The anchor hands us a challenge transaction; the muzakki's
 * wallet signs it; we post it back and receive the token.
 */
import { logger } from '@/lib/logger';

const CONTEXT = 'anchor/sep10';

/** A function that signs a challenge XDR with the connected wallet. */
export type SignChallenge = (xdr: string) => Promise<string>;

/**
 * Run the SEP-10 handshake and return a JWT for `account`.
 *
 * @param webAuthEndpoint The anchor's WEB_AUTH_ENDPOINT (from stellar.toml).
 * @param account         The muzakki's Stellar address.
 * @param sign            Signs the challenge transaction (wallet).
 */
export async function authenticate(
  webAuthEndpoint: string,
  account: string,
  sign: SignChallenge,
): Promise<string> {
  // 1. Ask the anchor for a challenge transaction bound to this account.
  const challengeRes = await fetch(
    `${webAuthEndpoint}?account=${encodeURIComponent(account)}`,
  );
  if (!challengeRes.ok) {
    throw new Error('Anchor menolak permintaan autentikasi (SEP-10).');
  }
  const { transaction } = (await challengeRes.json()) as { transaction?: string };
  if (!transaction) {
    throw new Error('Anchor tidak mengirim challenge transaction.');
  }

  // 2. Sign the challenge with the muzakki's wallet.
  const signedXdr = await sign(transaction);

  // 3. Exchange the signed challenge for a JWT.
  const tokenRes = await fetch(webAuthEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: signedXdr }),
  });
  if (!tokenRes.ok) {
    throw new Error('Anchor menolak challenge yang ditandatangani (SEP-10).');
  }
  const { token } = (await tokenRes.json()) as { token?: string };
  if (!token) {
    throw new Error('Anchor tidak mengembalikan token autentikasi.');
  }

  logger.info(CONTEXT, `Authenticated with anchor for ${account.slice(0, 8)}…`);
  return token;
}
