/**
 * Application-level configuration loaded from environment variables.
 * Centralises server + network settings for the backend process.
 */
import dotenv from 'dotenv';

dotenv.config();

/** HTTP port the Express server listens on. */
export const PORT: number = parseInt(process.env.PORT ?? '4000', 10);

/** Allowed CORS origin (the frontend dev server by default). */
export const CORS_ORIGIN: string =
  process.env.CORS_ORIGIN ?? 'http://localhost:3000';

/** True when running outside production (enables verbose logging). */
export const IS_DEV: boolean = process.env.NODE_ENV !== 'production';

/**
 * Shared secret guarding admin-only endpoints (e.g. verifying a lembaga).
 * When empty, those endpoints respond 503 instead of running open.
 */
export const ADMIN_TOKEN: string = process.env.ADMIN_TOKEN ?? '';
