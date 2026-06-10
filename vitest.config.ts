import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Espeja el path alias @/* → ./* de tsconfig.json.
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    // Tests unitarios de lib/ (mappers, format, pos-cart, client). Entorno
    // node por default; el spec de client.ts pide happy-dom por archivo con
    // `// @vitest-environment happy-dom` (necesita window/location).
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
