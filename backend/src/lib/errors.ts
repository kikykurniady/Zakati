/**
 * Centralised error handling for Zakati.
 *
 * Every thrown error carries a stable machine `code` and a user-facing
 * `userMessage` in Bahasa Indonesia, so the UI can always show something
 * meaningful without leaking internal detail.
 */

/** Base error class for all Zakati domain errors. */
export class ZakatiError extends Error {
  /** Stable machine-readable code, e.g. "WALLET_NOT_INSTALLED". */
  public readonly code: string;
  /** Safe, user-facing message in Bahasa Indonesia. */
  public readonly userMessage: string;

  constructor(code: string, userMessage: string, message?: string) {
    super(message ?? userMessage);
    this.name = 'ZakatiError';
    this.code = code;
    this.userMessage = userMessage;
    // Restore prototype chain (needed when targeting ES5/older runtimes).
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Freighter browser extension is not installed. */
export class WalletNotInstalledError extends ZakatiError {
  constructor() {
    super('WALLET_NOT_INSTALLED', 'Freighter wallet belum terinstall.');
  }
}

/** No wallet is connected. */
export class WalletNotConnectedError extends ZakatiError {
  constructor() {
    super('WALLET_NOT_CONNECTED', 'Wallet belum terhubung.');
  }
}

/** Account does not have enough balance for the operation. */
export class InsufficientBalanceError extends ZakatiError {
  constructor() {
    super('INSUFFICIENT_BALANCE', 'Saldo tidak mencukupi.');
  }
}

/** USDC trustline is missing on the account. */
export class TrustlineNotFoundError extends ZakatiError {
  constructor() {
    super('TRUSTLINE_NOT_FOUND', 'USDC trustline belum ditambahkan.');
  }
}

/** A submitted transaction failed on-chain. */
export class TransactionFailedError extends ZakatiError {
  constructor(userMessage = 'Transaksi gagal diproses.', message?: string) {
    super('TRANSACTION_FAILED', userMessage, message);
  }
}

/** Wallet is connected to the wrong network. */
export class NetworkMismatchError extends ZakatiError {
  constructor() {
    super('NETWORK_MISMATCH', 'Gunakan Stellar Testnet.');
  }
}

/** A provided Stellar address is invalid. */
export class InvalidAddressError extends ZakatiError {
  constructor() {
    super('INVALID_ADDRESS', 'Alamat Stellar tidak valid.');
  }
}

/**
 * Map of common Horizon result codes to user-friendly Indonesian messages.
 */
const RESULT_CODE_MESSAGES: Record<string, string> = {
  tx_bad_auth: 'Tanda tangan transaksi tidak valid.',
  tx_bad_auth_extra: 'Tanda tangan transaksi tidak valid.',
  tx_insufficient_fee: 'Biaya transaksi (fee) tidak mencukupi.',
  tx_insufficient_balance: 'Saldo tidak mencukupi untuk transaksi ini.',
  tx_bad_seq: 'Nomor urut transaksi tidak valid, silakan coba lagi.',
  tx_no_source_account: 'Akun pengirim tidak ditemukan di jaringan.',
  tx_too_late: 'Transaksi kedaluwarsa, silakan ulangi.',
  op_underfunded: 'Saldo tidak mencukupi untuk mengirim jumlah ini.',
  op_no_trust: 'Penerima belum menambahkan trustline untuk aset ini.',
  op_no_destination: 'Alamat tujuan belum aktif di jaringan.',
  op_line_full: 'Limit trustline penerima sudah penuh.',
  op_low_reserve: 'Saldo minimum (reserve) tidak mencukupi.',
  op_malformed: 'Format operasi tidak valid.',
};

/**
 * Convert an arbitrary Horizon/SDK error into a typed {@link ZakatiError}.
 *
 * Parses `response.data.extras.result_codes` when present and maps the most
 * specific known code to a readable message.
 *
 * @param error Any error caught around a Horizon submit/load call.
 * @returns A {@link ZakatiError} (or subclass) suitable for surfacing to users.
 */
export function parseHorizonError(error: unknown): ZakatiError {
  if (isZakatiError(error)) return error;

  const extras =
    (error as { response?: { data?: { extras?: unknown } } })?.response?.data
      ?.extras ??
    (error as { extras?: unknown })?.extras;

  const resultCodes = (extras as {
    result_codes?: { transaction?: string; operations?: string[] };
  })?.result_codes;

  if (resultCodes) {
    const candidates: string[] = [
      ...(resultCodes.operations ?? []),
      ...(resultCodes.transaction ? [resultCodes.transaction] : []),
    ];

    for (const code of candidates) {
      const friendly = RESULT_CODE_MESSAGES[code];
      if (friendly) {
        return new TransactionFailedError(friendly, `Horizon result code: ${code}`);
      }
    }

    const raw = candidates.join(', ');
    return new TransactionFailedError(
      'Transaksi gagal diproses oleh jaringan.',
      `Horizon result codes: ${raw}`,
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  return new TransactionFailedError('Transaksi gagal diproses.', message);
}

/** Type guard for {@link ZakatiError}. */
export function isZakatiError(error: unknown): error is ZakatiError {
  return error instanceof ZakatiError;
}

/**
 * Always returns a user-safe Indonesian string for any thrown value.
 */
export function getErrorMessage(error: unknown): string {
  if (isZakatiError(error)) return error.userMessage;
  if (error instanceof Error) return 'Terjadi kesalahan. Silakan coba lagi.';
  return 'Terjadi kesalahan yang tidak diketahui.';
}
