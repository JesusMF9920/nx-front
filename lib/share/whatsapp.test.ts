import { describe, expect, it } from "vitest";

import {
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

  it("saltos de línea y emoji sobreviven el encoding", () => {
    const url = buildWaMeUrl(null, "línea 1\nlínea 2 👋");
    expect(url).toContain("%0A");
    expect(decodeURIComponent(url.split("text=")[1])).toBe(
      "línea 1\nlínea 2 👋",
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
