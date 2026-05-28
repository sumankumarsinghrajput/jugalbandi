import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cast to any to satisfy NextConfig typing when disabling Turbopack
  turbopack: (false as unknown) as any,
};

export default nextConfig;