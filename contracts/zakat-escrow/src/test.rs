#![cfg(test)]

use super::{Error, ZakatEscrow, ZakatEscrowClient};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Events},
    token, vec, Address, Env,
};

/// Register a mock IDR token (Stellar Asset Contract) and return its address.
fn create_idr_token(env: &Env) -> Address {
    let issuer = Address::generate(env);
    env.register_stellar_asset_contract_v2(issuer).address()
}

/// Common fixture: escrow contract, IDR token, admin (amil), muzakki (with a
/// minted balance), and two mustahiq. `mock_all_auths` is enabled.
fn setup(env: &Env) -> (Address, Address, Address, Address, Address, Address) {
    env.mock_all_auths();
    let contract_id = env.register(ZakatEscrow, ());
    let token_id = create_idr_token(env);
    let admin = Address::generate(env);
    let muzakki = Address::generate(env);
    let m1 = Address::generate(env);
    let m2 = Address::generate(env);
    token::StellarAssetClient::new(env, &token_id).mint(&muzakki, &10_000_000);
    (contract_id, token_id, admin, muzakki, m1, m2)
}

#[test]
fn full_flow_distributes_only_to_verified_within_balance() {
    let env = Env::default();
    let (cid, tid, admin, muzakki, m1, m2) = setup(&env);
    let client = ZakatEscrowClient::new(&env, &cid);
    let token = token::Client::new(&env, &tid);
    let program = symbol_short!("ZAKATMAL");

    client.init(&admin, &tid);

    client.deposit(&muzakki, &1_000_000, &program);
    assert_eq!(client.balance(&program), 1_000_000);
    assert_eq!(token.balance(&cid), 1_000_000); // escrow holds the funds

    client.verify_mustahiq(&m1);
    client.verify_mustahiq(&m2);
    assert!(client.is_verified(&m1));

    let recipients = vec![&env, (m1.clone(), 600_000i128), (m2.clone(), 400_000i128)];
    client.distribute(&program, &recipients);

    assert_eq!(token.balance(&m1), 600_000);
    assert_eq!(token.balance(&m2), 400_000);
    assert_eq!(token.balance(&cid), 0); // escrow drained to recipients
    assert_eq!(client.balance(&program), 0);

    let stats = client.program(&program);
    assert_eq!(stats.collected, 1_000_000);
    assert_eq!(stats.distributed, 1_000_000);

    // deposit + 2 verify + distribute all published events (token events extra).
    assert!(env.events().all().len() >= 4);
}

#[test]
fn rejects_distribution_to_unverified_mustahiq() {
    let env = Env::default();
    let (cid, tid, admin, muzakki, m1, m2) = setup(&env);
    let client = ZakatEscrowClient::new(&env, &cid);
    let program = symbol_short!("ZAKATMAL");

    client.init(&admin, &tid);
    client.deposit(&muzakki, &1_000_000, &program);
    client.verify_mustahiq(&m1); // m2 deliberately left unverified

    let recipients = vec![&env, (m1.clone(), 100i128), (m2.clone(), 100i128)];
    assert_eq!(
        client.try_distribute(&program, &recipients),
        Err(Ok(Error::NotVerified)),
    );
}

#[test]
fn rejects_over_distribution() {
    let env = Env::default();
    let (cid, tid, admin, muzakki, m1, _m2) = setup(&env);
    let client = ZakatEscrowClient::new(&env, &cid);
    let program = symbol_short!("ZAKATMAL");

    client.init(&admin, &tid);
    client.deposit(&muzakki, &1_000i128, &program);
    client.verify_mustahiq(&m1);

    let recipients = vec![&env, (m1.clone(), 2_000i128)];
    assert_eq!(
        client.try_distribute(&program, &recipients),
        Err(Ok(Error::InsufficientEscrow)),
    );
}

#[test]
fn rejects_zero_amount_deposit() {
    let env = Env::default();
    let (cid, tid, admin, muzakki, _m1, _m2) = setup(&env);
    let client = ZakatEscrowClient::new(&env, &cid);
    let program = symbol_short!("ZAKATMAL");

    client.init(&admin, &tid);
    assert_eq!(
        client.try_deposit(&muzakki, &0i128, &program),
        Err(Ok(Error::InvalidAmount)),
    );
}

#[test]
fn rejects_double_init() {
    let env = Env::default();
    let (cid, tid, admin, _mu, _m1, _m2) = setup(&env);
    let client = ZakatEscrowClient::new(&env, &cid);

    client.init(&admin, &tid);
    assert_eq!(
        client.try_init(&admin, &tid),
        Err(Ok(Error::AlreadyInitialized)),
    );
}

#[test]
fn distribute_requires_admin_auth() {
    let env = Env::default();
    let (cid, tid, admin, muzakki, m1, _m2) = setup(&env);
    let client = ZakatEscrowClient::new(&env, &cid);
    let program = symbol_short!("ZAKATMAL");

    client.init(&admin, &tid);
    client.deposit(&muzakki, &1_000i128, &program);
    client.verify_mustahiq(&m1);

    // Clear all mocked auths: require_auth(admin) now has nothing to satisfy it.
    env.set_auths(&[]);
    let recipients = vec![&env, (m1.clone(), 100i128)];
    assert!(client.try_distribute(&program, &recipients).is_err());
}
