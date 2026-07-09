import { describe, expect, it } from 'vitest';
import { parseTomlField } from './config';

const TOML = `
NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"
WEB_AUTH_ENDPOINT = "https://testanchor.stellar.org/auth"
TRANSFER_SERVER_SEP0024 = "https://testanchor.stellar.org/sep24"

[[CURRENCIES]]
code = "USDC"
issuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
`;

describe('parseTomlField', () => {
  it('extracts a quoted top-level field', () => {
    expect(parseTomlField(TOML, 'WEB_AUTH_ENDPOINT')).toBe(
      'https://testanchor.stellar.org/auth',
    );
    expect(parseTomlField(TOML, 'TRANSFER_SERVER_SEP0024')).toBe(
      'https://testanchor.stellar.org/sep24',
    );
  });

  it('returns null for an absent field', () => {
    expect(parseTomlField(TOML, 'TRANSFER_SERVER_SEP0031')).toBeNull();
  });
});
