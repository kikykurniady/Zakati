/**
 * Thin client for the Zakati backend REST API.
 */
import type {
  AssetFlow,
  LembagaAmil,
  MustahiqRegistration,
  ZakatTransaction,
} from '@/types';
import type { Asnaf } from '@/lib/asnaf';
import { API_BASE_URL } from '@/config';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Permintaan gagal (${res.status}).`);
  }
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Permintaan gagal (${res.status}).`);
  }
  return res.json() as Promise<T>;
}

/** Per-fund-category flow (zakat / infaq / sedekah / lainnya) for USDC. */
export interface CategoryFlow {
  category: 'zakat' | 'infaq' | 'sedekah' | 'lainnya';
  masuk: string;
  keluar: string;
  saldo: string;
}

export interface TrackerResponse {
  transactions: ZakatTransaction[];
  nextCursor: string | null;
  stats: {
    /** Per-asset breakdown (USDC, XLM, …). */
    perAsset: AssetFlow[];
    /** Per-fund-category USDC breakdown (zakat / infaq / sedekah). */
    perCategory: CategoryFlow[];
    /** USDC totals, surfaced for convenience. */
    totalMasuk: string;
    totalKeluar: string;
    saldo: string;
    jumlahTransaksi: number;
  };
}

export interface MustahiqResponse {
  mustahiq: MustahiqRegistration;
  asnaf: Asnaf | null;
}

export interface LembagaDetailResponse {
  lembaga: LembagaAmil;
  stats: {
    /** Per-asset breakdown (USDC, XLM, …). */
    perAsset: AssetFlow[];
    /** USDC totals, surfaced for convenience. */
    totalTerkumpul: string;
    totalTerdistribusi: string;
    saldo: string;
  };
}

export interface HargaResponse {
  /** Harga emas murni per gram (IDR), dari spot dunia. */
  hargaEmasPerGram: number;
  hargaEmasUsdPerOz: number;
  /** Kurs 1 USD dalam IDR. */
  kursUsdIdr: number;
  updatedAt: string;
  sumber: string[];
  /** True bila snapshot lama disajikan karena upstream sedang gagal. */
  stale: boolean;
}

export const api = {
  getHarga: () => getJson<HargaResponse>('/api/harga'),
  listLembaga: () => getJson<{ lembaga: LembagaAmil[] }>('/api/lembaga'),
  getLembaga: (id: string) =>
    getJson<LembagaDetailResponse>(`/api/lembaga/${id}`),
  getTracker: (address: string) =>
    getJson<TrackerResponse>(`/api/tracker/${address}`),
  verifyTx: (txHash: string) =>
    getJson<{ isValid: boolean; transaction: ZakatTransaction | null }>(
      `/api/verify/${txHash}`,
    ),
  /** Look up a mustahiq's asnaf registration; null when not registered. */
  getMustahiq: async (address: string): Promise<MustahiqResponse | null> => {
    try {
      return await getJson<MustahiqResponse>(`/api/mustahiq/${address}`);
    } catch {
      return null;
    }
  },
  /** Register (or update) a mustahiq under an asnaf. */
  registerMustahiq: (payload: {
    stellarAddress: string;
    asnaf: string;
    name?: string;
    lembagaId?: string;
  }) => postJson<{ mustahiq: MustahiqRegistration }>('/api/mustahiq', payload),
};
