import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jvtolivkllohfdqgnpqs.supabase.co',
      },
    ],
  },
};

export default nextConfig;