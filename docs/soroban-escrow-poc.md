# PoC: Soroban Zakat Escrow + HTTP 402 (x402) + IDR

## Mengapa
Transparansi Zakati saat ini bertumpu pada **memo string** — tidak ada jaminan
on-chain bahwa dana terkumpul benar-benar tersalur ke mustahiq yang sah (lihat
temuan audit BUG-5). PoC ini memindahkan aturan ke **smart contract Soroban**
sehingga ditegakkan rantai blok, dan meminta pembayaran lewat protokol
**HTTP 402 (x402)** dengan denominasi **IDR**.

## Komponen
| Bagian | Lokasi | Status |
| --- | --- | --- |
| Kontrak escrow | `contracts/zakat-escrow/` | Ditulis + unit test (`cargo test`); butuh linker (CI/ubuntu) |
| Lapisan x402 | `backend/src/lib/x402.ts`, `backend/src/routes/zakat.ts` | Berjalan + teruji (vitest) + dicek live via curl |
| Format IDR | `backend/src/lib/idr.ts` | Teruji |

## Alur pembayaran (Muzakki → escrow → Mustahiq)

```
 Muzakki                Backend (x402)           Soroban: zakat-escrow        Amil
   │  POST /api/zakat/pay   │                          │                        │
   │ ──────────────────────>│                          │                        │
   │   402 Payment Required │  (accepts: asset=IDR,    │                        │
   │ <──────────────────────│   payTo=escrow, amount)  │                        │
   │                        │                          │                        │
   │  deposit(from,amount,program)  ───────────────────>│  (token.transfer →     │
   │                        │                          │   escrow; collected+=) │
   │  retry + X-PAYMENT     │                          │                        │
   │ ──────────────────────>│  verifyEscrowPayment()   │                        │
   │   200 + receipt        │ <────────────────────────│                        │
   │ <──────────────────────│                          │                        │
   │                        │            verify_mustahiq(addr) <────────────────│
   │                        │            distribute(program, recipients) <──────│
   │                        │                          │  (hanya verified;      │
   │                        │                          │   ≤ collected; events) │
```

Invarian yang ditegakkan kontrak: hanya mustahiq **terverifikasi** menerima;
tak bisa distribusi melebihi terkumpul; hanya **amil** yang berwenang; semua
operasi memancarkan **event** untuk audit publik.

## Deployed di Stellar Testnet ✅
PoC ini sudah **di-deploy & diverifikasi on-chain** (bukan hanya cargo test):

| Item | Contract ID | Explorer |
| --- | --- | --- |
| Zakat Escrow | `CCXQRXVBV7TPQSUFVX2H3FE43JQRPIP4BRHPE257Y3UAGAOIE4AYURJ5` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CCXQRXVBV7TPQSUFVX2H3FE43JQRPIP4BRHPE257Y3UAGAOIE4AYURJ5) |
| IDR token (SAC) | `CBKXWC5GZHMAQQTGXOFFABXZITVL3OVW6Z2CIFXNWZOM6U5PYKDK3AQM` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CBKXWC5GZHMAQQTGXOFFABXZITVL3OVW6Z2CIFXNWZOM6U5PYKDK3AQM) |

Transkrip verifikasi on-chain (program `ZAKATMAL2026`):
1. `mint` 1.000.000 IDR → muzakki → saldo muzakki `1000000`.
2. `deposit` 1.000.000 → escrow → `balance(program)` = `1000000`.
3. `verify_mustahiq` → `is_verified(mustahiq)` = `true`.
4. `distribute` 400.000 → mustahiq → saldo mustahiq `400000`, sisa escrow `600000`.
5. `distribute` ke alamat **belum diverifikasi** → ditolak kontrak: `HostError: Error(Contract, #4)` (= `Error::NotVerified`). Invarian ditegakkan on-chain. ✓

Reproduksi: `stellar contract build` lalu `stellar contract deploy --wasm target/wasm32v1-none/release/zakat_escrow.wasm --source <amil> --network testnet`. Identitas dibuat dengan `stellar keys generate <name> --network testnet --fund`.

## Protokol x402
- Tanpa `X-PAYMENT` → `402` + body `{ x402Version, accepts:[{ scheme:"soroban-escrow", network, asset, amount, payTo, extra:{currency:"IDR",decimals:0,...} }] }`.
- Klien membayar ke escrow, ulangi dengan header `X-PAYMENT` (base64 JSON payload) → `200` + receipt + header `X-PAYMENT-RESPONSE`.
- Lihat `backend/src/lib/x402.ts` untuk skema persis.

## Batas PoC (jujur)
- Logika kontrak dibuktikan lewat `cargo test` (6 test, native soroban-sdk) — lulus lokal (toolchain GNU di Windows) maupun di **CI ubuntu** (job `contracts`) — **dan sudah di-deploy + diverifikasi on-chain di testnet** (lihat tabel di atas).
- Sisa pekerjaan: `verifyEscrowPayment()` di backend masih **simulasi** (menerima payload ber-`txHash`/`proof`). Env `ZAKAT_ESCROW_CONTRACT_ID`/`IDR_TOKEN_CONTRACT_ID` sudah menunjuk kontrak live; tinggal mengganti badan fungsi dengan query Soroban-RPC ke kontrak tersebut.

## IDR nyata = butuh Anchor (lihat review arsitektur)
PoC memakai token IDR mock (SAC). Untuk Rupiah fiat sungguhan, dibutuhkan
**anchor SEP-24** (on/off-ramp IDR↔token) — di luar lingkup PoC. Token escrow
tinggal diarahkan ke aset IDR terbitan anchor.

## Cara menjalankan & memverifikasi
```bash
# Kontrak (di lingkungan dengan linker, mis. Linux/CI):
cd contracts/zakat-escrow && cargo test

# Backend x402:
cd backend && npx tsc --noEmit && npm test
npm run dev
# 402:
curl -i -X POST localhost:4000/api/zakat/pay -H 'Content-Type: application/json' \
  -d '{"programId":"ZAKAT-MAL-2026","amount":1000000}'
# settle (X-PAYMENT = base64 dari payload JSON):
PAY=$(printf '{"scheme":"soroban-escrow","network":"stellar-testnet","from":"G..","amount":"1000000","programId":"ZAKAT-MAL-2026","txHash":"deadbeef"}' | base64 -w0)
curl -i -X POST localhost:4000/api/zakat/pay -H "X-PAYMENT: $PAY" \
  -H 'Content-Type: application/json' -d '{"programId":"ZAKAT-MAL-2026","amount":1000000}'
```
