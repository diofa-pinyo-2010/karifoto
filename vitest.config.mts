import { defineConfig } from 'vitest/config';

// Unit tests only — pure functions, no DOM and no React, so Vitest's default
// `node` environment is what we want. Anything needing a browser or a database
// is deliberately out of scope and stays manual QA.
//
// `tsconfigPaths` is not optional: oxlint bans relative imports, so a test
// reaches its subject through the `@/` alias like the rest of the codebase.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
