/**
 * Zakati demo data bootstrap for Stellar Testnet.
 *
 * Run with: `npm run demo:setup` (i.e. `ts-node scripts/setup-demo.ts`).
 *
 * Creates and funds an Amil, Muzakki, and Mustahiq cohort, sets up USDC
 * trustlines, mints demo USDC to the Muzakki, simulates zakat payments, and
 * writes everything to demo-accounts.json (gitignored — contains secrets).
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import {
  Asset,
  Keypair,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
import {
  BASE_FEE,
  FRIENDBOT_URL,
  NETWORK_PASSPHRASE,
  TIMEOUT,
  stellarServer,
} from '../src/lib/stellar/config';

dotenv.config();

interface DemoAccount {
  publicKey: string;
  secretKey: string;
  name: string;
}

/** Sleep helper to respect Friendbot rate limits. */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Fund an account via Friendbot. */
async function fund(publicKey: string, label: string): Promise<void> {
  await axios.get(`${FRIENDBOT_URL}/?addr=${encodeURIComponent(publicKey)}`);
  console.log(`  ✔ funded ${label} (${publicKey.slice(0, 6)}…)`);
  await sleep(1200);
}

/** Submit a signed transaction and return its hash. */
async function submit(builderFn: () => Promise<string>): Promise<string> {
  const xdr = await builderFn();
  const tx = TransactionBuilder.fromXDR(xdr, NETWORK_PASSPHRASE);
  const result = await stellarServer.submitTransaction(tx);
  return result.hash;
}

/** Add a USDC trustline for `kp`. */
async function addTrustline(kp: Keypair, usdc: Asset): Promise<void> {
  await submit(async () => {
    const source = await stellarServer.loadAccount(kp.publicKey());
    const tx = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(Operation.changeTrust({ asset: usdc, limit: '1000000' }))
      .setTimeout(TIMEOUT)
      .build();
    tx.sign(kp);
    return tx.toXDR();
  });
}

/** Send a USDC payment from `from` to `to` with an optional memo. */
async function payUSDC(
  from: Keypair,
  to: string,
  usdc: Asset,
  amount: string,
  memo?: string,
): Promise<string> {
  return submit(async () => {
    const source = await stellarServer.loadAccount(from.publicKey());
    const builder = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    }).addOperation(
      Operation.payment({ destination: to, asset: usdc, amount }),
    );
    if (memo) builder.addMemo((await import('@stellar/stellar-sdk')).Memo.text(memo));
    const tx = builder.setTimeout(TIMEOUT).build();
    tx.sign(from);
    return tx.toXDR();
  });
}

async function main(): Promise<void> {
  console.log('\n🌙 Zakati — Demo Setup (Stellar Testnet)\n');

  // 1. Master USDC issuer.
  const issuer = process.env.DEMO_ISSUER_SECRET
    ? Keypair.fromSecret(process.env.DEMO_ISSUER_SECRET)
    : Keypair.random();
  const usdc = new Asset('USDC', issuer.publicKey());

  console.log('Issuer:', issuer.publicKey());
  console.log('USDC Asset: USDC-' + issuer.publicKey().slice(0, 8) + '…\n');

  // 2. Generate keypairs.
  const amil: Keypair = Keypair.random();
  const muzakki: Keypair[] = [Keypair.random(), Keypair.random(), Keypair.random()];
  const mustahiq: Keypair[] = Array.from({ length: 8 }, () => Keypair.random());

  // 3. Fund everyone (sequential — Friendbot rate limits).
  console.log('Funding accounts via Friendbot…');
  await fund(issuer.publicKey(), 'issuer');
  await fund(amil.publicKey(), 'amil');
  for (let i = 0; i < muzakki.length; i += 1) await fund(muzakki[i].publicKey(), `muzakki-${i + 1}`);
  for (let i = 0; i < mustahiq.length; i += 1) await fund(mustahiq[i].publicKey(), `mustahiq-${i + 1}`);

  // 4. Trustlines for all holders (not the issuer).
  console.log('\nSetting up USDC trustlines…');
  for (const kp of [amil, ...muzakki, ...mustahiq]) {
    await addTrustline(kp, usdc);
    console.log(`  ✔ trustline ${kp.publicKey().slice(0, 6)}…`);
  }

  // 5. Mint USDC to Muzakki accounts.
  console.log('\nMinting demo USDC to Muzakki…');
  const muzakkiBalances = ['5000', '2500', '1000'];
  for (let i = 0; i < muzakki.length; i += 1) {
    await payUSDC(issuer, muzakki[i].publicKey(), usdc, muzakkiBalances[i]);
    console.log(`  ✔ muzakki-${i + 1}: ${muzakkiBalances[i]} USDC`);
  }

  // 6. Simulate zakat payments (Muzakki → Amil).
  console.log('\nSimulating zakat payments → Amil…');
  const payments: Array<[Keypair, string, string]> = [
    [muzakki[0], '500', 'ZAKAT-MAL-2024'],
    [muzakki[1], '250', 'ZAKAT-FITRAH-2024'],
    [muzakki[0], '1000', 'INFAQ-MASJID'],
    [muzakki[2], '150', 'SEDEKAH-UMUM'],
    [muzakki[1], '300', 'ZAKAT-MAL-2024'],
  ];
  for (const [from, amount, memo] of payments) {
    const hash = await payUSDC(from, amil.publicKey(), usdc, amount, memo);
    console.log(`  ✔ ${amount} USDC [${memo}] → ${hash.slice(0, 10)}…`);
  }

  // 7. Write demo-accounts.json.
  const output = {
    network: 'TESTNET',
    issuer: { publicKey: issuer.publicKey(), secretKey: issuer.secret() },
    amil: <DemoAccount & { name: string }>{
      publicKey: amil.publicKey(),
      secretKey: amil.secret(),
      name: 'Yayasan Zakati Demo',
    },
    muzakki: muzakki.map((kp, i) => ({
      publicKey: kp.publicKey(),
      secretKey: kp.secret(),
      name: `Muzakki ${i + 1}`,
      usdcBalance: muzakkiBalances[i],
    })),
    mustahiq: mustahiq.map((kp, i) => ({
      publicKey: kp.publicKey(),
      secretKey: kp.secret(),
      name: `Mustahiq ${i + 1}`,
      nominalDiterima: '0',
    })),
  };

  const outPath = join(process.cwd(), 'demo-accounts.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log('\n────────────────────────────────────────');
  console.log('✅ Demo setup complete.');
  console.log(`   Amil address : ${amil.publicKey()}`);
  console.log(`   Muzakki      : ${muzakki.length}`);
  console.log(`   Mustahiq     : ${mustahiq.length}`);
  console.log(`   Saved to     : ${outPath}`);
  console.log('────────────────────────────────────────\n');
}

main().catch((err) => {
  console.error('\n❌ Demo setup failed:', err?.message ?? err);
  process.exit(1);
});
