/**
 * /api/mustahiq — registry of zakat recipients tagged by asnaf (golongan).
 *
 * An amil registers each recipient under one of the eight asnaf; the frontend
 * uses this to enforce that zakat is only distributed to a syar'i-valid
 * category, and to show a recipient why they are eligible.
 */
import { Router, type Request, type Response } from 'express';
import type { MustahiqRegistration } from '../types';
import { mustahiqStore } from '../lib/mustahiqStore';
import { validateStellarAddress } from '../lib/stellar/account';
import { asnafFromKode, isValidAsnaf } from '../lib/asnaf';

const router = Router();

/** GET /api/mustahiq?lembaga=:id — list registered mustahiq. */
router.get('/', (req: Request, res: Response) => {
  const lembaga = typeof req.query.lembaga === 'string' ? req.query.lembaga : undefined;
  return res.json({ mustahiq: mustahiqStore.list(lembaga) });
});

/** GET /api/mustahiq/:address — one mustahiq, or 404. */
router.get('/:address', (req: Request, res: Response) => {
  const found = mustahiqStore.find(req.params.address);
  if (!found) {
    return res.status(404).json({ error: 'Mustahiq belum terdaftar.' });
  }
  const asnaf = asnafFromKode(found.asnaf);
  return res.json({ mustahiq: found, asnaf });
});

/** POST /api/mustahiq — register (or update) a mustahiq under an asnaf. */
router.post('/', (req: Request, res: Response) => {
  const { stellarAddress, asnaf, name, lembagaId } = req.body ?? {};

  if (!stellarAddress || !asnaf) {
    return res
      .status(400)
      .json({ error: 'Field "stellarAddress" dan "asnaf" wajib diisi.' });
  }
  if (!validateStellarAddress(stellarAddress)) {
    return res.status(400).json({ error: 'Alamat Stellar tidak valid.' });
  }
  if (!isValidAsnaf(asnaf)) {
    return res
      .status(400)
      .json({ error: 'Asnaf tidak valid — harus salah satu dari 8 golongan.' });
  }

  const record: MustahiqRegistration = {
    stellarAddress,
    asnaf: String(asnaf).toUpperCase(),
    name: name ?? '',
    lembagaId: lembagaId ?? '',
    verifiedAt: new Date().toISOString(),
  };

  const saved = mustahiqStore.upsert(record);
  return res.status(201).json({ mustahiq: saved });
});

export default router;
