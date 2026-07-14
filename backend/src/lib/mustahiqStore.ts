/**
 * File-backed registry for mustahiq, keyed by Stellar address.
 *
 * Each entry records the asnaf (golongan) an amil has verified a recipient
 * under, so a zakat distribution can be checked against a syar'i-valid
 * category. Persisted to `data/mustahiq.json` so it survives restarts. Starts
 * empty — mustahiq are added by amil via POST /api/mustahiq.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import type { MustahiqRegistration } from '../types';
import { logger } from './logger';
import { getErrorMessage } from './errors';

const CONTEXT = 'lib/mustahiqStore';

const BASE_DIR = process.env.ZAKATI_DATA_DIR ?? process.cwd();
const DATA_FILE = join(BASE_DIR, 'data', 'mustahiq.json');

/** Load the registry from disk, defaulting to an empty list. */
function load(): MustahiqRegistration[] {
  try {
    if (existsSync(DATA_FILE)) {
      const raw = readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as MustahiqRegistration[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    logger.warn(CONTEXT, 'could not read mustahiq.json, starting empty', getErrorMessage(error));
  }
  return [];
}

/** Write the registry to disk, creating the data directory if needed. */
function persist(records: MustahiqRegistration[]): void {
  try {
    mkdirSync(dirname(DATA_FILE), { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));
  } catch (error) {
    logger.error(CONTEXT, 'could not persist mustahiq.json', getErrorMessage(error));
  }
}

let records: MustahiqRegistration[] = load();

export const mustahiqStore = {
  /** All registered mustahiq, optionally filtered to one institution. */
  list(lembagaId?: string): MustahiqRegistration[] {
    return lembagaId ? records.filter((m) => m.lembagaId === lembagaId) : records;
  },

  /** Find one mustahiq by Stellar address. */
  find(stellarAddress: string): MustahiqRegistration | undefined {
    return records.find((m) => m.stellarAddress === stellarAddress);
  },

  /**
   * Register a mustahiq, upserting by address so re-registering updates the
   * asnaf/name in place rather than duplicating the row.
   */
  upsert(record: MustahiqRegistration): MustahiqRegistration {
    const existing = records.find((m) => m.stellarAddress === record.stellarAddress);
    if (existing) {
      Object.assign(existing, record);
      persist(records);
      return existing;
    }
    records.push(record);
    persist(records);
    return record;
  },

  /** Test-only: reset the in-memory + on-disk registry. */
  _resetForTests(seedRecords: MustahiqRegistration[] = []): void {
    records = seedRecords;
    persist(records);
  },
};
