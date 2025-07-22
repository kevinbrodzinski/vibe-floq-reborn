
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
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
    rules: {
      ...reactHooks.configs.recommended.rules,
      // React Hooks rules to prevent hook order issues
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      
      // Z-index governance rules - strict for application code
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/\\bz-(\\[.*?]|[4-9][0-9]+)\\b/]",
          message: "Hard-coded Tailwind z-index detected. Use Z constants from '@/constants/z' instead."
        },
        {
          selector: "Property[key.name='zIndex'] > Literal[value=/^([4-9][0-9]|[1-9][0-9]{2,})$/]",
          message: "Inline zIndex detected. Use Z.{layer} constants from '@/constants/z' instead."
        }
      ],
    },
  },
  // Allow z-index values in UI library components
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": "off",
    },
  }
);
