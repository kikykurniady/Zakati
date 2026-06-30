/**
 * /api/tracker/:address — public transaction tracker for any Stellar address.
 */
import { Router, type Request, type Response } from 'express';
import { fetchPaymentHistory } from '../lib/stellar/history';
import { validateStellarAddress } from '../lib/stellar/account';
import { getErrorMessage } from '../lib/errors';
import { aggregateFlowsByAsset, flowForAsset } from '../lib/zakat';

const router = Router();

/** GET /api/tracker/:address — transactions + aggregate stats. */
router.get('/:address', async (req: Request, res: Response) => {
  const { address } = req.params;

  if (!validateStellarAddress(address)) {
    return res.status(400).json({ error: 'Alamat Stellar tidak valid.' });
  }

  try {
    const { records, nextCursor } = await fetchPaymentHistory({
      publicKey: address,
      limit: 50,
      order: 'desc',
    });

    const perAsset = aggregateFlowsByAsset(records, address);
    // Headline scalars report USDC (the asset zakat is denominated in); the
    // full per-asset breakdown is in `perAsset`.
    const usdc = flowForAsset(perAsset, 'USDC');

    return res.json({
      transactions: records,
      nextCursor,
      stats: {
        perAsset,
        totalMasuk: usdc.masuk,
        totalKeluar: usdc.keluar,
        saldo: usdc.saldo,
        jumlahTransaksi: records.length,
      },
    });
  } catch (error) {
    return res.status(502).json({ error: getErrorMessage(error) });
  }
});

export default router;
