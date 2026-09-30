import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  // Inlined at build time: the footer's "Last updated" date.
  env: { BUILD_TIME: new Date().toISOString() },
};
export default config;
