import type { FlatXoConfig } from 'xo';

const config: FlatXoConfig = {
  prettier: true,
  react: true,
  space: 2,
  rules: {
    'react/react-in-jsx-scope': 'off',
  },
  ignores: ['tsdown.config.ts'],
};

export default config;
