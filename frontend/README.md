# Zakati — Frontend

Next.js 14 (App Router) + React UI for the Zakati transparent zakat platform
on Stellar. Wallet integration via Freighter; transactions are built and
signed client-side and submitted directly to Horizon.

## Stack

- Next.js 14 (App Router) + React 18
- TypeScript (strict mode)
- `@stellar/stellar-sdk` + `@stellar/freighter-api`

## Structure

```
frontend/
├── app/              # routes: / · /dashboard · /amil · /tracker
├── components/       # shared client components (Nav)
├── hooks/            # useFreighter, useStellarAccount, useZakatPayment,
│                     #   useBatchDistribution, useTransactionStream
├── lib/
│   ├── stellar/      # config, account, transactions, history (browser)
│   ├── errors.ts
│   ├── logger.ts
│   └── api.ts        # backend REST client
├── types/            # shared domain types (mirrors backend/src/types)
└── config/
```

## Getting started

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3000
```

Requires the [Freighter](https://www.freighter.app/) browser extension set to
**Testnet**, and the backend running for the `/tracker` page
(`NEXT_PUBLIC_API_BASE_URL`).
