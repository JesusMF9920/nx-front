import { describe, expect, it } from "vitest";

import { generateTempPassword } from "./generate-password";

describe("generateTempPassword", () => {
  it("tiene la longitud pedida (default 16) y respeta length custom", () => {
    expect(generateTempPassword()).toHaveLength(16);
    expect(generateTempPassword(20)).toHaveLength(20);
  });

  it("incluye al menos una minúscula, mayúscula, dígito y símbolo", () => {
    for (let i = 0; i < 50; i++) {
      const p = generateTempPassword();
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[0-9]/);
      expect(p).toMatch(/[!@#$%*?_-]/);
    }
  });

  it("es distinta en llamadas sucesivas (entropía)", () => {
    const set = new Set(Array.from({ length: 100 }, () => generateTempPassword()));
    expect(set.size).toBe(100);
  });
});
