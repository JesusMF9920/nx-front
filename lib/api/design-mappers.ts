import type { ApiApprovalChannel, ApiDesignProofStatus } from "./types";

/**
 * Mapeo EN (API) → ES (UI). `Record` exhaustivo a propósito: si el backend
 * agrega un status nuevo, el build truena aquí hasta mapearlo.
 */
export const DESIGN_PROOF_STATUS_ES: Record<ApiDesignProofStatus, string> = {
  draft: "Borrador",
  awaiting_client: "Esperando cliente",
  changes_requested: "Cambios solicitados",
  approved: "Aprobado",
};

export const APPROVAL_CHANNEL_ES: Record<ApiApprovalChannel, string> = {
  link: "Link",
  whatsapp: "WhatsApp",
  email: "Correo",
};
