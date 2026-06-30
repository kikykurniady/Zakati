/**
 * File-backed registry for Amil institutions (Lembaga).
 *
 * Registered institutions are persisted to `data/lembaga.json` so they survive
 * server restarts. On first load the registry is seeded with a demo
 * institution; if a `demo-accounts.json` produced by `scripts/setup-demo.ts`
 * exists, the demo Amil's Stellar address is wired in automatically so its
 * on-chain totals resolve against real testnet data.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import type { LembagaAmil } from '../types';
import { logger } from './logger';
import { getErrorMessage } from './errors';

const CONTEXT = 'lib/lembagaStore';

/**
 * Base directory for persisted data. Defaults to the running process cwd (the
 * backend package root); overridable via ZAKATI_DATA_DIR for tests.
 */
const BASE_DIR = process.env.ZAKATI_DATA_DIR ?? process.cwd();
const DATA_FILE = join(BASE_DIR, 'data', 'lembaga.json');
const DEMO_ACCOUNTS_FILE = join(BASE_DIR, 'demo-accounts.json');

/** Read the demo Amil's Stellar address, if a demo setup has been run. */
function readDemoAmilAddress(): string {
  try {
    if (!existsSync(DEMO_ACCOUNTS_FILE)) return '';
    const raw = readFileSync(DEMO_ACCOUNTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as { amil?: { publicKey?: string } };
    return parsed.amil?.publicKey ?? '';
  } catch (error) {
    logger.warn(CONTEXT, 'could not read demo-accounts.json', getErrorMessage(error));
    return '';
  }
}

/** Build the initial registry (one demo institution). */
function seed(): LembagaAmil[] {
  return [
    {
      id: 'yayasan-zakati-demo',
      name: 'Yayasan Zakati Demo',
      description:
        'Lembaga amil zakat demonstrasi untuk platform Zakati di Stellar Testnet.',
      stellarAddress: readDemoAmilAddress(),
      totalTerkumpul: '0',
      totalTerdistribusi: '0',
      jumlahMuzakki: 0,
      jumlahMustahiq: 0,
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
  ];
}

/** Load the registry from disk, falling back to the seed. */
function load(): LembagaAmil[] {
  try {
    if (existsSync(DATA_FILE)) {
      const raw = readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as LembagaAmil[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (error) {
    logger.warn(CONTEXT, 'could not read lembaga.json, reseeding', getErrorMessage(error));
  }
  const seeded = seed();
  persist(seeded);
  return seeded;
}

/** Write the registry to disk, creating the data directory if needed. */
function persist(records: LembagaAmil[]): void {
  try {
    mkdirSync(dirname(DATA_FILE), { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));
  } catch (error) {
    logger.error(CONTEXT, 'could not persist lembaga.json', getErrorMessage(error));
  }
}

let records: LembagaAmil[] = load();

export const lembagaStore = {
  /** All registered institutions. */
  list(): LembagaAmil[] {
    return records;
  },

  /** Find one institution by id. */
  find(id: string): LembagaAmil | undefined {
    return records.find((l) => l.id === id);
  },

  /** Append a new institution and persist. */
  add(record: LembagaAmil): LembagaAmil {
    records.push(record);
    persist(records);
    return record;
  },

  /** Mutate an institution in place and persist. Returns the updated record. */
  update(id: string, patch: Partial<LembagaAmil>): LembagaAmil | undefined {
    const target = records.find((l) => l.id === id);
    if (!target) return undefined;
    Object.assign(target, patch);
    persist(records);
    return target;
  },

  /** Test-only: reset the in-memory + on-disk registry to a fresh seed. */
  _resetForTests(seedRecords?: LembagaAmil[]): void {
    records = seedRecords ?? seed();
    persist(records);
  },
};
