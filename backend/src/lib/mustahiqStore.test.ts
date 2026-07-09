import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MustahiqRegistration } from '../types';

function makeRecord(address: string, asnaf = 'FAKIR'): MustahiqRegistration {
  return {
    stellarAddress: address,
    asnaf,
    name: 'Ahmad S.',
    lembagaId: 'yayasan-zakati-demo',
    verifiedAt: new Date().toISOString(),
  };
}

let dataDir: string;

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'zakati-mustahiq-'));
  vi.stubEnv('ZAKATI_DATA_DIR', dataDir);
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dataDir, { recursive: true, force: true });
});

describe('mustahiqStore', () => {
  it('starts empty', async () => {
    const { mustahiqStore } = await import('./mustahiqStore');
    expect(mustahiqStore.list()).toHaveLength(0);
  });

  it('persists an added mustahiq across a reload', async () => {
    const first = await import('./mustahiqStore');
    first.mustahiqStore.upsert(makeRecord('GADDR1'));
    expect(first.mustahiqStore.find('GADDR1')).toBeDefined();

    vi.resetModules();
    const second = await import('./mustahiqStore');
    expect(second.mustahiqStore.find('GADDR1')?.asnaf).toBe('FAKIR');
  });

  it('upserts by address rather than duplicating', async () => {
    const { mustahiqStore } = await import('./mustahiqStore');
    mustahiqStore.upsert(makeRecord('GADDR1', 'FAKIR'));
    mustahiqStore.upsert(makeRecord('GADDR1', 'MISKIN'));
    expect(mustahiqStore.list()).toHaveLength(1);
    expect(mustahiqStore.find('GADDR1')?.asnaf).toBe('MISKIN');
  });

  it('filters the list by institution', async () => {
    const { mustahiqStore } = await import('./mustahiqStore');
    mustahiqStore.upsert({ ...makeRecord('GADDR1'), lembagaId: 'a' });
    mustahiqStore.upsert({ ...makeRecord('GADDR2'), lembagaId: 'b' });
    expect(mustahiqStore.list('a')).toHaveLength(1);
    expect(mustahiqStore.list('a')[0].stellarAddress).toBe('GADDR1');
  });
});
