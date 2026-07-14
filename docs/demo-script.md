# Zakati — Demo Script & Checklist (APAC Stellar Hackathon)

A ~5-minute, low-risk end-to-end demo. The strategy: run the **wallet UI flows
that reliably work** with any funded Freighter testnet account, and prove the
**on-chain asnaf enforcement** with Stellar Expert links (no live-failure risk).

- Live contract (asnaf-enforced escrow): [`CDXAY72K…ORIG`](https://stellar.expert/explorer/testnet/contract/CDXAY72KKR5ZUF2QSCX3IP7MB73GHSB3CQFZ5GAUQHD5LC7R45AGORIG)
- IDR token (SAC): [`CCSGSYYE…TJSE`](https://stellar.expert/explorer/testnet/contract/CCSGSYYEN2LDNLOITGFI5QERSEV2ATR6FSFMALSUCHQ4NLAAC4VSTJSE)

---

## 0. One-line pitch (say this first, ~20s)

> "Indonesia's zakat potential is ~Rp327 trillion but only ~3% is realized —
> the gap is **trust**. Zakati puts every zakat transaction on Stellar,
> **Sharia-compliant by construction**: funded via a fiat anchor, calculated to
> nisab/haul, distributed only to the **8 asnaf**, and enforced **on-chain** —
> anyone can verify it."

---

## 1. Prerequisites (do BEFORE you present)

- [ ] **Freighter** extension installed, network set to **Testnet**.
- [ ] A Freighter testnet account, **funded** (friendbot) and holding some XLM.
- [ ] Backend running: `cd backend && npm run dev` → http://localhost:4000
- [ ] Frontend running: `cd frontend && npm run dev` → http://localhost:3000
- [ ] A second browser profile / wallet for the **amil** and **mustahiq** roles
      (or reuse one account and narrate the roles).
- [ ] Tabs pre-opened: `/dashboard`, `/amil`, `/mustahiq`, `/tracker`, and the
      contract on Stellar Expert.

> Tip: rehearse the SEP-24 popup once — some browsers block popups; allow them
> for localhost. The UI shows a fallback link if the popup is blocked.

---

## 2. Demo flow (the happy path)

### Beat 1 — Muzakki: connect + fiat on-ramp (composability) · ~60s
1. Open `/dashboard`, click **Connect Wallet** → pick Freighter.
2. If prompted, click **Tambahkan USDC Trustline** (one signature).
3. Click **↑ Top up saldo (Rupiah → USDC)** → completes SEP-10 auth (sign) →
   anchor popup opens (`testanchor.stellar.org`). Enter name/email, deposit
   **1–10 USDC**. Balance refreshes when the anchor delivers.
   - **Say:** "This is a real SEP-24 anchor on-ramp. In production this slot is
     a local **IDR anchor** from the Stellar Anchor Directory — the muzakki tops
     up in Rupiah; same flow."

### Beat 2 — Fiqh: calculator + niat · ~45s
1. Open `/kalkulator`, compute e.g. **Zakat Penghasilan** (show nisab = 85 g
   gold, 2.5%). Click through to pay (prefills type + amount on the dashboard).
2. Back on `/dashboard`, note the **jenis pembayaran** and the **Niat** checkbox
   — the submit button stays disabled until niat is affirmed.
   - **Say:** "Niat is a rukun of zakat, so we make the muzakki affirm it."

### Beat 3 — Pay zakat (transparent settlement) · ~30s
1. Pick a lembaga (or paste an amil address), confirm niat, click **Kirim Zakat**
   → sign in Freighter.
2. Click **Lihat di Stellar Expert** — show the on-chain payment + memo
   (`ZAKAT-MAL-PROFESI-2026`).

### Beat 4 — Amil: asnaf + hak amil · ~45s
1. Open `/amil` (as the amil wallet). Add 1–2 recipients, assign each an
   **asnaf** (e.g. Fakir, Miskin).
2. Try leaving one asnaf blank → the **per-row ⚠ error** blocks distribution.
3. Over-allocate the AMIL asnaf → the **hak-amil banner** flags the >12.5% cap.
   - **Say:** "Zakat can only go to the 8 asnaf, and the amil's own share is
     capped at 1/8 — both enforced here."

### Beat 5 — Mustahiq + public tracker · ~30s
1. Open `/mustahiq` (as a recipient) → show the received funds and the
   **asnaf badge** ("Fakir — verified by amil").
2. Open `/tracker`, paste the amil address → show inflow/outflow and the
   **per-category breakdown** (zakat vs infaq/sedekah kept separate).

### Beat 6 — The money shot: on-chain enforcement · ~40s
Open the escrow contract on Stellar Expert and show the recorded events, then:
   - **Say:** "The distribution isn't just a convention — it's enforced by a
     Soroban contract. Watch: distributing to an **unverified** address is
     **rejected on-chain**."
   - Run the live revert (impressive, safe — it fails by design):
     ```bash
     export PATH="$PATH:/c/Program Files (x86)/Stellar CLI"
     ESCROW=CDXAY72KKR5ZUF2QSCX3IP7MB73GHSB3CQFZ5GAUQHD5LC7R45AGORIG
     UNVERIFIED=$(stellar keys address zk-issuer)   # not a verified mustahiq
     stellar contract invoke --id $ESCROW --source zk-amil --network testnet \
       -- distribute --program ZAKATMAL \
       --recipients "[[\"$UNVERIFIED\",\"10000000000\"]]"
     # → error: HostError: Error(Contract, #4)   (NotVerified)
     ```
   - **Say:** "Error #4 — NotVerified. The chain guarantees zakat only reaches a
     valid asnaf."

### Close · ~15s
> "Sharia-correct, transparent, and enforced on Stellar — funded by an anchor,
> ready to swap in a local IDR ramp for production."

---

## 3. Judging-criteria cheat sheet (hit these out loud)

| Criterion | Where it shows |
| --- | --- |
| Built on Stellar / composability | SEP-24 anchor, Stellar Wallets Kit, Soroban escrow |
| On/off-ramp & local assets | Beat 1 (SEP-24 top-up; IDR anchor in prod) |
| Real product, not a prototype | Beat 6 (live contract, on-chain enforcement) |
| Financial inclusion | Distribution to fakir/miskin (asnaf) |
| Identity | `verify_mustahiq(addr, asnaf)` = on-chain asnaf attestation |
| Regional (SEA) relevance | Indonesian zakat, Rupiah framing |

---

## 4. Optional — drive the escrow UI live (Track B, needs prep)

The UI escrow buttons ("Setor ke Escrow", "Distribusi via Escrow") require the
connected wallet to hold the **IDR token** (muzakki) and to be the contract
**admin** (amil). To enable:

```bash
export PATH="$PATH:/c/Program Files (x86)/Stellar CLI"
IDR="IDR:$(stellar keys address zk-issuer)"
WALLET=<your Freighter testnet G-address>

# 1) trustline + mint IDR to the demo wallet
stellar tx new change-trust --source <wallet-secret-or-id> --line "$IDR" --network testnet
stellar tx new payment --source zk-issuer --destination "$WALLET" \
  --asset "$IDR" --amount 1000000000000 --network testnet

# 2) to drive amil verify/distribute from the UI, import zk-amil (the contract
#    admin) into Freighter — TESTNET ONLY, never do this with a mainnet key:
stellar keys show zk-amil        # prints the secret to import
```

Alternative (cleaner but slower): redeploy + `init` a fresh escrow with your
demo Freighter address as admin, then the UI amil flow works without importing.

> Recommendation for Demo Day: use **Track A** (Beats 1–6). It's robust; the
> escrow proof via Stellar Expert + the live NotVerified revert is more
> convincing than a fragile in-UI Soroban signature during a live pitch.

---

## 5. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Top-up popup blocked | Allow popups for localhost; use the fallback link the UI shows |
| Anchor deposit stuck | Reference anchor can be slow; keep polling, or retry |
| "USDC trustline belum ditambahkan" | Click the trustline button first (one signature) |
| Wrong network in wallet | Set Freighter to **Testnet** |
| Escrow UI button fails auth | Expected unless Track B prep is done; fall back to Beat 6 |
| Balance not updating | Click **↻ Segarkan** (mustahiq) or reload |

---

## 6. Reference

- Escrow: `CDXAY72KKR5ZUF2QSCX3IP7MB73GHSB3CQFZ5GAUQHD5LC7R45AGORIG`
- IDR token (SAC): `CCSGSYYEN2LDNLOITGFI5QERSEV2ATR6FSFMALSUCHQ4NLAAC4VSTJSE`
- Anchor: `testanchor.stellar.org` (SEP-10 + SEP-24, asset USDC)
- Soroban RPC: `https://soroban-testnet.stellar.org`
- Program symbol used by the UI: `ZAKATMAL`
- CLI identities: `zk-amil` (admin), `zk-muzakki`, `zk-mustahiq`, `zk-issuer`
