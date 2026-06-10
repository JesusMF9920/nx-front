import { DESIGN_PROOF_STATUS_ES } from "@/lib/api/design-mappers";
import type { ApiDesignProofStatus } from "@/lib/api/types";

export function ApprovalPill({ s }: { s: ApiDesignProofStatus }) {
  if (s === "approved") return <span className="pill pill--ok">Aprobado</span>;
  if (s === "changes_requested")
    return <span className="pill pill--warn">Cambios</span>;
  if (s === "awaiting_client")
    return <span className="pill pill--info">Esperando</span>;
  return <span className="pill">{DESIGN_PROOF_STATUS_ES[s]}</span>;
}
