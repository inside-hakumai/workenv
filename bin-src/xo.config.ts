import type { FlatXoConfig } from 'xo';

const config: FlatXoConfig = [
  { ignores: ['tsdown.config.ts'] },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}', 'tests/**/*.{js,jsx,ts,tsx}'],
    prettier: true,
    react: true,
    space: 2,
    rules: {
      '@typescript-eslint/naming-convention': 'off',
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
      'no-warning-comments': 'off',
      'max-params': 'off',
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/naming-convention': 'off',
    },
  },
];

export default config;
