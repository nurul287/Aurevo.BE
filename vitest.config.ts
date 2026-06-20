import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    // Sequential execution — prevents DB race conditions between test files
    singleThread: true,
    testTimeout: 15000,
  },
});
