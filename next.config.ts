import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Disable the problematic messaging system
    webpackBuildWorker: false,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable webpack messaging in development
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;