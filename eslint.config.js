import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        document: 'readonly',
        window: 'readonly',
        location: 'readonly',
        GM_getValue: 'readonly',
        GM_setValue: 'readonly',
        GM_registerMenuCommand: 'readonly',
        MutationObserver: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        alert: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        Audio: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['warn', 'all'],
      'semi': ['warn', 'always'],
      'quotes': ['warn', 'single', { avoidEscape: true }]
    }
  }
];
