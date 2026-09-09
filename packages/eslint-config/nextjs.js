import { defineConfig } from "eslint/config";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
import baseConfig from "./base.js";

/**
 * Next.js App Router preset: base + React + React Hooks + @next/next
 * (recommended and Core Web Vitals rules).
 */
export default defineConfig([
  ...baseConfig,
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    ...reactPlugin.configs.flat.recommended,
    languageOptions: {
      ...reactPlugin.configs.flat.recommended.languageOptions,
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      react: { version: "detect" },
    },
  },
  reactPlugin.configs.flat["jsx-runtime"],
  hooksPlugin.configs["recommended-latest"],
  nextPlugin.flatConfig.recommended,
  nextPlugin.flatConfig.coreWebVitals,
  {
    rules: {
      "react/prop-types": "off",
    },
  },
]);
