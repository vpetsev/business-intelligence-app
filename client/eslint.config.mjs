import js from '@eslint/js';
import next from '@next/eslint-plugin-next';
import hooks from 'eslint-plugin-react-hooks';
export default [
  { ignores: ['.next/**', 'out/**', 'coverage/**', 'public/**', 'node_modules/**'] },
  { files: ['**/*.{js,jsx,mjs}'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } }, globals: {
    window: 'readonly', document: 'readonly', localStorage: 'readonly', fetch: 'readonly', FormData: 'readonly', TextEncoder: 'readonly', AbortController: 'readonly', URL: 'readonly', File: 'readonly', console: 'readonly', process: 'readonly', module: 'readonly', __dirname: 'readonly', require: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', React: 'readonly',
  } }, plugins: { '@next/next': next, 'react-hooks': hooks }, rules: {
    ...js.configs.recommended.rules,
    ...next.configs.recommended.rules,
    ...next.configs['core-web-vitals'].rules,
    'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'error',
    'no-unused-vars': 'off', // Core ESLint does not track JSX component references.
    '@next/next/no-img-element': 'off', // Preserve bundled template assets.
  } },
];
