import { defineConfig } from "eslint/config";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import baseConfig from "./base.js";

/**
 * Expo / React Native preset: base + React + React Hooks.
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
  {
    rules: {
      "react/prop-types": "off",
    },
  },
]);
