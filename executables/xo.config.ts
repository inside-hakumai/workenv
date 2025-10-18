import type { FlatXoConfig } from 'xo';

const config: FlatXoConfig = [
  {
    prettier: true,
    react: true,
    space: 2,
    ignores: ['tsdown.config.ts'],
    rules: {
      'react/react-in-jsx-scope': 'off',
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            camelCase: true,
            pascalCase: true,
            kebabCase: true,
          },
        },
      ],
      'unicorn/prefer-event-target': 'off',
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
];

export default config;
