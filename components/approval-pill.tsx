import type { ApprovalStatus } from "@/lib/types";

export function ApprovalPill({ s }: { s: ApprovalStatus }) {
  if (s === "Aprobado") return <span className="pill pill--ok">Aprobado</span>;
  if (s === "Cambios solicitados") return <span className="pill pill--warn">Cambios</span>;
  return <span className="pill pill--info">Esperando</span>;
}
