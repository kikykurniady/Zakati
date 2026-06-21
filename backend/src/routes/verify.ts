/**
 * /api/verify/:txHash — verify a transaction exists and looks like a
 * legitimate Zakati transfer.
 */
import { Router, type Request, type Response } from 'express';
import { fetchTransactionDetail } from '../lib/stellar/history';
import { getErrorMessage } from '../lib/errors';
import { isZakatiMemo } from '../lib/zakat';

const router = Router();

/** GET /api/verify/:txHash */
router.get('/:txHash', async (req: Request, res: Response) => {
  const { txHash } = req.params;

  if (!/^[0-9a-f]{64}$/i.test(txHash)) {
    return res
      .status(400)
      .json({ isValid: false, transaction: null, error: 'Format txHash tidak valid.' });
  }

  try {
    const transaction = await fetchTransactionDetail(txHash);

    return res.json({
      isValid: transaction.status === 'success' && isZakatiMemo(transaction.memo),
      transaction,
    });
  } catch (error) {
    return res
      .status(404)
      .json({ isValid: false, transaction: null, error: getErrorMessage(error) });
  }
});

export default router;
