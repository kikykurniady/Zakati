'use client';

import { useEffect, useState } from 'react';
import { api, type HargaResponse } from '@/lib/api';
import { DEFAULT_PARAMS } from '@/lib/zakatCalc';

/**
 * Kurs USD→IDR real-time dari backend, dibagikan lintas komponen.
 *
 * Satu fetch per sesi halaman (module-level cache) — komponen mana pun yang
 * memanggil hook ini memakai promise yang sama. Saat backend tak terjangkau,
 * kurs default dipakai dan `live` bernilai false.
 */
let hargaPromise: Promise<HargaResponse | null> | null = null;

function loadHarga(): Promise<HargaResponse | null> {
  if (!hargaPromise) {
    hargaPromise = api.getHarga().catch(() => {
      hargaPromise = null; // biarkan percobaan berikutnya mencoba lagi
      return null;
    });
  }
  return hargaPromise;
}

export interface UseHargaReturn {
  /** Kurs 1 USD(C) dalam IDR. */
  kursUsdIdr: number;
  /** Harga emas murni per gram (IDR). */
  hargaEmasPerGram: number;
  /** True bila nilai berasal dari feed real-time, bukan default. */
  live: boolean;
}

export function useHarga(): UseHargaReturn {
  const [state, setState] = useState<UseHargaReturn>({
    kursUsdIdr: DEFAULT_PARAMS.kursUsdc,
    hargaEmasPerGram: DEFAULT_PARAMS.hargaEmas,
    live: false,
  });

  useEffect(() => {
    let cancelled = false;
    void loadHarga().then((h) => {
      if (h && !cancelled) {
        setState({
          kursUsdIdr: h.kursUsdIdr,
          hargaEmasPerGram: h.hargaEmasPerGram,
          live: true,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/** Format nilai USDC/XLM sebagai ekuivalen Rupiah, mis. 22.73 → "≈ Rp375.045". */
export function usdcToIdrLabel(amount: string | number, kursUsdIdr: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0 || kursUsdIdr <= 0) return '';
  const idr = Math.round(n * kursUsdIdr);
  return `≈ Rp${idr.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}
