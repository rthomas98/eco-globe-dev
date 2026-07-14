import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@eco-globe/ui", "@eco-globe/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
