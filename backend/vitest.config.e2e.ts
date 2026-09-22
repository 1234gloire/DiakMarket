import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup-env.ts'],
    // Order transitions and other state-machine specs create/consume orders sequentially;
    // running spec files in parallel with a shared test DB risks flaky cross-file timing.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
