import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

function readSharedPublicEnv(key: string) {
  try {
    const file = readFileSync(
      new URL("../web/.env.local", import.meta.url),
      "utf8",
    );
    const line = file
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith(`${key}=`));
    if (!line) return undefined;
    const value = line.slice(line.indexOf("=") + 1).trim();
    return value.replace(/^(['"])(.*)\1$/, "$2");
  } catch {
    return undefined;
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ["@eco-globe/ui", "@eco-globe/shared"],
  env: {
    // The standalone Admin app shares the web portal's public Mapbox project.
    NEXT_PUBLIC_MAPBOX_TOKEN:
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
      readSharedPublicEnv("NEXT_PUBLIC_MAPBOX_TOKEN"),
  },
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
