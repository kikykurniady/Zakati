/**
 * /api/harga — real-time price feed for the zakat calculator.
 *
 * Aggregates two free, keyless public APIs:
 * - Gold spot (USD/troy oz): https://api.gold-api.com/price/XAU
 * - USD→IDR rate           : https://open.er-api.com/v6/latest/USD
 *
 * Responses are cached in memory; when upstream is unreachable the last
 * good snapshot is served (marked stale) so the calculator never breaks.
 */
import { Router, type Request, type Response } from 'express';
import { getErrorMessage } from '../lib/errors';
import { logger } from '../lib/logger';

const router = Router();
const CONTEXT = 'api/harga';

const GRAM_PER_TROY_OZ = 31.1034768;
const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;

interface HargaSnapshot {
  /** Harga emas murni per gram dalam IDR (spot dunia, bukan retail Antam). */
  hargaEmasPerGram: number;
  /** Harga emas dunia, USD per troy ounce. */
  hargaEmasUsdPerOz: number;
  /** Kurs 1 USD dalam IDR. */
  kursUsdIdr: number;
  updatedAt: string;
  sumber: string[];
}

let cache: { snapshot: HargaSnapshot; fetchedAt: number } | null = null;

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

async function fetchSnapshot(): Promise<HargaSnapshot> {
  const [gold, forex] = await Promise.all([
    fetchJson('https://api.gold-api.com/price/XAU'),
    fetchJson('https://open.er-api.com/v6/latest/USD'),
  ]);

  const usdPerOz = Number((gold as { price?: unknown }).price);
  const idrPerUsd = Number(
    (forex as { rates?: { IDR?: unknown } }).rates?.IDR,
  );
  if (!Number.isFinite(usdPerOz) || usdPerOz <= 0) {
    throw new Error('Harga emas dari upstream tidak valid.');
  }
  if (!Number.isFinite(idrPerUsd) || idrPerUsd <= 0) {
    throw new Error('Kurs USD/IDR dari upstream tidak valid.');
  }

  return {
    hargaEmasPerGram: Math.round((usdPerOz / GRAM_PER_TROY_OZ) * idrPerUsd),
    hargaEmasUsdPerOz: usdPerOz,
    kursUsdIdr: Math.round(idrPerUsd),
    updatedAt: new Date().toISOString(),
    sumber: ['gold-api.com (XAU spot)', 'exchangerate-api.com (USD→IDR)'],
  };
}

/** GET /api/harga — cached real-time gold price and USD rate. */
router.get('/', async (_req: Request, res: Response) => {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return res.json({ ...cache.snapshot, stale: false });
  }

  try {
    const snapshot = await fetchSnapshot();
    cache = { snapshot, fetchedAt: Date.now() };
    return res.json({ ...snapshot, stale: false });
  } catch (error) {
    logger.warn(CONTEXT, 'upstream price fetch failed', getErrorMessage(error));
    if (cache) {
      // Serve the last good snapshot rather than breaking the calculator.
      return res.json({ ...cache.snapshot, stale: true });
    }
    return res
      .status(503)
      .json({ error: 'Harga real-time tidak tersedia saat ini.' });
  }
});

export default router;
