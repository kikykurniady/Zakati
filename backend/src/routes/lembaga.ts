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
import { getErrorMessage } from '../lib/errors';
import { logger } from '../lib/logger';
import { ADMIN_TOKEN } from '../config';

const router = Router();

/** GET /api/lembaga — list all institutions. */
router.get('/', (_req: Request, res: Response) => {
  res.json({ lembaga: lembagaStore.list() });
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
  return res.json({ lembaga: updated });
});

/** GET /api/lembaga/:id — detail enriched with on-chain stats. */
router.get('/:id', async (req: Request, res: Response) => {
  const lembaga = lembagaStore.find(req.params.id);
  if (!lembaga) {
    return res.status(404).json({ error: 'Lembaga tidak ditemukan.' });
  }

  let totalTerkumpul = 0;
  let totalTerdistribusi = 0;

  if (lembaga.stellarAddress) {
    try {
      const { records } = await fetchPaymentHistory({
        publicKey: lembaga.stellarAddress,
        limit: 200,
      });
      for (const tx of records) {
        if (tx.to === lembaga.stellarAddress) {
          totalTerkumpul += Number(tx.amount);
        } else if (tx.from === lembaga.stellarAddress) {
          totalTerdistribusi += Number(tx.amount);
        }
      }
    } catch (error) {
      logger.warn('api/lembaga', 'on-chain stats unavailable', getErrorMessage(error));
    }
  }

  return res.json({
    lembaga: {
      ...lembaga,
      totalTerkumpul: totalTerkumpul.toFixed(7),
      totalTerdistribusi: totalTerdistribusi.toFixed(7),
    },
    stats: {
      totalTerkumpul: totalTerkumpul.toFixed(7),
      totalTerdistribusi: totalTerdistribusi.toFixed(7),
      saldo: (totalTerkumpul - totalTerdistribusi).toFixed(7),
    },
  });
});

export default router;
