/**
 * /api/tracker/:address — public transaction tracker for any Stellar address.
 */
import { Router, type Request, type Response } from 'express';
import { fetchPaymentHistory } from '../lib/stellar/history';
import { validateStellarAddress } from '../lib/stellar/account';
import { getErrorMessage } from '../lib/errors';

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

    let totalMasuk = 0;
    let totalKeluar = 0;
    for (const tx of records) {
      if (tx.to === address) totalMasuk += Number(tx.amount);
      if (tx.from === address) totalKeluar += Number(tx.amount);
    }

    return res.json({
      transactions: records,
      nextCursor,
      stats: {
        totalMasuk: totalMasuk.toFixed(7),
        totalKeluar: totalKeluar.toFixed(7),
        saldo: (totalMasuk - totalKeluar).toFixed(7),
        jumlahTransaksi: records.length,
      },
    });
  } catch (error) {
    return res.status(502).json({ error: getErrorMessage(error) });
  }
});

export default router;
