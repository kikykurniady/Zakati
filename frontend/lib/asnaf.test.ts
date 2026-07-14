import { describe, expect, it } from 'vitest';
import { ASNAF, ASNAF_KODES, asnafFromKode, isValidAsnaf } from './asnaf';

describe('ASNAF catalog (frontend mirror)', () => {
  it('lists exactly the eight asnaf in the canonical order', () => {
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

  it('validates and resolves codes case-insensitively', () => {
    expect(isValidAsnaf('fakir')).toBe(true);
    expect(isValidAsnaf('ORANG-KAYA')).toBe(false);
    expect(asnafFromKode('miskin')?.label).toBe('Miskin');
    expect(asnafFromKode('nope')).toBeNull();
  });
});
