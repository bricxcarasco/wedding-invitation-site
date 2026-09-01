import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// Flat config. Plugins are registered explicitly and their recommended rule
// sets are spread in, which keeps this file independent of whether a given
// plugin version ships its preset in eslintrc or flat shape.
export default [
  { ignores: ['dist', 'node_modules', 'coverage'] },

  // Application and config sources.
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs['recommended-latest'].rules,
      // The Vite variant of react-refresh/recommended: same rule, tuned for
      // Vite's fast refresh boundary so constant exports are not flagged.
      ...reactRefresh.configs.vite.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },

  // Test files additionally get the Vitest and Node globals so `describe`,
  // `it`, `expect`, `vi` and friends lint cleanly.
  {
    files: ['src/**/*.test.{js,jsx}', 'src/tests/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest,
      },
    },
  },

  // Vercel Serverless Functions under `api/` run in the Node runtime, so they
  // need Node globals (`process`, etc.) rather than the browser set the app
  // sources use.
  {
    files: ['api/**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]
