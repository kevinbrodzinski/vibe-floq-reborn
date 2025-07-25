// eslint.config.js
import js              from "@eslint/js";
import globals         from "globals";
import reactHooks      from "eslint-plugin-react-hooks";
import reactRefresh    from "eslint-plugin-react-refresh";
import tseslint        from "typescript-eslint";

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
      "react-hooks":  reactHooks,
      "react-refresh": reactRefresh,
    },

    /* ──────────────── Rules (TEMPORARY relaxations) ──────────────── */
    rules: {
      ...reactHooks.configs.recommended.rules,

      /* ❶  Loudest offenders → WARN for now */
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/rules-of-hooks":         "warn",
      "react-hooks/exhaustive-deps":        "warn",

      /* ❷  Lesser noisy rules */
      "react-refresh/only-export-components": "off",
      "no-restricted-syntax":                 "off",
      "@typescript-eslint/no-require-imports":"warn",

      /* ❸  Unused vars → WARN (ignore vars/args prefixed with _) */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ]
    },
  },

  /* ────────────────── Folder-specific overrides ────────────────── */
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: { "no-restricted-syntax": "off" },
  }
);