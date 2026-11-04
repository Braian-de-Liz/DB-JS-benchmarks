import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 1_800_000,
    hookTimeout: 600_000,
    include: ["tests/**/*-node.test.ts"],
    pool: "forks",
  },
});