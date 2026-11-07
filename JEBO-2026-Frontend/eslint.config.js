import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/', '.vite/', 'coverage/'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    }
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.flat['recommended-latest'].rules,
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/globals': 'warn'
    }
  },
  {
    files: ['vite.config.js', 'tests/setup.js', 'playwright.config.*'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } }
  },
  {
    files: ['**/*.{js,jsx}'],
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  }
];
