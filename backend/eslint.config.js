// backend/eslint.config.js
import js from '@eslint/js';
import pluginImport from 'eslint-plugin-import';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  // pastas ignoradas
  { ignores: ['node_modules/**', 'coverage/**', 'uploads/**'] },

  // regras base para o projeto
  {
    files: ['src/**/*.js', 'tests/**/*.js', 'server.js'],
    languageOptions: {
  ecmaVersion: 2022, // 👈 permite top-level await
  sourceType: 'module',
  globals: { ...globals.node, ...globals.jest }
},
    plugins: { import: pluginImport },
    rules: {
      ...js.configs.recommended.rules,
      // compatibilidade com Prettier (desliga conflitos)
      ...prettier.rules,
      // ajustes do projeto
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'import/no-unresolved': 'off'
    }
  }
];
