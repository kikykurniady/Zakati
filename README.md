# Zakati

Platform **zakat transparan** berbasis **Stellar blockchain** untuk pasar
Indonesia. Setiap transaksi zakat, infaq, dan sedekah tercatat on-chain dan
dapat diverifikasi publik. Tiga peran: **Muzakki** (donatur), **Amil**
(lembaga pengelola), **Mustahiq** (penerima).

## Monorepo

| Folder      | Stack                                   | Deskripsi                                              |
| ----------- | --------------------------------------- | ------------------------------------------------------ |
| [`backend/`](./backend)  | Node + Express + TypeScript + Stellar SDK | REST API (lembaga, tracker, verify) + skrip demo testnet |
| [`frontend/`](./frontend) | Next.js 14 (App Router) + React + Freighter | UI Muzakki/Amil/Tracker, hooks, dan utilitas Stellar client-side |

### Halaman frontend

| Rute            | Peran    | Fungsi                                                          |
| --------------- | -------- | -------------------------------------------------------------- |
| `/`             | —        | Landing page                                                   |
| `/lembaga`      | Publik   | Browse lembaga amil + statistik on-chain mereka                |
| `/dashboard`    | Muzakki  | Bayar zakat (alamat manual atau pilih lembaga)                 |
| `/amil`         | Amil     | Distribusi batch ke mustahiq                                   |
| `/mustahiq`     | Mustahiq | Dana zakat yang diterima wallet terhubung                      |
| `/tracker`      | Publik   | Lacak transaksi alamat Stellar mana pun                        |

## Arsitektur

- **Transaksi (write)** — dibangun & ditandatangani di browser via Freighter,
  lalu di-submit langsung ke Horizon (Stellar Testnet).
- **Pembacaan (read)** — backend mengambil & mengagregasi data dari Horizon
  untuk endpoint tracker/verify/lembaga.
- **Aset** — XLM (fee native) + USDC testnet.

## Quickstart

```bash
# Backend
cd backend && cp .env.example .env && npm install && npm run dev   # :4000

# Frontend (terminal lain)
cd frontend && cp .env.example .env.local && npm install && npm run dev   # :3000
```

Butuh ekstensi [Freighter](https://www.freighter.app/) diset ke **Testnet**.

## Seed data demo

```bash
cd backend && npm run demo:setup   # buat akun testnet, mint USDC, simulasi zakat
```

Lihat README masing-masing folder untuk detail lengkap.
