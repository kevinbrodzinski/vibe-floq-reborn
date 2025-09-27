import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // TypeScript consistency
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' }
      ],
      // Mapbox filter protection
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ArrayExpression > ArrayExpression.elements[1] > ArrayExpression.elements[0][value="get"]',
          message: 'Use literal property keys in Mapbox filters (not [\'get\', ...]). This prevents filter expression errors.'
        },
        {
          selector: 'VariableDeclarator[id.name=/.*LAYER_(TOGGLE|SET).*/] ~ VariableDeclarator[id.name=/.*LAYER_(TOGGLE|SET).*/]',
          message: 'Duplicate event identifiers detected. Use centralized Events object instead.'
        }
      ],
      // Event system protection
      'no-duplicate-case': 'error',
      'no-duplicate-keys': 'error'
    },
  },
)