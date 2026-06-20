import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    // Run test files one at a time — prevents FK violations on shared local DB
    fileParallelism: false,
    testTimeout: 15000,
  },
});
