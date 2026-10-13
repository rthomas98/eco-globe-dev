import { defineConfig, globalIgnores } from "eslint/config";
import nextConfig from "@eco-globe/eslint-config/nextjs";

export default defineConfig([
  // Bundled third-party builds (minified MapLibre) are vendored, not source.
  globalIgnores(["public/vendor/**"]),
  ...nextConfig,
]);
