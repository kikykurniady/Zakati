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

## Protokol x402
- Tanpa `X-PAYMENT` → `402` + body `{ x402Version, accepts:[{ scheme:"soroban-escrow", network, asset, amount, payTo, extra:{currency:"IDR",decimals:0,...} }] }`.
- Klien membayar ke escrow, ulangi dengan header `X-PAYMENT` (base64 JSON payload) → `200` + receipt + header `X-PAYMENT-RESPONSE`.
- Lihat `backend/src/lib/x402.ts` untuk skema persis.

## Batas PoC (jujur)
- Logika kontrak dibuktikan lewat `cargo test` (6 test, native soroban-sdk) — lulus lokal (toolchain GNU di Windows) maupun di **CI ubuntu** (job `contracts`). **Belum di-deploy**; `verifyEscrowPayment()` di backend masih **simulasi** (menerima payload yang membawa `txHash`/`proof`). Ganti dengan lookup Soroban-RPC/Horizon nyata setelah deploy.

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
