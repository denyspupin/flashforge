import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup/global.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/drizzle/**", "**/dist/**", ".opencode/**", ".ocx/**"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    pool: "forks",
    fileParallelism: false,
  },
})
