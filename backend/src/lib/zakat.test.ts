import { describe, expect, it } from 'vitest';
import { isZakatiMemo } from './zakat';

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
