/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // The Stellar SDK tries to load the native `sodium-native` addon for fast
    // signing and falls back to pure-JS `tweetnacl` when it is absent
    // (stellar-base guards with `if (!Object.keys(sodium).length)`). Aliasing
    // it to an empty module keeps the native addon out of the bundle and
    // silences the "Critical dependency" build warning, while signing still
    // works via tweetnacl.
    config.resolve.alias = {
      ...config.resolve.alias,
      'sodium-native': false,
      'require-addon': false,
    };
    return config;
  },
};

module.exports = nextConfig;
