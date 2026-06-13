import { describe, expect, it } from "vitest";

import type { ApiBusinessSettings, ApiOrderDetail } from "@/lib/api/types";
import { buildThermalTicketHtml, escapeHtml } from "./thermal-ticket";

const business = (
  over: Partial<ApiBusinessSettings> = {},
): ApiBusinessSettings => ({
  name: "Imprenta Aurora",
  address: "Av. Siempre Viva 123, CDMX",
  phone: "55 1234 5678",
  rfc: "AAA010101AAA",
  email: null,
  logoKey: null,
  logoUrl: null,
  taxRegimen: null,
  postalCode: null,
  defaultClaveProdServ: null,
  defaultClaveUnidad: null,
  defaultObjetoImpuesto: null,
  updatedAt: null,
  ...over,
});

const order = (over: Partial<ApiOrderDetail> = {}): ApiOrderDetail =>
  ({
    id: "order-1",
    folio: "ORD-1001",
    clientId: "client-1",
    clientName: "Café Aurora",
    createdById: "user-1",
    status: "production",
    subtotal: 605,
    discount: 0,
    tax: 96.8,
    total: 701.8,
    paid: 701.8,
    paymentMethods: ["cash"],
    deliverAt: null,
    notes: null,
    quoteId: null,
    cancelledAt: null,
    items: [
      {
        id: "item-1",
        productId: "prod-1",
        productName: "Playera estampada",
        sku: "PLA-001",
        qty: 3,
        unitPrice: 120,
        unitCost: 48,
        variantCode: "ALG",
        variantLabel: "Algodón blanco",
        sizeBreakdown: [
          { sizeId: "CH", qty: 2, surcharge: 0, sizeLabel: "Chica" },
          { sizeId: "EG", qty: 1, surcharge: 5, sizeLabel: "Extra grande" },
        ],
        dimensionData: null,
        source: "internal",
        supplierName: null,
        needsApproval: false,
        status: "production",
        designVersion: 0,
        lineTotal: 365,
      },
      {
        id: "item-2",
        productId: "prod-2",
        productName: "Lona publicitaria",
        sku: "LON-002",
        qty: 0.96,
        unitPrice: 250,
        unitCost: 100,
        variantCode: null,
        variantLabel: null,
        sizeBreakdown: null,
        dimensionData: {
          width: 1.2,
          height: 0.8,
          unit: "m",
          priceMode: "area",
          computedQty: 0.96,
        },
        source: "internal",
        supplierName: null,
        needsApproval: false,
        status: "production",
        designVersion: 0,
        lineTotal: 240,
      },
    ],
    payments: [
      {
        id: "pay-1",
        method: "cash",
        amount: 500,
        reference: null,
        receivedById: "user-1",
        createdAt: "2026-06-10T12:00:00.000Z",
      },
      {
        id: "pay-2",
        method: "terminal",
        amount: 201.8,
        reference: "1234",
        receivedById: "user-1",
        createdAt: "2026-06-10T12:01:00.000Z",
      },
    ],
    createdAt: "2026-06-10T12:00:00.000Z",
    updatedAt: "2026-06-10T12:00:00.000Z",
    ...over,
  }) as ApiOrderDetail;

describe("escapeHtml", () => {
  it("escapa los 5 caracteres peligrosos", () => {
    expect(escapeHtml(`<script>alert("x&'y")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&amp;&#39;y&quot;)&lt;/script&gt;",
    );
  });
});

describe("buildThermalTicketHtml", () => {
  it("incluye negocio, folio, cliente, líneas y totales formateados", () => {
    const html = buildThermalTicketHtml(order(), business());

    expect(html).toContain("Imprenta Aurora");
    expect(html).toContain("Av. Siempre Viva 123, CDMX");
    expect(html).toContain("RFC AAA010101AAA");
    expect(html).toContain("ORD-1001");
    expect(html).toContain("Cliente: Café Aurora");
    expect(html).toContain("Playera estampada · Algodón blanco");
    expect(html).toContain("$605.00"); // subtotal
    expect(html).toContain("$96.80"); // IVA
    expect(html).toContain("$701.80"); // total
    expect(html).toContain("@page { size: 80mm auto; margin: 0; }");
  });

  it("XSS: datos de usuario con HTML no salen crudos", () => {
    const html = buildThermalTicketHtml(
      order({
        clientName: `<img src=x onerror=alert(1)>`,
        notes: `<script>steal()</script>`,
        items: [
          {
            ...order().items[0],
            productName: `Playera "rota" <b>`,
          },
        ],
      }),
      business({ name: `Imprenta <iframe>` }),
    );

    expect(html).not.toContain("<script>steal()");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("Imprenta <iframe>");
    expect(html).toContain("&lt;script&gt;steal()&lt;/script&gt;");
    expect(html).toContain("Playera &quot;rota&quot; &lt;b&gt;");
  });

  it("desglose de tallas con sizeLabel y sobreprecio; dimensiones calculadas", () => {
    const html = buildThermalTicketHtml(order(), business());

    expect(html).toContain("Chica ×2");
    expect(html).toContain("Extra grande ×1 (+$5.00)");
    expect(html).toContain("1.2 × 0.8 m = 0.96 m²");
  });

  it("pagos en español con referencia", () => {
    const html = buildThermalTicketHtml(order(), business());

    expect(html).toContain("Efectivo");
    expect(html).toContain("Terminal ref. 1234");
    expect(html).toContain("$201.80");
  });

  it("saldo pendiente sólo cuando hay deuda real", () => {
    const paidInFull = buildThermalTicketHtml(order(), business());
    expect(paidInFull).not.toContain("Saldo pendiente");

    const partial = buildThermalTicketHtml(order({ paid: 300 }), business());
    expect(partial).toContain("Saldo pendiente");
    expect(partial).toContain("$401.80");
  });

  it("descuento, entrega y notas sólo cuando existen", () => {
    const plain = buildThermalTicketHtml(order(), business());
    expect(plain).not.toContain("Descuento");
    expect(plain).not.toContain("Entrega:");
    expect(plain).not.toContain("Notas:");

    const full = buildThermalTicketHtml(
      order({
        discount: 50,
        deliverAt: "2026-06-12T12:00:00.000Z",
        notes: "Entregar en recepción",
      }),
      business(),
    );
    expect(full).toContain("Descuento");
    expect(full).toContain("−$50.00");
    expect(full).toContain("Entrega:");
    expect(full).toContain("Notas: Entregar en recepción");
  });

  it("logo: sólo se renderiza con URL http(s); otros esquemas se ignoran", () => {
    const noLogo = buildThermalTicketHtml(order(), business());
    expect(noLogo).not.toContain("<img");

    const withLogo = buildThermalTicketHtml(
      order(),
      business({ logoUrl: "https://cdn.example/logo.png?sig=abc" }),
    );
    expect(withLogo).toContain('class="logo"');
    expect(withLogo).toContain("https://cdn.example/logo.png?sig=abc");

    const evil = buildThermalTicketHtml(
      order(),
      business({ logoUrl: "javascript:alert(1)" }),
    );
    expect(evil).not.toContain("javascript:alert(1)");
    expect(evil).not.toContain("<img");
  });
});
