import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Layering is enforced here as well as described in docs/ARCHITECTURE.md:
 *
 *   engine   pure TypeScript: no clock, no randomness, no DOM, no React, no three
 *   content  authored data + validation, depends on the engine only
 *   storage  persistence, depends on the engine only
 *   three    only inside src/render/hub3d (and later, per-world 3D scenes), so it can never be pulled into the
 *            entry chunk by an innocent import
 */

const UI_LAYERS = ['app', 'game', 'ui', 'render', 'audio', 'parent', 'worlds', 'styles'];
const outsideOf = (...allowed) =>
  [
    'app',
    'game',
    'ui',
    'render',
    'audio',
    'parent',
    'worlds',
    'styles',
    'storage',
    'content',
    'engine',
  ]
    .filter((layer) => !allowed.includes(layer))
    .flatMap((layer) => [`@/${layer}`, `@/${layer}/**`, `**/${layer}/**`]);

const THREE_IMPORTS = ['three', 'three/**', '@react-three/**'];

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'test-results',
      'playwright-report',
      'blob-report',
      'node_modules',
      'docs/review',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      // Arrow shorthand that returns void (`onClick={() => doThing()}`) is idiomatic in React.
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },

  // Browser application code.
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error',
      'no-restricted-globals': [
        'error',
        { name: 'process', message: 'Browser code: use import.meta.env.' },
        { name: 'Buffer', message: 'Browser code: Node globals are not available.' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: THREE_IMPORTS,
              message:
                'three.js is only imported from src/render/hub3d so that it stays out of the entry chunk.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/render/hub3d/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
      // three.js objects are mutated in place by design (useFrame); the compiler-oriented rule does not model that.
      'react-hooks/immutability': 'off',
    },
  },

  // The learning engine: deterministic and headless.
  {
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...[
          'window',
          'document',
          'navigator',
          'localStorage',
          'sessionStorage',
          'indexedDB',
          'performance',
          'crypto',
          'fetch',
          'setTimeout',
          'setInterval',
          'requestAnimationFrame',
          'process',
        ].map((name) => ({
          name,
          message: 'The engine is pure: pass what it needs in as an argument.',
        })),
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use the seeded generator in engine/random.ts.',
        },
        { object: 'Date', property: 'now', message: 'The caller supplies the time.' },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "NewExpression[callee.name='Date']", message: 'The caller supplies the time.' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/**', ...THREE_IMPORTS],
              message: 'The engine is headless.',
            },
            { group: outsideOf('engine'), message: 'The engine depends on nothing but itself.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/content/**/*.ts', 'src/storage/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/**', ...THREE_IMPORTS],
              message: 'No UI in this layer.',
            },
            {
              group: UI_LAYERS.flatMap((layer) => [
                `@/${layer}`,
                `@/${layer}/**`,
                `**/${layer}/**`,
              ]),
              message: 'content and storage depend on the engine only.',
            },
          ],
        },
      ],
    },
  },

  // Tests, tools and configuration run in Node.
  {
    files: ['tests/**/*.{ts,tsx}', 'e2e/**/*.ts', 'scripts/**/*.{ts,mjs}', '*.{ts,js,mjs}'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      // Fakes and fixtures are deliberately loose.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['scripts/**/*.mjs', 'public/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  prettier,
);
