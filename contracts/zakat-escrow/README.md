# zakat-escrow (Soroban contract — PoC)

On-chain escrow that **enforces zakat distribution rules**, so transparency is
guaranteed by the contract instead of an off-chain memo convention.

Funds are held in a named program's escrow and can only leave under contract
rules. Amounts are an IDR token (any SEP-41 / Stellar Asset Contract; integer
rupiah).

## Roles & invariants

| Role | Can do |
| --- | --- |
| Muzakki (donor) | `deposit` into a program's escrow |
| Amil (admin) | `verify_mustahiq`, `distribute` |
| Mustahiq (recipient) | receive — only once verified |

Enforced by the contract:
1. Only **verified** mustahiq can receive.
2. A program can never distribute more than it collected (anti-drain).
3. Only the **admin** may verify / distribute (`require_auth`).
4. Every deposit / distribution publishes an **event** for public audit.

## API

```
init(admin, token)
deposit(from, amount, program)
verify_mustahiq(addr)
distribute(program, recipients: Vec<(Address, i128)>)
program(program) -> { collected, distributed }
balance(program) -> i128
is_verified(addr) -> bool
```

## Test

```bash
cargo test
```

> Requires a working C linker. The `x86_64-pc-windows-msvc` toolchain needs the
> **Visual Studio C++ Build Tools**; alternatively use the GNU toolchain
> (`rustup default stable-x86_64-pc-windows-gnu` + MinGW), or just run it on
> Linux/CI (the `contracts` GitHub Actions job does exactly this).

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
