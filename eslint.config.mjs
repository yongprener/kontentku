import js from '@eslint/js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: ['**/.next/**', '**/node_modules/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: rootDir,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
    },
  },
);
