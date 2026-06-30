/**
 * Thin client for the Zakati backend REST API.
 */
import type { LembagaAmil, ZakatTransaction } from '@/types';
import { API_BASE_URL } from '@/config';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Permintaan gagal (${res.status}).`);
  }
  return res.json() as Promise<T>;
}

export interface TrackerResponse {
  transactions: ZakatTransaction[];
  nextCursor: string | null;
  stats: {
    totalMasuk: string;
    totalKeluar: string;
    saldo: string;
    jumlahTransaksi: number;
  };
}

export interface LembagaDetailResponse {
  lembaga: LembagaAmil;
  stats: {
    totalTerkumpul: string;
    totalTerdistribusi: string;
    saldo: string;
  };
}

export const api = {
  listLembaga: () => getJson<{ lembaga: LembagaAmil[] }>('/api/lembaga'),
  getLembaga: (id: string) =>
    getJson<LembagaDetailResponse>(`/api/lembaga/${id}`),
  getTracker: (address: string) =>
    getJson<TrackerResponse>(`/api/tracker/${address}`),
  verifyTx: (txHash: string) =>
    getJson<{ isValid: boolean; transaction: ZakatTransaction | null }>(
      `/api/verify/${txHash}`,
    ),
};
