import { describe, expect, it } from 'vitest';
import { validateStellarAddress, getMinimumBalance } from './account';

describe('validateStellarAddress', () => {
  it('accepts a well-formed Ed25519 public key', () => {
    // Stellar SDF testnet USDC issuer (valid G... address).
    expect(
      validateStellarAddress(
        'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      ),
    ).toBe(true);
  });

  it('rejects malformed or non-public-key strings', () => {
    expect(validateStellarAddress('')).toBe(false);
    expect(validateStellarAddress('not-an-address')).toBe(false);
    expect(validateStellarAddress('GABC')).toBe(false);
    // A secret seed (S...) is not a valid public key.
    expect(
      validateStellarAddress(
        'SDLTVK7T3RH5BC5T6P5LBLD25PWPDFXLDWAGTW4FBCFNFLLN7L5G5TVB',
      ),
    ).toBe(false);
  });
});

describe('getMinimumBalance', () => {
  it('computes base reserve plus per-entry reserve', () => {
    expect(getMinimumBalance(0)).toBe('1.0000000');
    expect(getMinimumBalance(1)).toBe('1.5000000');
    expect(getMinimumBalance(4)).toBe('3.0000000');
  });
});
