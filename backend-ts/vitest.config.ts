import { mergeConfig } from 'vitest/config';
import shared from './vitest.shared';

export default mergeConfig(shared, {
  test: {
    // Legacy `test/Modules/` duplicates were removed; unit tests mirror `src/` layout.
    include: ['apps/api/test/unit/**/*.test.ts', 'apps/rpc/test/unit/**/*.test.ts', 'packages/*/test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    globals: false,
    testTimeout: 30_000,
    setupFiles: ['./vitest.setup.ts'],
    sequence: {
      sequential: true
    }
  }
});
