import { describe, expect, it } from "vitest";

import {
  buildCollectionReminderWhatsappMessage,
  buildOrderReceiptWhatsappMessage,
  buildProofWhatsappMessage,
  buildQuoteWhatsappMessage,
  buildWaMeUrl,
  normalizeMxPhone,
} from "./whatsapp";

describe("normalizeMxPhone", () => {
  it("10 dígitos locales → prefijo 52", () => {
    expect(normalizeMxPhone("4491112233")).toBe("524491112233");
  });

  it("limpia espacios, guiones, paréntesis y +", () => {
    expect(normalizeMxPhone("+52 449 111-22-33")).toBe("524491112233");
    expect(normalizeMxPhone("(449) 111 2233")).toBe("524491112233");
  });

  it("ya con 52 (12 dígitos) o 521 legacy (13) se respeta", () => {
    expect(normalizeMxPhone("524491112233")).toBe("524491112233");
    expect(normalizeMxPhone("5214491112233")).toBe("5214491112233");
  });

  it("inutilizable → null (corto, vacío, null, otro país largo)", () => {
    expect(normalizeMxPhone("12345")).toBeNull();
    expect(normalizeMxPhone("")).toBeNull();
    expect(normalizeMxPhone(null)).toBeNull();
    expect(normalizeMxPhone("4400123456789012")).toBeNull();
  });
});

describe("buildWaMeUrl", () => {
  it("con teléfono: wa.me/<digits>?text=<encoded>", () => {
    const url = buildWaMeUrl("449 111 2233", "Hola & adiós ¿qué tal?");
    expect(url).toBe(
      `https://wa.me/524491112233?text=${encodeURIComponent("Hola & adiós ¿qué tal?")}`,
    );
    // El & va encodeado — sin esto wa.me corta el mensaje.
    expect(url).not.toContain("&text");
    expect(url).toContain("%26");
  });

  it("sin teléfono utilizable: selector de contactos wa.me/?text=", () => {
    expect(buildWaMeUrl(null, "hola")).toBe("https://wa.me/?text=hola");
    expect(buildWaMeUrl("123", "hola")).toBe("https://wa.me/?text=hola");
  });

  it("saltos de línea y acentos sobreviven el encoding", () => {
    const url = buildWaMeUrl(null, "línea 1\nlínea 2 ¿ó?");
    expect(url).toContain("%0A");
    expect(decodeURIComponent(url.split("text=")[1])).toBe(
      "línea 1\nlínea 2 ¿ó?",
    );
  });
});

describe("mensajes", () => {
  it("cotización: incluye cliente, folio, negocio, total y vigencia", () => {
    const msg = buildQuoteWhatsappMessage({
      businessName: "Imprenta Aurora",
      clientName: "Café Aurora",
      folio: "COT-1002",
      total: 1067.2,
      validUntil: "2026-07-01T12:00:00.000Z",
    });
    expect(msg).toContain("Café Aurora");
    expect(msg).toContain("COT-1002");
    expect(msg).toContain("Imprenta Aurora");
    expect(msg).toContain("$1,067.20");
    expect(msg).toContain("Vigente hasta el");
  });

  it("cotización sin vigencia: omite la línea de vigencia", () => {
    const msg = buildQuoteWhatsappMessage({
      businessName: "Imprenta Aurora",
      clientName: "Café Aurora",
      folio: "COT-1002",
      total: 100,
      validUntil: null,
    });
    expect(msg).not.toContain("Vigente hasta");
  });

  it("comprobante de orden: incluye cliente, folio y total; muestra saldo si hay", () => {
    const conSaldo = buildOrderReceiptWhatsappMessage({
      clientName: "Café Aurora",
      folio: "ORD-1011",
      total: 1067.2,
      balance: 533.6,
    });
    expect(conSaldo).toContain("Café Aurora");
    expect(conSaldo).toContain("ORD-1011");
    expect(conSaldo).toContain("$1,067.20");
    expect(conSaldo).toContain("Saldo pendiente: $533.60");

    const liquidado = buildOrderReceiptWhatsappMessage({
      clientName: "Café Aurora",
      folio: "ORD-1011",
      total: 1067.2,
      balance: 0,
    });
    expect(liquidado).not.toContain("Saldo pendiente");
  });

  it("recordatorio de cobro: incluye cliente, negocio, saldo y el folio único", () => {
    const msg = buildCollectionReminderWhatsappMessage({
      businessName: "Imprenta Aurora",
      clientName: "Café Aurora",
      totalBalance: 533.6,
      folios: ["ORD-1011"],
    });
    expect(msg).toContain("Café Aurora");
    expect(msg).toContain("Imprenta Aurora");
    expect(msg).toContain("saldo pendiente");
    expect(msg).toContain("$533.60");
    expect(msg).toContain("Corresponde al pedido ORD-1011.");
  });

  it("recordatorio de cobro: varios folios se listan; sin folios omite el detalle", () => {
    const varios = buildCollectionReminderWhatsappMessage({
      businessName: "Imprenta Aurora",
      clientName: "Café Aurora",
      totalBalance: 700,
      folios: ["ORD-1002", "ORD-1013"],
    });
    expect(varios).toContain("Pedidos con saldo: ORD-1002, ORD-1013.");

    const sinFolios = buildCollectionReminderWhatsappMessage({
      businessName: "Imprenta Aurora",
      clientName: "Café Aurora",
      totalBalance: 700,
    });
    expect(sinFolios).not.toContain("Corresponde al pedido");
    expect(sinFolios).not.toContain("Pedidos con saldo");
    expect(sinFolios).toContain("$700.00");
  });

  it("aprobación: incluye versión, URL pública y vencimiento", () => {
    const msg = buildProofWhatsappMessage({
      businessName: "Imprenta Aurora",
      clientName: "Café Aurora",
      version: 2,
      url: "https://pos.ejemplo.mx/approve/abc123",
      expiresAt: "2026-06-18T12:00:00.000Z",
    });
    expect(msg).toContain("versión 2");
    expect(msg).toContain("https://pos.ejemplo.mx/approve/abc123");
    expect(msg).toContain("vence el");
  });
});
