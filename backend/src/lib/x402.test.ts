import { describe, expect, it } from 'vitest';
import {
  PAYMENT_SCHEME,
  X402_VERSION,
  buildChallenge,
  buildPaymentRequirements,
  decodePaymentHeader,
  encodePaymentHeader,
  validatePaymentPayload,
  verifyEscrowPayment,
  type PaymentPayload,
} from './x402';
import { formatIDR } from './idr';

const target = { programId: 'ZAKAT-MAL-2026', amount: '1000000' };

const payload = (over: Partial<PaymentPayload> = {}): PaymentPayload => ({
  scheme: PAYMENT_SCHEME,
  network: 'stellar-testnet',
  from: 'GMUZAKKI',
  amount: '1000000',
  programId: 'ZAKAT-MAL-2026',
  txHash: 'abc123',
  ...over,
});

describe('formatIDR', () => {
  it('groups rupiah with dots and no decimals', () => {
    expect(formatIDR(1000000)).toBe('Rp1.000.000');
    expect(formatIDR('250000')).toBe('Rp250.000');
    expect(formatIDR(0)).toBe('Rp0');
  });
});

describe('buildChallenge / buildPaymentRequirements', () => {
  it('produces a well-formed x402 challenge', () => {
    const challenge = buildChallenge(target);
    expect(challenge.x402Version).toBe(X402_VERSION);
    expect(challenge.accepts).toHaveLength(1);

    const req = challenge.accepts[0];
    expect(req.scheme).toBe(PAYMENT_SCHEME);
    expect(req.amount).toBe('1000000');
    expect(req.extra.currency).toBe('IDR');
    expect(req.extra.decimals).toBe(0);
    expect(req.extra.programId).toBe('ZAKAT-MAL-2026');
    expect(req.extra.displayAmount).toBe('Rp1.000.000');
  });

  it('carries an error string when provided', () => {
    expect(buildChallenge(target, 'boom').error).toBe('boom');
    expect(buildChallenge(target).error).toBeUndefined();
  });

  it('builds requirements directly', () => {
    expect(buildPaymentRequirements(target).payTo).toBeTypeOf('string');
  });
});

describe('encode/decode X-PAYMENT header', () => {
  it('round-trips a payload', () => {
    const header = encodePaymentHeader(payload());
    expect(decodePaymentHeader(header)).toMatchObject({
      from: 'GMUZAKKI',
      amount: '1000000',
      programId: 'ZAKAT-MAL-2026',
    });
  });

  it('rejects malformed base64/json', () => {
    expect(() => decodePaymentHeader('!!!not-base64-json')).toThrow();
  });

  it('rejects an incomplete payload', () => {
    const bad = Buffer.from(JSON.stringify({ from: 'G' })).toString('base64');
    expect(() => decodePaymentHeader(bad)).toThrow(/tidak lengkap/);
  });
});

describe('validatePaymentPayload', () => {
  it('accepts a matching payload', () => {
    expect(validatePaymentPayload(payload(), target)).toEqual({ ok: true });
  });

  it('rejects a mismatched amount', () => {
    expect(validatePaymentPayload(payload({ amount: '999' }), target).ok).toBe(false);
  });

  it('rejects a mismatched program', () => {
    expect(validatePaymentPayload(payload({ programId: 'OTHER' }), target).ok).toBe(false);
  });

  it('rejects an unsupported scheme', () => {
    expect(validatePaymentPayload(payload({ scheme: 'evm-exact' }), target).ok).toBe(false);
  });
});

describe('verifyEscrowPayment (PoC simulation)', () => {
  it('settles when an on-chain reference is present', () => {
    expect(verifyEscrowPayment(payload())).toEqual({ settled: true, txHash: 'abc123' });
  });

  it('falls back to the proof field', () => {
    expect(verifyEscrowPayment(payload({ txHash: undefined, proof: 'inv-1' }))).toEqual({
      settled: true,
      txHash: 'inv-1',
    });
  });

  it('refuses a payload with no reference', () => {
    expect(verifyEscrowPayment(payload({ txHash: undefined, proof: undefined })).settled).toBe(false);
  });
});
