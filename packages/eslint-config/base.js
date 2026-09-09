import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

/**
 * Shared base preset: ESLint recommended + typescript-eslint recommended,
 * with Prettier disabling stylistic rules. Consumed by the Next.js and
 * React Native presets in this package.
 */
export default defineConfig([
  globalIgnores([
    "dist/**",
    "build/**",
    "coverage/**",
    "node_modules/**",
    ".next/**",
    ".expo/**",
    ".turbo/**",
    "next-env.d.ts",
    "expo-env.d.ts",
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Node-side tooling written as CommonJS (metro/postcss/next configs, scripts).
    files: ["**/*.cjs", "**/*.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  prettierConfig,
]);
