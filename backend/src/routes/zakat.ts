/**
 * /api/zakat — x402 payment endpoint backed by the Soroban zakat escrow (PoC).
 *
 * `POST /api/zakat/pay` without an `X-PAYMENT` header replies HTTP 402 with the
 * x402 `accepts` block. The client pays into the escrow contract and retries
 * with the `X-PAYMENT` header; on a valid (simulated) settlement it gets a 200
 * receipt.
 */
import { Router, type Request, type Response } from 'express';
import { formatIDR } from '../lib/idr';
import {
  buildChallenge,
  decodePaymentHeader,
  validatePaymentPayload,
  verifyEscrowPayment,
} from '../lib/x402';

const router = Router();

/** POST /api/zakat/pay — x402-gated zakat payment. */
router.post('/pay', (req: Request, res: Response) => {
  const { programId, amount } = (req.body ?? {}) as {
    programId?: string;
    amount?: number | string;
  };

  if (!programId || amount === undefined || amount === null || Number(amount) <= 0) {
    return res
      .status(400)
      .json({ error: 'Field "programId" dan "amount" (> 0) wajib diisi.' });
  }

  const target = { programId, amount };
  const header = req.header('x-payment');

  // No payment yet → issue the 402 challenge.
  if (!header) {
    return res.status(402).json(buildChallenge(target));
  }

  // Payment presented → decode, validate shape, then verify settlement.
  let payload;
  try {
    payload = decodePaymentHeader(header);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Header X-PAYMENT tidak valid.';
    return res.status(402).json(buildChallenge(target, reason));
  }

  const check = validatePaymentPayload(payload, target);
  if (!check.ok) {
    return res.status(402).json(buildChallenge(target, check.reason));
  }

  const settlement = verifyEscrowPayment(payload);
  if (!settlement.settled) {
    return res.status(402).json(buildChallenge(target, settlement.reason));
  }

  res.setHeader(
    'X-PAYMENT-RESPONSE',
    Buffer.from(JSON.stringify(settlement)).toString('base64'),
  );
  return res.json({
    settled: true,
    programId,
    amount: String(amount),
    currency: 'IDR',
    displayAmount: formatIDR(amount),
    txHash: settlement.txHash,
  });
});

export default router;
