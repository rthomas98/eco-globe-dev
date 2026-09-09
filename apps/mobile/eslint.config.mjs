import { defineConfig, globalIgnores } from "eslint/config";
import reactNativeConfig from "@eco-globe/eslint-config/react-native";

export default defineConfig([
  globalIgnores([".expo/**", "android/**", "ios/**"]),
  ...reactNativeConfig,
]);
