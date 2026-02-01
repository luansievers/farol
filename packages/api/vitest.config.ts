import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules", "dist", "src/generated"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@modules": resolve(__dirname, "./src/modules"),
      "@shared": resolve(__dirname, "./src/shared"),
    },
  },
});
