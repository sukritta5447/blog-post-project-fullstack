import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      include: ["app.mjs", "apps/**/*.mjs", "middleware/**/*.mjs", "utils/**/*.mjs"],
      reporter: ["text", "html", "json-summary", "json"],
    },
  },
});
