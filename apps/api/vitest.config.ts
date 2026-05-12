import base from '@perdida-peso/config/vitest/base';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  base,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
      // Tests de integración requieren más tiempo (auth + db round-trip)
      testTimeout: 15_000,
      // Aislamiento de pool: evita race conditions en BBDD compartida
      pool: 'forks',
      poolOptions: { forks: { singleFork: true } },
    },
  }),
);
