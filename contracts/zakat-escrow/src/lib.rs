#![no_std]
//! # Zakat Escrow (Soroban PoC)
//!
//! Holds zakat funds in escrow and enforces distribution rules **on-chain**,
//! so transparency is guaranteed by the contract rather than by an off-chain
//! convention (a memo string). Funds are denominated in an IDR token (any
//! SEP-41 / Stellar Asset Contract token; amounts are integer rupiah).
//!
//! Roles:
//! - **Muzakki** (donor) deposits zakat into a named program's escrow.
//! - **Amil** (admin) verifies mustahiq and distributes escrowed funds.
//! - **Mustahiq** (recipient) can only receive once verified.
//!
//! Enforced invariants:
//! 1. Only **verified** mustahiq can receive a distribution.
//! 2. A program can never distribute more than it collected (anti-drain).
//! 3. Only the **admin** (amil) may verify or distribute (`require_auth`).
//! 4. Every deposit / distribution publishes an event for public audit.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env,
    Symbol, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    NotVerified = 4,
    InsufficientEscrow = 5,
}

/// Running totals for one zakat program (e.g. `ZAKAT-MAL-2026`).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProgramStats {
    /// Total deposited by muzakki, in IDR.
    pub collected: i128,
    /// Total released to mustahiq, in IDR.
    pub distributed: i128,
}

#[contracttype]
enum DataKey {
    Admin,
    Token,
    Program(Symbol),
    Verified(Address),
}

#[contract]
pub struct ZakatEscrow;

#[contractimpl]
impl ZakatEscrow {
    /// One-time setup: record the amil (`admin`) and the IDR `token` contract.
    pub fn init(env: Env, admin: Address, token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        Ok(())
    }

    /// Muzakki → escrow. Pulls `amount` IDR from `from` into the contract and
    /// credits the program's collected total.
    pub fn deposit(env: Env, from: Address, amount: i128, program: Symbol) -> Result<(), Error> {
        from.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let token_addr = read_token(&env)?;
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&from, &env.current_contract_address(), &amount);

        let mut stats = read_program(&env, &program);
        stats.collected += amount;
        write_program(&env, &program, &stats);

        env.events()
            .publish((symbol_short!("deposit"), program), (from, amount));
        Ok(())
    }

    /// Amil marks a mustahiq address as eligible to receive distributions.
    pub fn verify_mustahiq(env: Env, addr: Address) -> Result<(), Error> {
        read_admin(&env)?.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Verified(addr.clone()), &true);
        env.events().publish((symbol_short!("verify"),), addr);
        Ok(())
    }

    /// Amil → mustahiq. Releases escrowed IDR to a batch of recipients.
    ///
    /// Reverts unless every recipient is verified and the batch total fits
    /// within the program's remaining escrow balance.
    pub fn distribute(
        env: Env,
        program: Symbol,
        recipients: Vec<(Address, i128)>,
    ) -> Result<(), Error> {
        read_admin(&env)?.require_auth();

        let mut total: i128 = 0;
        for (addr, amount) in recipients.iter() {
            if amount <= 0 {
                return Err(Error::InvalidAmount);
            }
            if !read_verified(&env, &addr) {
                return Err(Error::NotVerified);
            }
            total += amount;
        }

        let mut stats = read_program(&env, &program);
        if total > stats.collected - stats.distributed {
            return Err(Error::InsufficientEscrow);
        }

        let token_addr = read_token(&env)?;
        let client = token::Client::new(&env, &token_addr);
        let contract = env.current_contract_address();
        for (addr, amount) in recipients.iter() {
            client.transfer(&contract, &addr, &amount);
        }

        stats.distributed += total;
        write_program(&env, &program, &stats);

        env.events()
            .publish((Symbol::new(&env, "distribute"), program), total);
        Ok(())
    }

    /// Collected/distributed totals for a program.
    pub fn program(env: Env, program: Symbol) -> ProgramStats {
        read_program(&env, &program)
    }

    /// Remaining escrow balance for a program (`collected - distributed`).
    pub fn balance(env: Env, program: Symbol) -> i128 {
        let stats = read_program(&env, &program);
        stats.collected - stats.distributed
    }

    /// Whether `addr` is a verified mustahiq.
    pub fn is_verified(env: Env, addr: Address) -> bool {
        read_verified(&env, &addr)
    }
}

fn read_admin(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(Error::NotInitialized)
}

fn read_token(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Token)
        .ok_or(Error::NotInitialized)
}

fn read_program(env: &Env, program: &Symbol) -> ProgramStats {
    env.storage()
        .persistent()
        .get(&DataKey::Program(program.clone()))
        .unwrap_or(ProgramStats {
            collected: 0,
            distributed: 0,
        })
}

fn write_program(env: &Env, program: &Symbol, stats: &ProgramStats) {
    env.storage()
        .persistent()
        .set(&DataKey::Program(program.clone()), stats);
}

fn read_verified(env: &Env, addr: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Verified(addr.clone()))
        .unwrap_or(false)
}

mod test;
