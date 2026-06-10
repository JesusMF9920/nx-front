import { describe, expect, it } from "vitest";

import {
  PURCHASE_AUDIT_ACTION_ES,
  PURCHASE_STATUS_ES,
} from "./purchases-mappers";

describe("PURCHASE_STATUS_ES", () => {
  it("mapea los 4 estados (sin parciales: la recepción es total)", () => {
    expect(PURCHASE_STATUS_ES).toEqual({
      draft: "Borrador",
      sent: "Enviada",
      received: "Recibida",
      cancelled: "Cancelada",
    });
  });
});

describe("PURCHASE_AUDIT_ACTION_ES", () => {
  it("acciones del timeline con fallback a la acción cruda", () => {
    expect(PURCHASE_AUDIT_ACTION_ES["inventory.purchase_order.received"]).toBe(
      "Mercancía recibida",
    );
    const unknown = "inventory.purchase_order.future_action";
    expect(PURCHASE_AUDIT_ACTION_ES[unknown] ?? unknown).toBe(unknown);
  });
});
