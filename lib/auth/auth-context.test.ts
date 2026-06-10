// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { hasFeature } from "./auth-context";

describe("hasFeature (fail-closed)", () => {
  it("sólo true explícito enciende el flag", () => {
    expect(hasFeature({ tickets: true }, "tickets")).toBe(true);
    expect(hasFeature({ tickets: false }, "tickets")).toBe(false);
  });

  it("flags ausentes o aún sin cargar cuentan como apagados", () => {
    expect(hasFeature({}, "tickets")).toBe(false);
    expect(hasFeature({ otro: true }, "tickets")).toBe(false);
  });
});
