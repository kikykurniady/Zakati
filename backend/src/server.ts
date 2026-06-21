/**
 * Zakati backend HTTP server.
 *
 * Exposes read-oriented REST endpoints backed by Stellar Horizon. Write
 * operations (payments, distributions) are signed client-side via Freighter
 * and submitted directly to Horizon by the frontend.
 */
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { CORS_ORIGIN, PORT } from './config';
import { logger } from './lib/logger';
import lembagaRouter from './routes/lembaga';
import trackerRouter from './routes/tracker';
import verifyRouter from './routes/verify';

const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'zakati-backend' });
});

app.use('/api/lembaga', lembagaRouter);
app.use('/api/tracker', trackerRouter);
app.use('/api/verify', verifyRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
});

app.listen(PORT, () => {
  logger.info('server', `Zakati backend listening on http://localhost:${PORT}`);
});

export default app;
