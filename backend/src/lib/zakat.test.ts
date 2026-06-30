import { describe, expect, it } from 'vitest';
import { isZakatiMemo, truncateMemoToBytes } from './zakat';

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
