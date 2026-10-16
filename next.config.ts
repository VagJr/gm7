import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  devIndicators: false,
  turbopack: { root: process.cwd() },
  experimental: { cpus: 2, workerThreads: false, turbopackMemoryLimit: 1024 * 1024 * 1024 },
};

export default nextConfig;
