import { describe, expect, it } from 'vitest';
import {
  aggregateFlowsByAsset,
  flowForAsset,
  isZakatiMemo,
  truncateMemoToBytes,
} from './zakat';
import type { ZakatTransaction } from '../types';

const tx = (over: Partial<ZakatTransaction>): ZakatTransaction => ({
  txHash: 'h',
  from: 'GFROM',
  to: 'GTO',
  amount: '0',
  asset: 'USDC',
  memo: '',
  timestamp: '2024-01-01T00:00:00.000Z',
  status: 'success',
  stellarExpertUrl: '',
  ...over,
});

describe('isZakatiMemo', () => {
  it('matches known Zakati memo prefixes (case-insensitive)', () => {
    expect(isZakatiMemo('ZAKAT-MAL-2024')).toBe(true);
    expect(isZakatiMemo('zakat-fitrah')).toBe(true);
    expect(isZakatiMemo('INFAQ-MASJID')).toBe(true);
    expect(isZakatiMemo('SEDEKAH-UMUM')).toBe(true);
    expect(isZakatiMemo('ZAKATI-DIST-001')).toBe(true);
  });

  it('rejects non-Zakati or empty memos', () => {
    expect(isZakatiMemo('PAYMENT')).toBe(false);
    expect(isZakatiMemo('')).toBe(false);
    expect(isZakatiMemo(null)).toBe(false);
    expect(isZakatiMemo(undefined)).toBe(false);
  });
});

describe('truncateMemoToBytes', () => {
  const byteLen = (s: string) => new TextEncoder().encode(s).length;

  it('leaves ASCII memos within the limit untouched', () => {
    expect(truncateMemoToBytes('ZAKAT-MAL-2024', 28)).toBe('ZAKAT-MAL-2024');
  });

  it('keeps a 28-byte ASCII memo at exactly the limit', () => {
    const memo = 'A'.repeat(28);
    expect(truncateMemoToBytes(memo, 28)).toBe(memo);
  });

  it('truncates multibyte memos to the byte limit, not the char limit', () => {
    // 28 characters but 34 bytes — the old char-slice produced an invalid memo.
    const memo = 'Zakat Ramadhan — berkah ©©©©';
    expect(byteLen(memo)).toBeGreaterThan(28);
    const out = truncateMemoToBytes(memo, 28);
    expect(byteLen(out)).toBeLessThanOrEqual(28);
  });

  it('never leaves a trailing partial multibyte sequence (no U+FFFD)', () => {
    // Emoji are 4 bytes each; truncating mid-emoji must drop the partial byte.
    const memo = '😀😀😀😀😀😀😀😀';
    const out = truncateMemoToBytes(memo, 28);
    expect(byteLen(out)).toBeLessThanOrEqual(28);
    expect(out).not.toContain('�');
  });
});

describe('aggregateFlowsByAsset', () => {
  const ADDR = 'GME';

  it('keeps XLM and USDC totals separate instead of summing them', () => {
    const flows = aggregateFlowsByAsset(
      [
        tx({ to: ADDR, amount: '100', asset: 'USDC' }),
        tx({ to: ADDR, amount: '100', asset: 'XLM' }),
      ],
      ADDR,
    );
    expect(flows).toHaveLength(2);
    expect(flowForAsset(flows, 'USDC').masuk).toBe('100.0000000');
    expect(flowForAsset(flows, 'XLM').masuk).toBe('100.0000000');
  });

  it('computes per-asset saldo as masuk − keluar', () => {
    const flows = aggregateFlowsByAsset(
      [
        tx({ to: ADDR, from: 'GX', amount: '500', asset: 'USDC' }),
        tx({ from: ADDR, to: 'GY', amount: '200', asset: 'USDC' }),
      ],
      ADDR,
    );
    const usdc = flowForAsset(flows, 'USDC');
    expect(usdc.masuk).toBe('500.0000000');
    expect(usdc.keluar).toBe('200.0000000');
    expect(usdc.saldo).toBe('300.0000000');
  });

  it('returns a zeroed flow for an absent asset', () => {
    expect(flowForAsset([], 'USDC')).toEqual({
      asset: 'USDC',
      masuk: '0.0000000',
      keluar: '0.0000000',
      saldo: '0.0000000',
    });
  });
});
