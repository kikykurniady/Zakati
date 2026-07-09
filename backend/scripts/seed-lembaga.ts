/**
 * Seed the lembaga registry with well-known Indonesian zakat institutions
 * as TEST DATA on Stellar Testnet.
 *
 * Run with: `npx ts-node scripts/seed-lembaga.ts`
 *
 * Setiap lembaga mendapat akun testnet baru yang didanai Friendbot dan
 * diberi trustline USDC sehingga bisa menerima pembayaran uji. Nama dan
 * deskripsi mengikuti lembaga resmi, tetapi alamat Stellar-nya HANYA data
 * uji — bukan akun resmi lembaga tersebut.
 *
 * Catatan: server backend membaca registry sekali saat start; restart
 * backend setelah menjalankan skrip ini.
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { Asset, Keypair, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
import {
  BASE_FEE,
  FRIENDBOT_URL,
  NETWORK_PASSPHRASE,
  TIMEOUT,
  USDC_CODE,
  USDC_ISSUER,
  stellarServer,
} from '../src/lib/stellar/config';
import { lembagaStore } from '../src/lib/lembagaStore';
import type { LembagaAmil } from '../src/types';

dotenv.config();

const DISCLAIMER = 'Data uji testnet — bukan akun resmi lembaga.';

const LEMBAGA_TERKENAL: Array<{ id: string; name: string; description: string }> = [
  {
    id: 'baznas',
    name: 'BAZNAS RI',
    description: `Badan Amil Zakat Nasional — lembaga pemerintah nonstruktural pengelola zakat tingkat nasional. ${DISCLAIMER}`,
  },
  {
    id: 'dompet-dhuafa',
    name: 'Dompet Dhuafa',
    description: `LAZNAS pelopor filantropi Islam sejak 1993: zakat, wakaf, kemanusiaan, dan pemberdayaan. ${DISCLAIMER}`,
  },
  {
    id: 'rumah-zakat',
    name: 'Rumah Zakat',
    description: `LAZNAS dengan program Desa Berdaya di ribuan wilayah binaan se-Indonesia. ${DISCLAIMER}`,
  },
  {
    id: 'lazismu',
    name: 'LAZISMU',
    description: `Lembaga zakat nasional Muhammadiyah untuk pendidikan, kesehatan, dan ekonomi umat. ${DISCLAIMER}`,
  },
  {
    id: 'nucare-lazisnu',
    name: 'NU CARE-LAZISNU',
    description: `Lembaga zakat Nahdlatul Ulama dengan jaringan hingga tingkat ranting. ${DISCLAIMER}`,
  },
  {
    id: 'izi',
    name: 'Inisiatif Zakat Indonesia (IZI)',
    description: `LAZNAS spin-off PKPU yang fokus penuh pada pengelolaan zakat. ${DISCLAIMER}`,
  },
];

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function fund(publicKey: string, label: string): Promise<void> {
  await axios.get(`${FRIENDBOT_URL}/?addr=${encodeURIComponent(publicKey)}`);
  console.log(`  ✔ funded ${label} (${publicKey.slice(0, 6)}…)`);
  await sleep(1200);
}

async function addTrustline(kp: Keypair, usdc: Asset): Promise<void> {
  const source = await stellarServer.loadAccount(kp.publicKey());
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset: usdc }))
    .setTimeout(TIMEOUT)
    .build();
  tx.sign(kp);
  await stellarServer.submitTransaction(tx);
}

async function main(): Promise<void> {
  const usdc = new Asset(USDC_CODE, USDC_ISSUER);
  const created: Array<{ id: string; name: string; publicKey: string; secretKey: string }> = [];

  console.log(`Seeding ${LEMBAGA_TERKENAL.length} lembaga test ke registry…\n`);

  for (const info of LEMBAGA_TERKENAL) {
    if (lembagaStore.find(info.id)) {
      console.log(`  ↷ ${info.name} sudah ada — dilewati`);
      continue;
    }

    const kp = Keypair.random();
    await fund(kp.publicKey(), info.name);
    await addTrustline(kp, usdc);
    console.log(`  ✔ trustline USDC ${info.name}`);

    const record: LembagaAmil = {
      id: info.id,
      name: info.name,
      description: info.description,
      stellarAddress: kp.publicKey(),
      totalTerkumpul: '0',
      totalTerdistribusi: '0',
      jumlahMuzakki: 0,
      jumlahMustahiq: 0,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };
    lembagaStore.add(record);
    created.push({
      id: info.id,
      name: info.name,
      publicKey: kp.publicKey(),
      secretKey: kp.secret(),
    });
  }

  if (created.length > 0) {
    const outFile = join(process.cwd(), 'lembaga-test.keypair.json');
    writeFileSync(outFile, JSON.stringify(created, null, 2));
    console.log(`\nSecret keys (testnet-only) disimpan di ${outFile} (gitignored).`);
  }

  console.log('\n────────────────────────────────────────');
  console.log(`✅ Selesai. ${created.length} lembaga ditambahkan.`);
  for (const c of created) console.log(`   ${c.name.padEnd(32)} ${c.publicKey}`);
  console.log('\n⚠ Restart backend (npm run dev) agar registry baru terbaca.');
}

main().catch((error) => {
  console.error('Seed gagal:', error?.response?.data ?? error);
  process.exit(1);
});
