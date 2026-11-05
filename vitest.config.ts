import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['tests/setup-safety.ts'],
    fileParallelism: false, // las pruebas de integración comparten la base de datos local
    testTimeout: 30000,
    hookTimeout: 60000,
    projects: [
      { extends: true, test: { name: 'unit', include: ['tests/unit/**/*.test.ts'] } },
      { extends: true, test: { name: 'integration', include: ['tests/integration/**/*.test.ts'] } },
    ],
  },
});
