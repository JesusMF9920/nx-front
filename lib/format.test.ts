import { describe, expect, it } from "vitest";

import { fmtDate, fmtDateLong, fmtInt, fmtMXN } from "./format";

/**
 * toLocaleString es-MX puede usar NBSP (U+00A0) o narrow NBSP (U+202F) como
 * separador según la versión de ICU — se normalizan para que los asserts no
 * dependan del runtime.
 */
const norm = (s: string) => s.replace(/[  ]/g, " ");

describe("fmtMXN", () => {
  it("formatea pesos con 2 decimales", () => {
    expect(norm(fmtMXN(92.8))).toBe("$92.80");
    expect(norm(fmtMXN(0))).toBe("$0.00");
  });

  it("agrupa miles con coma (es-MX)", () => {
    expect(norm(fmtMXN(12345.5))).toBe("$12,345.50");
  });
});

describe("fmtInt", () => {
  it("agrupa miles sin decimales", () => {
    expect(norm(fmtInt(1842))).toBe("1,842");
    expect(norm(fmtInt(0))).toBe("0");
  });
});

describe("fmtDate / fmtDateLong", () => {
  // Mediodía local: el mismo patrón anti-corrimiento que usa el POS.
  const d = new Date(2026, 5, 11, 12, 0, 0); // 11-jun-2026 (mes 0-based)

  it("fmtDate → día y mes corto", () => {
    expect(norm(fmtDate(d)).toLowerCase()).toContain("11");
    expect(norm(fmtDate(d)).toLowerCase()).toContain("jun");
  });

  it("fmtDateLong → incluye día de la semana", () => {
    const out = norm(fmtDateLong(d)).toLowerCase();
    expect(out).toContain("jue");
    expect(out).toContain("junio");
  });

  it("acepta string ISO y timestamp numérico", () => {
    expect(norm(fmtDate(d.toISOString()))).toBe(norm(fmtDate(d)));
    expect(norm(fmtDate(d.getTime()))).toBe(norm(fmtDate(d)));
  });
});
