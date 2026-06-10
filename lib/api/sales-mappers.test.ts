import { describe, expect, it } from "vitest";

import {
  MANUAL_ORDER_TRANSITIONS,
  ORDER_STATUS_ES,
  PAYMENT_METHOD_ES,
  QUOTE_CHANNEL_ES,
  QUOTE_STATUS_ES,
  SALES_AUDIT_ACTION_ES,
  paymentLabel,
  quoteDisplayStatus,
} from "./sales-mappers";
import type { ApiOrderStatus, ApiQuoteStatus } from "./types";

describe("ORDER_STATUS_ES", () => {
  it("mapea los 8 estados del contrato a etiquetas en español", () => {
    expect(ORDER_STATUS_ES).toEqual({
      pending: "Pendiente",
      in_design: "En diseño",
      client_approval: "Aprobación cliente",
      production: "Producción",
      with_supplier: "Con proveedor",
      ready_for_delivery: "Listo para entrega",
      delivered: "Entregado",
      cancelled: "Cancelada",
    });
  });
});

describe("paymentLabel", () => {
  it("sin pagos → Pendiente", () => {
    expect(paymentLabel({ paymentMethods: [] })).toBe("Pendiente");
  });

  it("un método → su etiqueta", () => {
    expect(paymentLabel({ paymentMethods: ["cash"] })).toBe("Efectivo");
    expect(paymentLabel({ paymentMethods: ["terminal"] })).toBe("Terminal");
  });

  it("más de un método → Mixto (nunca almacenado, siempre derivado)", () => {
    expect(paymentLabel({ paymentMethods: ["cash", "terminal"] })).toBe(
      "Mixto",
    );
  });
});

describe("MANUAL_ORDER_TRANSITIONS", () => {
  it("excluye pending (estado inicial) y cancelled (vía /cancel)", () => {
    expect(MANUAL_ORDER_TRANSITIONS).not.toContain("pending");
    expect(MANUAL_ORDER_TRANSITIONS).not.toContain("cancelled");
  });

  it("todas las transiciones tienen etiqueta ES", () => {
    for (const status of MANUAL_ORDER_TRANSITIONS) {
      expect(ORDER_STATUS_ES[status]).toBeTruthy();
    }
  });
});

describe("quoteDisplayStatus", () => {
  it("Vencida es DERIVADA: gana sobre el status real", () => {
    expect(quoteDisplayStatus({ status: "sent", isExpired: true })).toBe(
      "Vencida",
    );
    expect(quoteDisplayStatus({ status: "approved", isExpired: true })).toBe(
      "Vencida",
    );
  });

  it("sin vencer → etiqueta del status real", () => {
    const cases: Array<[ApiQuoteStatus, string]> = [
      ["draft", "Borrador"],
      ["sent", "Enviada"],
      ["approved", "Aprobada"],
      ["rejected", "Rechazada"],
      ["converted", "Convertida"],
    ];
    for (const [status, label] of cases) {
      expect(quoteDisplayStatus({ status, isExpired: false })).toBe(label);
    }
  });
});

describe("mapas exhaustivos y fallbacks", () => {
  it("QUOTE_STATUS_ES y QUOTE_CHANNEL_ES cubren sus uniones", () => {
    expect(Object.keys(QUOTE_STATUS_ES)).toHaveLength(5);
    expect(QUOTE_CHANNEL_ES.whatsapp).toBe("WhatsApp");
    expect(QUOTE_CHANNEL_ES.in_person).toBe("Presencial");
  });

  it("PAYMENT_METHOD_ES cubre cash y terminal", () => {
    expect(PAYMENT_METHOD_ES).toEqual({
      cash: "Efectivo",
      terminal: "Terminal",
    });
  });

  it("acciones de auditoría: el patrón de uso es lookup con fallback", () => {
    const known = "sales.order.placed";
    const unknown = "sales.order.something_new";
    expect(SALES_AUDIT_ACTION_ES[known] ?? known).toBe("Venta creada");
    expect(SALES_AUDIT_ACTION_ES[unknown] ?? unknown).toBe(unknown);
  });

  it("las claves de ORDER_STATUS_ES coinciden con el union del contrato", () => {
    const statuses: ApiOrderStatus[] = [
      "pending",
      "in_design",
      "client_approval",
      "production",
      "with_supplier",
      "ready_for_delivery",
      "delivered",
      "cancelled",
    ];
    expect(Object.keys(ORDER_STATUS_ES).sort()).toEqual([...statuses].sort());
  });
});
