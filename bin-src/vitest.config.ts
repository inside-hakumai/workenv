import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    typecheck: {
      include: [
        'tests/**/*.{test,spec}.ts',
        'tests/**/*.{test,spec}.tsx',
      ],
      tsconfig: 'tsconfig.tests.json',
    },
  },
});

