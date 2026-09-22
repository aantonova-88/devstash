import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Server actions and utilities only — no components, no DOM.
    environment: "node",
    include: ["src/lib/**/*.test.ts", "src/actions/**/*.test.ts"],
    restoreMocks: true,
    unstubEnvs: true,
  },
})
