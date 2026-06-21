/**
 * /api/lembaga — institution (Amil) registry.
 *
 * Uses an in-memory store seeded with demo data. Detail responses enrich the
 * record with live on-chain totals fetched from Horizon.
 */
import { Router, type Request, type Response } from 'express';
import type { LembagaAmil } from '../types';
import { fetchPaymentHistory } from '../lib/stellar/history';
import { getErrorMessage } from '../lib/errors';
import { logger } from '../lib/logger';

const router = Router();

/** In-memory store (sufficient for hackathon / demo purposes). */
const lembagaStore: LembagaAmil[] = [
  {
    id: 'yayasan-zakati-demo',
    name: 'Yayasan Zakati Demo',
    description:
      'Lembaga amil zakat demonstrasi untuk platform Zakati di Stellar Testnet.',
    stellarAddress: '',
    totalTerkumpul: '0',
    totalTerdistribusi: '0',
    jumlahMuzakki: 0,
    jumlahMustahiq: 0,
    isVerified: true,
    createdAt: new Date().toISOString(),
  },
];

/** GET /api/lembaga — list all institutions. */
router.get('/', (_req: Request, res: Response) => {
  res.json({ lembaga: lembagaStore });
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

  lembagaStore.push(lembaga);
  return res.status(201).json({ lembaga });
});

/** GET /api/lembaga/:id — detail enriched with on-chain stats. */
router.get('/:id', async (req: Request, res: Response) => {
  const lembaga = lembagaStore.find((l) => l.id === req.params.id);
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
