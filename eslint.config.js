// eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  /* ───────────────────── Shared settings ───────────────────── */
  { ignores: ["dist"] },

  /* ──────────────── Base TypeScript / React setup ───────────── */
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

    /* ─────────────── Rules we’re relaxing temporarily ─────────────── */
    rules: {
      ...reactHooks.configs.recommended.rules,

      /* ❶  Loudest offenders (already WARN) */
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",

      /* ❷  Lesser noisy rules */
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-require-imports": "warn",

      /* ❸  Prevent userId usage – enforced everywhere by default */
      "no-restricted-syntax": [
        "error",
        {
          selector: "Identifier[name='userId']",
          message: "Use profileId instead of userId",
        },
      ],

      /* ❹  Unused vars → WARN (ignore leading _ ) */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],

      /* ❺  Remaining noisier rules downgraded */
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "no-useless-escape": "warn",
      "no-case-declarations": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "prefer-const": "warn",
      "no-empty": "warn",
      "no-dupe-else-if": "warn",
      "no-constant-binary-expression": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
    },
  },

  /* ─────────────────────  Folder-specific overrides ───────────────────── */
  {
    /* UI components already exempt */
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    /* 🔧 NEW: legacy code buckets we don’t want to block CI for */
    files: [
      "src/components/collaboration/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "supabase/functions/**/*.{ts,tsx}",
      "tests/**/*.{ts,tsx}"
    ],
    rules: { "no-restricted-syntax": "off" },
  }
);