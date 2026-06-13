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
  },
});
