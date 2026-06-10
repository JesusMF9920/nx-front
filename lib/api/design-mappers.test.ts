import { describe, expect, it } from "vitest";

import { APPROVAL_CHANNEL_ES, DESIGN_PROOF_STATUS_ES } from "./design-mappers";

describe("DESIGN_PROOF_STATUS_ES", () => {
  it("mapea los 4 estados de ficha de diseño", () => {
    expect(DESIGN_PROOF_STATUS_ES).toEqual({
      draft: "Borrador",
      awaiting_client: "Esperando cliente",
      changes_requested: "Cambios solicitados",
      approved: "Aprobado",
    });
  });
});

describe("APPROVAL_CHANNEL_ES", () => {
  it("mapea los canales de envío de la prueba", () => {
    expect(APPROVAL_CHANNEL_ES).toEqual({
      link: "Link",
      whatsapp: "WhatsApp",
      email: "Correo",
    });
  });
});
