/**
 * /api/lembaga — institution (Amil) registry.
 *
 * Backed by a file-persisted store (see lib/lembagaStore). Detail responses
 * enrich the record with live on-chain totals fetched from Horizon.
 */
import { Router, type Request, type Response } from 'express';
import type { LembagaAmil } from '../types';
import { lembagaStore } from '../lib/lembagaStore';
import { fetchPaymentHistory } from '../lib/stellar/history';
import { aggregateFlowsByAsset, flowForAsset } from '../lib/zakat';
import { getErrorMessage } from '../lib/errors';
import type { AssetFlow } from '../types';
import { logger } from '../lib/logger';
import { ADMIN_TOKEN } from '../config';

const router = Router();

/** Fetch live USDC in/out totals for an address; null when unavailable. */
async function fetchUsdcTotals(
  stellarAddress: string,
): Promise<{ perAsset: AssetFlow[]; masuk: string; keluar: string; saldo: string } | null> {
  try {
    const { records } = await fetchPaymentHistory({
      publicKey: stellarAddress,
      limit: 200,
    });
    const perAsset = aggregateFlowsByAsset(records, stellarAddress);
    const usdc = flowForAsset(perAsset, 'USDC');
    return { perAsset, masuk: usdc.masuk, keluar: usdc.keluar, saldo: usdc.saldo };
  } catch (error) {
    logger.warn('api/lembaga', 'on-chain stats unavailable', getErrorMessage(error));
    return null;
  }
}

/**
 * GET /api/lembaga — list all institutions, enriched with live on-chain
 * totals so listing pages can show real progress. Falls back to the stored
 * (stale) figures per institution when Horizon is unreachable.
 *
 * Enrichment hits Horizon once per institution, so results are cached
 * briefly; a fresh payment shows up after at most CACHE_TTL_MS.
 */
const LIST_CACHE_TTL_MS = 60 * 1000;
let listCache: { lembaga: LembagaAmil[]; at: number } | null = null;

async function enrichedList(): Promise<LembagaAmil[]> {
  return Promise.all(
    lembagaStore.list().map(async (l) => {
      if (!l.stellarAddress) return l;
      const totals = await fetchUsdcTotals(l.stellarAddress);
      if (!totals) return l;
      return {
        ...l,
        totalTerkumpul: totals.masuk,
        totalTerdistribusi: totals.keluar,
      };
    }),
  );
}

router.get('/', async (_req: Request, res: Response) => {
  if (listCache && Date.now() - listCache.at < LIST_CACHE_TTL_MS) {
    return res.json({ lembaga: listCache.lembaga });
  }
  const lembaga = await enrichedList();
  listCache = { lembaga, at: Date.now() };
  res.json({ lembaga });
});

/** POST /api/lembaga — register a new institution. */
router.post('/', (req: Request, res: Response) => {
  const { name, description, stellarAddress } = req.body ?? {};

  if (!name || !stellarAddress) {
    return res
      .status(400)
      .json({ error: 'Field "name" dan "stellarAddress" wajib diisi.' });
  }

  const lembaga: LembagaAmil = {
    id: String(name).toLowerCase().replace(/\s+/g, '-'),
    name,
    description: description ?? '',
    stellarAddress,
    totalTerkumpul: '0',
    totalTerdistribusi: '0',
    jumlahMuzakki: 0,
    jumlahMustahiq: 0,
    isVerified: false,
    createdAt: new Date().toISOString(),
  };

  lembagaStore.add(lembaga);
  listCache = null; // registry changed — next list rebuilds
  return res.status(201).json({ lembaga });
});

/**
 * PATCH /api/lembaga/:id/verify — mark an institution as verified.
 *
 * Guarded by a shared admin token (ADMIN_TOKEN env). Disabled with a 503 when
 * no token is configured, so it can never be called open in production.
 */
router.patch('/:id/verify', (req: Request, res: Response) => {
  if (!ADMIN_TOKEN) {
    return res
      .status(503)
      .json({ error: 'Verifikasi admin tidak dikonfigurasi (ADMIN_TOKEN kosong).' });
  }

  const provided = req.header('x-admin-token');
  if (provided !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Token admin tidak valid.' });
  }

  const updated = lembagaStore.update(req.params.id, { isVerified: true });
  if (!updated) {
    return res.status(404).json({ error: 'Lembaga tidak ditemukan.' });
  }
  listCache = null; // registry changed — next list rebuilds
  return res.json({ lembaga: updated });
});

/** GET /api/lembaga/:id — detail enriched with on-chain stats. */
router.get('/:id', async (req: Request, res: Response) => {
  const lembaga = lembagaStore.find(req.params.id);
  if (!lembaga) {
    return res.status(404).json({ error: 'Lembaga tidak ditemukan.' });
  }

  // Headline figures use USDC (the zakat asset); `perAsset` carries the rest.
  const totals = lembaga.stellarAddress
    ? await fetchUsdcTotals(lembaga.stellarAddress)
    : null;
  const zero = flowForAsset([], 'USDC');
  const { perAsset, masuk, keluar, saldo } = totals ?? {
    perAsset: [] as AssetFlow[],
    masuk: zero.masuk,
    keluar: zero.keluar,
    saldo: zero.saldo,
  };

  return res.json({
    lembaga: {
      ...lembaga,
      totalTerkumpul: masuk,
      totalTerdistribusi: keluar,
    },
    stats: {
      perAsset,
      totalTerkumpul: masuk,
      totalTerdistribusi: keluar,
      saldo,
    },
  });
});

export default router;
