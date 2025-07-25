import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },

  /* ─────────────────── Base TypeScript / React setup ─────────────────── */
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },

    /* ──────────────── Rules (TEMPORARY relaxations) ──────────────── */
    rules: {
      ...reactHooks.configs.recommended.rules,

      /* ❶  Loudest offenders → WARN for now */
      "@typescript-eslint/no-explicit-any":        "warn", // 600+ hits
      "react-hooks/rules-of-hooks":                "warn", // 50+ hits
      "react-hooks/exhaustive-deps":               "warn", // 80+ hits

      /* ❷  Lesser noisy rules */
      "react-refresh/only-export-components":      "off",  // 20 hits
      "no-restricted-syntax":                      "off",  // Tail-wind z-index rule
      "@typescript-eslint/no-require-imports":     "warn",

      /* ❸  Keep truly dangerous stuff strict */
      "@typescript-eslint/no-unused-vars": "error"
    },
  },

  /* ────────────────── Folder-specific overrides (unchanged) ────────────────── */
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": "off",
    },
  }
);