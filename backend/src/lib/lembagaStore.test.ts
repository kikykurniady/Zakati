import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LembagaAmil } from '../types';

/** Build a minimal valid record for tests. */
function makeRecord(id: string): LembagaAmil {
  return {
    id,
    name: id,
    description: '',
    stellarAddress: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    totalTerkumpul: '0',
    totalTerdistribusi: '0',
    jumlahMuzakki: 0,
    jumlahMustahiq: 0,
    isVerified: false,
    createdAt: new Date().toISOString(),
  };
}

let dataDir: string;

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'zakati-store-'));
  vi.stubEnv('ZAKATI_DATA_DIR', dataDir);
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dataDir, { recursive: true, force: true });
});

describe('lembagaStore', () => {
  it('seeds the demo institution on first load', async () => {
    const { lembagaStore } = await import('./lembagaStore');
    const list = lembagaStore.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('yayasan-zakati-demo');
  });

  it('persists added records across a reload', async () => {
    const first = await import('./lembagaStore');
    first.lembagaStore.add(makeRecord('lembaga-baru'));
    expect(first.lembagaStore.find('lembaga-baru')).toBeDefined();

    // Fresh module instance reads from the same on-disk file.
    vi.resetModules();
    const second = await import('./lembagaStore');
    expect(second.lembagaStore.find('lembaga-baru')).toBeDefined();
  });

  it('updates a record in place', async () => {
    const { lembagaStore } = await import('./lembagaStore');
    const updated = lembagaStore.update('yayasan-zakati-demo', { isVerified: false });
    expect(updated?.isVerified).toBe(false);
    expect(lembagaStore.update('does-not-exist', { isVerified: true })).toBeUndefined();
  });
});
