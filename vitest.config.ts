import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/e2e/global-setup.ts"],
    // The E2E tests share one Linkwarden instance and some mutate account-wide state
    // (dashboard layout, preservation queue), so files run one at a time.
    fileParallelism: false,
    testTimeout: 90_000,
    hookTimeout: 30_000,
  },
});
