# Zakati — Backend

Stellar SDK utilities, REST API, and demo tooling for the Zakati transparent
zakat platform (Stellar Testnet).

## Stack

- Node.js + TypeScript (strict mode)
- Express (REST API)
- `@stellar/stellar-sdk` (Horizon + transaction building)

## Structure

```
backend/
├── src/
│   ├── config/         # server/env config
│   ├── types/          # shared domain types (mirrored to frontend)
│   ├── lib/
│   │   ├── stellar/    # config, account, transactions, history
│   │   ├── errors.ts   # ZakatiError hierarchy + Horizon error parsing
│   │   └── logger.ts   # dev logger
│   ├── routes/         # lembaga, tracker, verify
│   └── server.ts       # Express entrypoint
└── scripts/
    └── setup-demo.ts   # seeds testnet demo data → demo-accounts.json
```

## Getting started

```bash
cd backend
cp .env.example .env
npm install
npm run dev          # http://localhost:4000
```

## API

| Method | Endpoint                | Description                              |
| ------ | ----------------------- | ---------------------------------------- |
| GET    | `/health`               | Liveness probe                           |
| GET    | `/api/lembaga`          | List institutions (Amil)                 |
| POST   | `/api/lembaga`          | Register an institution                  |
| GET    | `/api/lembaga/:id`      | Institution detail + on-chain stats      |
| GET    | `/api/tracker/:address` | Transactions + stats for an address      |
| GET    | `/api/verify/:txHash`   | Verify a transaction is a valid transfer |

## Demo data

```bash
npm run demo:setup   # creates testnet accounts, mints USDC, simulates zakat
```

Outputs `demo-accounts.json` (gitignored — contains secret keys).
