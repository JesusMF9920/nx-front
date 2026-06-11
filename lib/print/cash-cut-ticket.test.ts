import { describe, expect, it } from "vitest";

import type { ApiBusinessSettings, ApiCashSessionDetail } from "@/lib/api/types";
import { buildCashCutTicketHtml } from "./cash-cut-ticket";

const business: ApiBusinessSettings = {
  name: "Imprenta Aurora",
  address: null,
  phone: null,
  rfc: null,
  email: null,
  logoKey: null,
  logoUrl: null,
  updatedAt: null,
};

const cut = (over: Partial<ApiCashSessionDetail> = {}): ApiCashSessionDetail => ({
  id: "s1",
  folio: "CAJA-1001",
  status: "closed",
  openingFloat: 500,
  openedById: "u1",
  openedAt: "2026-06-11T14:00:00.000Z",
  closedById: "u1",
  closedAt: "2026-06-11T21:00:00.000Z",
  countedCash: 600,
  expectedCash: 682,
  difference: -82,
  closingNotes: "turno tarde",
  movements: [
    {
      id: "m1",
      type: "deposit",
      amount: 50,
      reason: "cambio <b>extra</b>",
      createdById: "u1",
      createdAt: "2026-06-11T15:00:00.000Z",
    },
    {
      id: "m2",
      type: "withdrawal",
      amount: 100,
      reason: "pago proveedor",
      createdById: "u1",
      createdAt: "2026-06-11T18:00:00.000Z",
    },
  ],
  cashTotal: 232,
  cashCount: 1,
  terminalTotal: 116,
  terminalCount: 1,
  ...over,
});

describe("buildCashCutTicketHtml", () => {
  it("incluye folio, fondo, cobrado, movimientos, esperado/contado y faltante", () => {
    const html = buildCashCutTicketHtml(cut(), business);

    expect(html).toContain("CORTE DE CAJA");
    expect(html).toContain("CAJA-1001");
    expect(html).toContain("$500.00"); // fondo
    expect(html).toContain("Efectivo cobrado (1)");
    expect(html).toContain("$232.00");
    expect(html).toContain("pago proveedor");
    expect(html).toContain("$682.00"); // esperado
    expect(html).toContain("$600.00"); // contado
    expect(html).toContain("Faltante");
    expect(html).toContain("−$82.00");
    expect(html).toContain("Terminal (informativo, 1)");
    expect(html).toContain("Notas: turno tarde");
  });

  it("sobrante y cuadre exacto se etiquetan distinto", () => {
    expect(buildCashCutTicketHtml(cut({ difference: 20 }), business)).toContain(
      "Sobrante",
    );
    expect(buildCashCutTicketHtml(cut({ difference: 0 }), business)).toContain(
      "Cuadra exacto",
    );
  });

  it("XSS: las razones de movimientos van escapadas", () => {
    const html = buildCashCutTicketHtml(cut(), business);
    expect(html).not.toContain("<b>extra</b>");
    expect(html).toContain("&lt;b&gt;extra&lt;/b&gt;");
  });
});
