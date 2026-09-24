import type { NextConfig } from 'next';

// Static export for GitHub Pages. The deploy workflow sets NEXT_PUBLIC_BASE_PATH to
// "/<repo>" for project pages; leave it empty for a custom domain or local builds.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  poweredByHeader: false,
};
export default config;
