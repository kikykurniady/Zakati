/**
 * Zakati backend HTTP server.
 *
 * Exposes read-oriented REST endpoints backed by Stellar Horizon. Write
 * operations (payments, distributions) are signed client-side via Freighter
 * and submitted directly to Horizon by the frontend.
 */
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { CORS_ORIGINS, IS_DEV, PORT } from './config';
import { logger } from './lib/logger';
import hargaRouter from './routes/harga';
import lembagaRouter from './routes/lembaga';
import trackerRouter from './routes/tracker';
import verifyRouter from './routes/verify';
import zakatRouter from './routes/zakat';

const app = express();

// In development, any localhost/127.0.0.1 origin is allowed so the frontend
// still works when Next.js falls back to another port (3001, …). Production
// stays locked to the configured origin list.
const isLocalOrigin = (origin: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      // Non-browser callers (curl, server-to-server) send no Origin header.
      if (!origin || CORS_ORIGINS.includes(origin) || (IS_DEV && isLocalOrigin(origin))) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} tidak diizinkan.`));
    },
  }),
);
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'zakati-backend' });
});

app.use('/api/harga', hargaRouter);
app.use('/api/lembaga', lembagaRouter);
app.use('/api/tracker', trackerRouter);
app.use('/api/verify', verifyRouter);
app.use('/api/zakat', zakatRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
});

app.listen(PORT, () => {
  logger.info('server', `Zakati backend listening on http://localhost:${PORT}`);
});

export default app;
