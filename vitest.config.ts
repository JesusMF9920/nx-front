import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Espeja el path alias @/* → ./* de tsconfig.json.
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    // Tests unitarios de lib/ (mappers, format, pos-cart, client) y tests de
    // componente en components/ y app/. Entorno node por default; los specs que
    // necesitan DOM (client.ts y los .test.tsx) piden happy-dom por archivo con
    // `// @vitest-environment happy-dom`.
    include: [
      "lib/**/*.test.{ts,tsx}",
      "components/**/*.test.tsx",
      "app/**/*.test.tsx",
    ],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      // Fase 1: medimos lib/ (app/ y components/ aún no tienen tests de
      // página/componentes). Se amplía conforme crezca la cobertura.
      include: ["lib/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "**/node_modules/**",
        "**/*.config.*",
      ],
      // Umbrales baseline (basados en lib/ actual); subir conforme se
      // agreguen tests de api/, auth/, hooks/, theme/, etc.
      thresholds: {
        statements: 34,
        branches: 32,
        functions: 28,
        lines: 34,
      },
    },
  },
});
