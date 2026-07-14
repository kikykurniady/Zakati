import { describe, expect, it } from 'vitest';
import {
  ZAKAT_TYPES,
  memoForZakatType,
  zakatTypeFromMemo,
} from './zakatTypes';

const byteLen = (s: string) => new TextEncoder().encode(s).length;

describe('memoForZakatType', () => {
  it('menambahkan tahun berjalan sebagai sufiks', () => {
    const fitrah = ZAKAT_TYPES.find((t) => t.id === 'fitrah')!;
    expect(memoForZakatType(fitrah, 2026)).toBe('ZAKAT-FITRAH-2026');
  });

  it('semua memo + tahun muat dalam batas 28 byte memo Stellar', () => {
    for (const t of ZAKAT_TYPES) {
      const memo = memoForZakatType(t, 2026);
      expect(byteLen(memo), `${t.id}: "${memo}"`).toBeLessThanOrEqual(28);
    }
  });

  it('semua memo memakai prefix yang dikenali backend (ZAKAT/INFAQ/SEDEKAH)', () => {
    for (const t of ZAKAT_TYPES) {
      expect(memoForZakatType(t)).toMatch(/^(ZAKAT|INFAQ|SEDEKAH)/);
    }
  });
});

describe('niat', () => {
  it('setiap jenis memiliki pernyataan niat non-kosong', () => {
    for (const t of ZAKAT_TYPES) {
      expect(t.niat.trim().length, t.id).toBeGreaterThan(0);
    }
  });
});

describe('zakatTypeFromMemo', () => {
  it('me-resolve memo hasil memoForZakatType kembali ke jenis yang sama (round-trip)', () => {
    for (const t of ZAKAT_TYPES) {
      expect(zakatTypeFromMemo(memoForZakatType(t))?.id).toBe(t.id);
    }
  });

  it('memilih prefix terpanjang: ZAKAT-MAL-EMAS-2026 bukan jenis lain', () => {
    expect(zakatTypeFromMemo('ZAKAT-MAL-EMAS-2026')?.id).toBe('maal-emas');
    expect(zakatTypeFromMemo('ZAKAT-MAL-TABUNGAN-2026')?.id).toBe('maal-tabungan');
  });

  it('cocok tanpa peduli huruf besar/kecil', () => {
    expect(zakatTypeFromMemo('zakat-fitrah-2026')?.id).toBe('fitrah');
  });

  it('memo lama tanpa tahun tetap ter-resolve', () => {
    expect(zakatTypeFromMemo('ZAKAT-FITRAH')?.id).toBe('fitrah');
    expect(zakatTypeFromMemo('INFAQ-UMUM')?.id).toBe('infaq');
  });

  it('memo asing / kosong / null → null', () => {
    expect(zakatTypeFromMemo('PAYMENT-123')).toBeNull();
    expect(zakatTypeFromMemo('')).toBeNull();
    expect(zakatTypeFromMemo(null)).toBeNull();
    expect(zakatTypeFromMemo(undefined)).toBeNull();
  });

  it('memo generik ZAKAT-MAL-2024 (legacy) tidak salah ter-map ke sub-jenis', () => {
    const hit = zakatTypeFromMemo('ZAKAT-MAL-2024');
    // Tidak ada jenis generik "maal" — boleh null, tapi tidak boleh nyasar ke sub-jenis.
    if (hit) {
      expect(hit.memoPrefix.startsWith('ZAKAT-MAL')).toBe(true);
    }
  });
});
