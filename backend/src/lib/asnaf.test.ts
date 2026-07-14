import { describe, expect, it } from 'vitest';
import { ASNAF, ASNAF_KODES, asnafFromKode, isValidAsnaf } from './asnaf';

describe('ASNAF catalog', () => {
  it('lists exactly the eight asnaf', () => {
    expect(ASNAF).toHaveLength(8);
    expect(ASNAF_KODES).toEqual([
      'FAKIR',
      'MISKIN',
      'AMIL',
      'MUALLAF',
      'RIQAB',
      'GHARIM',
      'SABILILLAH',
      'IBNUSABIL',
    ]);
  });

  it('has unique codes and ids', () => {
    expect(new Set(ASNAF.map((a) => a.kode)).size).toBe(8);
    expect(new Set(ASNAF.map((a) => a.id)).size).toBe(8);
  });
});

describe('isValidAsnaf', () => {
  it('accepts the eight codes case-insensitively', () => {
    expect(isValidAsnaf('FAKIR')).toBe(true);
    expect(isValidAsnaf('sabilillah')).toBe(true);
  });

  it('rejects unknown or empty codes', () => {
    expect(isValidAsnaf('ORANG-KAYA')).toBe(false);
    expect(isValidAsnaf('')).toBe(false);
    expect(isValidAsnaf(null)).toBe(false);
    expect(isValidAsnaf(undefined)).toBe(false);
  });
});

describe('asnafFromKode', () => {
  it('resolves a code back to its entry', () => {
    expect(asnafFromKode('miskin')?.label).toBe('Miskin');
  });

  it('returns null for unknown codes', () => {
    expect(asnafFromKode('XYZ')).toBeNull();
    expect(asnafFromKode(null)).toBeNull();
  });
});
