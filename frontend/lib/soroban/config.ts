/**
 * Soroban (smart-contract) configuration.
 *
 * Points at the deployed, asnaf-enforced zakat escrow and its IDR token on
 * Stellar Testnet. Overridable via NEXT_PUBLIC_* so a fresh deploy can be wired
 * in without a code change.
 */
export const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org';

/** Asnaf-enforced escrow (see contracts/zakat-escrow). */
export const ZAKAT_ESCROW_CONTRACT_ID =
  process.env.NEXT_PUBLIC_ZAKAT_ESCROW_CONTRACT_ID ??
  'CDXAY72KKR5ZUF2QSCX3IP7MB73GHSB3CQFZ5GAUQHD5LC7R45AGORIG';

/** IDR token (Stellar Asset Contract) the escrow settles in. */
export const IDR_TOKEN_CONTRACT_ID =
  process.env.NEXT_PUBLIC_IDR_TOKEN_CONTRACT_ID ??
  'CCSGSYYEN2LDNLOITGFI5QERSEV2ATR6FSFMALSUCHQ4NLAAC4VSTJSE';

/** IDR token decimals (Stellar assets use 7). */
export const IDR_DECIMALS = 7;
