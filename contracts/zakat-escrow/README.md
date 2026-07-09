# zakat-escrow (Soroban contract — PoC)

On-chain escrow that **enforces zakat distribution rules**, so transparency is
guaranteed by the contract instead of an off-chain memo convention.

> **Deployed on Stellar Testnet (asnaf-enforced):**
> [`CDXAY72KKR5ZUF2QSCX3IP7MB73GHSB3CQFZ5GAUQHD5LC7R45AGORIG`](https://stellar.expert/explorer/testnet/contract/CDXAY72KKR5ZUF2QSCX3IP7MB73GHSB3CQFZ5GAUQHD5LC7R45AGORIG)
> holding an IDR token
> [`CCSGSYYEN2LDNLOITGFI5QERSEV2ATR6FSFMALSUCHQ4NLAAC4VSTJSE`](https://stellar.expert/explorer/testnet/contract/CCSGSYYEN2LDNLOITGFI5QERSEV2ATR6FSFMALSUCHQ4NLAAC4VSTJSE).
> Exercised end-to-end: `init` → `verify_mustahiq(FAKIR)` → `deposit` → `distribute`
> succeeded, and `distribute` to an **unverified** address reverted with
> `Error(Contract, #4)` (NotVerified) — asnaf enforcement confirmed on-chain.
> (Prior instance `CCXQRXVB…` predated asnaf and is superseded.)

Funds are held in a named program's escrow and can only leave under contract
rules. Amounts are an IDR token (any SEP-41 / Stellar Asset Contract; integer
rupiah).

## Roles & invariants

| Role | Can do |
| --- | --- |
| Muzakki (donor) | `deposit` into a program's escrow |
| Amil (admin) | `verify_mustahiq`, `set_program_kind`, `distribute` |
| Mustahiq (recipient) | receive — only once verified under a valid asnaf |

Enforced by the contract:
1. For a **zakat** program, a recipient must be **verified under one of the
   eight asnaf** (QS 9:60). Infaq/sedekah programs (`set_program_kind(.., false)`)
   are unrestricted. Programs default to zakat, so the strict rule applies
   unless explicitly relaxed.
2. A program can never distribute more than it collected (anti-drain).
3. Only the **admin** may verify / distribute (`require_auth`).
4. Every deposit / distribution publishes an **event** for public audit.

## API

```
init(admin, token)
deposit(from, amount, program)
verify_mustahiq(addr, asnaf)     # asnaf ∈ {FAKIR, MISKIN, AMIL, MUALLAF,
                                 #          RIQAB, GHARIM, SABILILLAH, IBNUSABIL}
set_program_kind(program, zakat: bool)
distribute(program, recipients: Vec<(Address, i128)>)
program(program) -> { collected, distributed }
balance(program) -> i128
is_verified(addr) -> bool
mustahiq_asnaf(addr) -> Option<Symbol>
program_kind(program) -> bool     # true = zakat (asnaf-restricted)
```

## Test

```bash
cargo test
```

> Needs a working C linker. On Linux/CI it works out of the box (the `contracts`
> GitHub Actions job runs `cargo test`). On Windows without the Visual Studio
> C++ Build Tools, use the **GNU toolchain**, which bundles its own linker:
>
> ```bash
> rustup toolchain install stable-x86_64-pc-windows-gnu
> cargo +stable-x86_64-pc-windows-gnu test
> ```

## Build to WASM & deploy (next step, not part of the PoC)

```bash
rustup target add wasm32v1-none
# install the Stellar CLI: https://developers.stellar.org/docs/tools/cli
stellar contract build
stellar contract deploy --wasm target/wasm32v1-none/release/zakat_escrow.wasm \
  --network testnet --source <amil-key>
```

Then set `ZAKAT_ESCROW_CONTRACT_ID` / `IDR_TOKEN_CONTRACT_ID` in the backend
`.env` so the x402 layer points at the real contract.
